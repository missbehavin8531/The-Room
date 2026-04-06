import httpx
import time
import logging
from datetime import datetime, timezone, timedelta

from database import DAILY_API_KEY, DAILY_DOMAIN


class DailyService:
    BASE_URL = "https://api.daily.co/v1"
    
    def __init__(self):
        self.api_key = DAILY_API_KEY
        self.domain = DAILY_DOMAIN
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def get_or_create_room(self, room_name: str) -> dict:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/rooms/{room_name}",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json()
            except Exception:
                pass
            
            exp_time = int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())
            payload = {
                "name": room_name,
                "privacy": "public",
                "properties": {
                    "exp": exp_time,
                    "enable_chat": True,
                    "enable_screenshare": True,
                    "start_video_off": False,
                    "start_audio_off": False,
                    "enable_knocking": False,
                    "max_participants": 100,
                    "enable_recording": "cloud"
                }
            }
            
            try:
                response = await client.post(
                    f"{self.BASE_URL}/rooms",
                    json=payload,
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logging.error(f"Failed to create room: {e}")
                raise Exception(f"Failed to create video room: {str(e)}")
    
    async def get_room_status(self, room_name: str) -> dict:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/rooms/{room_name}",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 200:
                    room_data = response.json()
                    presence_response = await client.get(
                        f"{self.BASE_URL}/rooms/{room_name}/presence",
                        headers=self.headers,
                        timeout=10.0
                    )
                    participants = 0
                    if presence_response.status_code == 200:
                        presence_data = presence_response.json()
                        participants = len(presence_data.get('data', []))
                    return {"exists": True, "room": room_data, "participants": participants}
            except Exception:
                pass
            return {"exists": False, "room": None, "participants": 0}
    
    async def get_recordings(self, room_name: str) -> list:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/recordings",
                    params={"room_name": room_name, "limit": 10},
                    headers=self.headers,
                    timeout=15.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get('data', [])
            except Exception as e:
                logging.error(f"Failed to fetch recordings: {e}")
            return []
    
    async def get_recording_access_link(self, recording_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/recordings/{recording_id}/access-link",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json()
            except Exception as e:
                logging.error(f"Failed to get recording access link: {e}")
            return None
    
    async def start_recording(self, room_name: str) -> dict:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.BASE_URL}/rooms/{room_name}/recordings/start",
                    json={"type": "cloud"},
                    headers=self.headers,
                    timeout=15.0
                )
                if response.status_code in [200, 201]:
                    return response.json()
                
                error_msg = response.text
                # If room has an active stream/recording, stop it and retry
                if "active stream" in error_msg.lower() or "already" in error_msg.lower():
                    logging.warning(f"Active stream detected on {room_name}, stopping and retrying...")
                    try:
                        await client.post(
                            f"{self.BASE_URL}/rooms/{room_name}/recordings/stop",
                            headers=self.headers,
                            timeout=10.0
                        )
                    except Exception:
                        pass
                    # Brief pause then retry
                    import asyncio
                    await asyncio.sleep(1)
                    retry = await client.post(
                        f"{self.BASE_URL}/rooms/{room_name}/recordings/start",
                        json={"type": "cloud"},
                        headers=self.headers,
                        timeout=15.0
                    )
                    if retry.status_code in [200, 201]:
                        return retry.json()
                    error_msg = retry.text

                logging.error(f"Failed to start recording: {error_msg}")
                return {"error": error_msg, "status_code": response.status_code}
            except Exception as e:
                logging.error(f"Failed to start recording: {e}")
                return {"error": str(e)}
    
    async def stop_recording(self, room_name: str, recording_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.BASE_URL}/rooms/{room_name}/recordings/stop",
                    headers=self.headers,
                    timeout=15.0
                )
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    error_msg = response.text
                    logging.error(f"Failed to stop recording: {error_msg}")
                    return {"error": error_msg, "status_code": response.status_code}
            except Exception as e:
                logging.error(f"Failed to stop recording: {e}")
                return {"error": str(e)}
    
    async def get_active_recording(self, room_name: str) -> dict:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/rooms/{room_name}",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 200:
                    recordings = await self.get_recordings(room_name)
                    for rec in recordings:
                        if rec.get('status') == 'processing' or rec.get('status') == 'started':
                            return {"is_recording": True, "recording_id": rec.get('id')}
                    return {"is_recording": False, "recording_id": None}
            except Exception as e:
                logging.error(f"Failed to check active recording: {e}")
            return {"is_recording": False, "recording_id": None}
    
    async def create_meeting_token(self, room_name: str, user_id: str, user_name: str, is_owner: bool = False) -> str:
        """Create meeting token via Daily.co REST API"""
        async with httpx.AsyncClient() as client:
            try:
                payload = {
                    "properties": {
                        "room_name": room_name,
                        "user_name": user_name,
                        "user_id": user_id,
                        "is_owner": is_owner,
                        "enable_screenshare": True,
                        "start_video_off": False,
                        "start_audio_off": False,
                        "exp": int(time.time()) + 7200
                    }
                }
                response = await client.post(
                    f"{self.BASE_URL}/meeting-tokens",
                    json=payload,
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                return data.get("token", "")
            except Exception as e:
                logging.error(f"Failed to create meeting token via REST API: {e}")
                raise Exception(f"Failed to create meeting token: {str(e)}")


daily_service = DailyService()
