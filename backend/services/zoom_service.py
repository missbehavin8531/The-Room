import httpx
import hmac
import hashlib
import logging
import uuid
import aiofiles
from datetime import datetime, timezone, timedelta
from pathlib import Path

from database import db, UPLOAD_DIR

logger = logging.getLogger(__name__)

VIDEO_DIR = UPLOAD_DIR / 'videos'
VIDEO_DIR.mkdir(exist_ok=True)

ZOOM_AUTH_URL = "https://zoom.us/oauth/authorize"
ZOOM_TOKEN_URL = "https://zoom.us/oauth/token"
ZOOM_API_BASE = "https://api.zoom.us/v2"


class ZoomService:
    """Handles Zoom OAuth, webhooks, and recording downloads."""

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str, webhook_secret: str = ""):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.webhook_secret = webhook_secret

    def get_authorization_url(self, state: str) -> str:
        params = (
            f"response_type=code"
            f"&client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&state={state}"
        )
        return f"{ZOOM_AUTH_URL}?{params}"

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                ZOOM_TOKEN_URL,
                auth=(self.client_id, self.client_secret),
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                },
                timeout=15.0,
            )
            resp.raise_for_status()
            return resp.json()

    async def refresh_token(self, refresh_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                ZOOM_TOKEN_URL,
                auth=(self.client_id, self.client_secret),
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                timeout=15.0,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_valid_access_token(self, connection: dict) -> str | None:
        """Return a valid access token, refreshing if needed."""
        expires_at = connection.get("expires_at", "")
        if isinstance(expires_at, str):
            try:
                expires_at = datetime.fromisoformat(expires_at)
            except Exception:
                expires_at = datetime.now(timezone.utc)

        if datetime.now(timezone.utc) < expires_at - timedelta(minutes=2):
            return connection["access_token"]

        # Refresh
        try:
            data = await self.refresh_token(connection["refresh_token"])
            new_expires = datetime.now(timezone.utc) + timedelta(seconds=data["expires_in"])
            await db.zoom_connections.update_one(
                {"user_id": connection["user_id"]},
                {"$set": {
                    "access_token": data["access_token"],
                    "refresh_token": data.get("refresh_token", connection["refresh_token"]),
                    "expires_at": new_expires.isoformat(),
                }},
            )
            return data["access_token"]
        except Exception as e:
            logger.error(f"Zoom token refresh failed: {e}")
            return None

    def validate_webhook(self, body: bytes, signature: str, timestamp: str) -> bool:
        if not self.webhook_secret:
            return False
        message = f"v0:{timestamp}:{body.decode()}"
        expected = "v0=" + hmac.new(
            self.webhook_secret.encode(), message.encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    async def download_recording(self, download_url: str, access_token: str, title: str) -> dict | None:
        """Download an MP4 recording and save to disk. Returns recording metadata."""
        recording_id = str(uuid.uuid4())
        filename = f"{recording_id}.mp4"
        file_path = VIDEO_DIR / filename

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "GET",
                    download_url,
                    headers={"Authorization": f"Bearer {access_token}"},
                    follow_redirects=True,
                ) as resp:
                    resp.raise_for_status()
                    total = 0
                    async with aiofiles.open(file_path, "wb") as f:
                        async for chunk in resp.aiter_bytes(1024 * 1024):
                            await f.write(chunk)
                            total += len(chunk)

            logger.info(f"Downloaded Zoom recording: {filename} ({total} bytes)")
            return {
                "id": recording_id,
                "filename": filename,
                "file_size": total,
                "original_filename": f"{title}.mp4",
            }
        except Exception as e:
            logger.error(f"Zoom recording download failed: {e}")
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            return None
