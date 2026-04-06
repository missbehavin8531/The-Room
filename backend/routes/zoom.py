import os
import json
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import RedirectResponse

from database import db
from auth import require_teacher_or_admin, require_approved
from services.zoom_service import ZoomService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/zoom", tags=["zoom"])

ZOOM_CLIENT_ID = os.environ.get("ZOOM_CLIENT_ID", "")
ZOOM_CLIENT_SECRET = os.environ.get("ZOOM_CLIENT_SECRET", "")
ZOOM_WEBHOOK_SECRET = os.environ.get("ZOOM_WEBHOOK_SECRET_TOKEN", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")


def _redirect_uri(request: Request = None):
    """Build the OAuth redirect URI dynamically from the request host."""
    if request:
        # Use the actual request host for correct domain across environments
        scheme = request.headers.get("x-forwarded-proto", "https")
        host = request.headers.get("host", "")
        if host:
            return f"{scheme}://{host}/api/zoom/callback"
    # Fallback to env vars
    base = FRONTEND_URL.rstrip("/") if FRONTEND_URL else ""
    if not base:
        base = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
    return f"{base}/api/zoom/callback"


def _zoom_service(request: Request = None):
    return ZoomService(ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, _redirect_uri(request), ZOOM_WEBHOOK_SECRET)


def _zoom_configured():
    return bool(ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET)


# ── Status ────────────────────────────────────────────────────
@router.get("/status")
async def zoom_status(user: dict = Depends(require_approved)):
    """Check if the current user has connected their Zoom account."""
    if not _zoom_configured():
        return {"configured": False, "connected": False}

    conn = await db.zoom_connections.find_one({"user_id": user["id"]}, {"_id": 0})
    if conn:
        return {
            "configured": True,
            "connected": True,
            "zoom_email": conn.get("zoom_email", ""),
            "connected_at": conn.get("connected_at", ""),
        }
    return {"configured": True, "connected": False}


# ── Start OAuth ──────────────────────────────────────────────
@router.get("/connect")
async def zoom_connect(request: Request, user: dict = Depends(require_teacher_or_admin)):
    """Redirect teacher to Zoom OAuth authorization page."""
    if not _zoom_configured():
        raise HTTPException(status_code=503, detail="Zoom integration is not configured yet. Ask the admin to add Zoom credentials.")

    svc = _zoom_service(request)
    state = secrets.token_urlsafe(32)

    await db.zoom_oauth_states.insert_one({
        "state": state,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    url = svc.get_authorization_url(state)
    return {"authorization_url": url}


# ── OAuth Callback ───────────────────────────────────────────
@router.get("/callback")
async def zoom_callback(request: Request, code: str = Query(...), state: str = Query(...)):
    """Handle Zoom OAuth callback — exchange code for tokens."""
    state_doc = await db.zoom_oauth_states.find_one({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    user_id = state_doc["user_id"]
    await db.zoom_oauth_states.delete_one({"state": state})

    svc = _zoom_service(request)
    try:
        token_data = await svc.exchange_code(code)
    except Exception as e:
        logger.error(f"Zoom OAuth code exchange failed: {e}")
        # Redirect to settings with error
        base = FRONTEND_URL or os.environ.get("REACT_APP_BACKEND_URL", "")
        return RedirectResponse(url=f"{base}/settings?zoom=error")

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))

    # Get Zoom user profile to store email
    zoom_email = ""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.zoom.us/v2/users/me",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
                timeout=10.0,
            )
            if resp.status_code == 200:
                profile = resp.json()
                zoom_email = profile.get("email", "")
    except Exception:
        pass

    await db.zoom_connections.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "zoom_user_id": token_data.get("user_id", ""),
            "zoom_email": zoom_email,
            "access_token": token_data["access_token"],
            "refresh_token": token_data["refresh_token"],
            "expires_at": expires_at.isoformat(),
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    base = FRONTEND_URL or os.environ.get("REACT_APP_BACKEND_URL", "")
    return RedirectResponse(url=f"{base}/settings?zoom=connected")


# ── Disconnect ───────────────────────────────────────────────
@router.post("/disconnect")
async def zoom_disconnect(user: dict = Depends(require_teacher_or_admin)):
    await db.zoom_connections.delete_one({"user_id": user["id"]})
    return {"message": "Zoom account disconnected"}


# ── Webhook (recording.completed) ────────────────────────────
@router.post("/webhook")
async def zoom_webhook(request: Request):
    """
    Receive Zoom webhook events.
    On recording.completed → auto-import MP4 into the teacher's latest lesson.
    """
    body = await request.body()

    # Zoom URL Validation challenge
    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Handle Zoom's endpoint URL validation (CRC challenge)
    if payload.get("event") == "endpoint.url_validation":
        plain_token = payload.get("payload", {}).get("plainToken", "")
        hash_obj = __import__("hmac").new(
            ZOOM_WEBHOOK_SECRET.encode(), plain_token.encode(), __import__("hashlib").sha256
        )
        return {
            "plainToken": plain_token,
            "encryptedToken": hash_obj.hexdigest(),
        }

    # Validate signature
    sig = request.headers.get("x-zm-signature", "")
    ts = request.headers.get("x-zm-request-timestamp", "")
    if ZOOM_WEBHOOK_SECRET and sig and ts:
        svc = _zoom_service()
        if not svc.validate_webhook(body, sig, ts):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event_type = payload.get("event")
    if event_type != "recording.completed":
        return {"status": "ignored"}

    obj = payload.get("payload", {}).get("object", {})
    host_id = obj.get("host_id", "")
    topic = obj.get("topic", "Zoom Recording")
    recording_files = obj.get("recording_files", [])

    # Find connected teacher by Zoom host_id
    conn = await db.zoom_connections.find_one({"zoom_user_id": host_id}, {"_id": 0})
    if not conn:
        logger.warning(f"No connected teacher for Zoom host_id={host_id}")
        return {"status": "no_connected_teacher"}

    teacher_user_id = conn["user_id"]

    # Get valid access token
    svc = _zoom_service()
    access_token = await svc.get_valid_access_token(conn)
    if not access_token:
        logger.error(f"Could not get valid Zoom token for teacher {teacher_user_id}")
        return {"status": "token_error"}

    # Find the teacher's most recent lesson
    teacher = await db.users.find_one({"id": teacher_user_id}, {"_id": 0})
    if not teacher:
        return {"status": "teacher_not_found"}

    group_ids = teacher.get("group_ids", [])
    group_id = group_ids[0] if group_ids else teacher.get("group_id")
    if not group_id:
        return {"status": "no_group"}

    # Get courses for this group, then find latest lesson
    courses = await db.courses.find({"group_id": group_id}, {"_id": 0}).to_list(100)
    course_ids = [c["id"] for c in courses]
    if not course_ids:
        return {"status": "no_courses"}

    latest_lesson = await db.lessons.find_one(
        {"course_id": {"$in": course_ids}},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if not latest_lesson:
        return {"status": "no_lessons"}

    lesson_id = latest_lesson["id"]

    # Find MP4 recording (speaker view / shared_screen_with_speaker_view)
    mp4_file = None
    for rf in recording_files:
        ft = rf.get("file_type", "").upper()
        if ft == "MP4":
            # Prefer shared_screen_with_speaker_view, else active_speaker
            rt = rf.get("recording_type", "")
            if mp4_file is None or rt in ("shared_screen_with_speaker_view", "active_speaker"):
                mp4_file = rf

    if not mp4_file:
        logger.info("No MP4 file in Zoom recording event")
        return {"status": "no_mp4"}

    download_url = mp4_file.get("download_url", "")
    if not download_url:
        return {"status": "no_download_url"}

    # Download the recording
    result = await svc.download_recording(download_url, access_token, topic)
    if not result:
        return {"status": "download_failed"}

    # Save as uploaded_recording
    recording_doc = {
        "id": result["id"],
        "lesson_id": lesson_id,
        "type": "upload",
        "title": f"{topic} (Zoom Auto-Import)",
        "filename": result["filename"],
        "original_filename": result["original_filename"],
        "file_size": result["file_size"],
        "uploaded_by": teacher_user_id,
        "uploaded_by_name": teacher.get("name", "Zoom"),
        "source": "zoom_auto",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.uploaded_recordings.insert_one(recording_doc)

    logger.info(f"Auto-imported Zoom recording '{topic}' into lesson {lesson_id}")
    return {"status": "imported", "lesson_id": lesson_id, "recording_id": result["id"]}
