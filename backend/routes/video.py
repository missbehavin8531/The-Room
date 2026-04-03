from fastapi import APIRouter, HTTPException, Depends, Query
import uuid
import logging
from datetime import datetime, timezone

from database import db, DAILY_DOMAIN
from models import (
    VideoRoomResponse, VideoRoomStatus,
    RecordingResponse, LessonRecordingsResponse, RecordingControlResponse
)
from auth import require_approved, require_teacher_or_admin
from services.daily_service import daily_service

router = APIRouter(prefix="/api")


@router.post("/lessons/{lesson_id}/video/join", response_model=VideoRoomResponse)
async def join_lesson_video_room(lesson_id: str, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        room_data = await daily_service.get_or_create_room(room_name)
        is_owner = user['role'] in ['teacher', 'admin']
        meeting_token = await daily_service.create_meeting_token(
            room_name=room_name,
            user_id=user['id'],
            user_name=user['name'],
            is_owner=is_owner
        )
        
        existing = await db.attendance.find_one({
            'lesson_id': lesson_id,
            'user_id': user['id'],
            'action': 'joined_video'
        })
        if not existing:
            await db.attendance.insert_one({
                'id': str(uuid.uuid4()),
                'user_id': user['id'],
                'user_name': user['name'],
                'lesson_id': lesson_id,
                'action': 'joined_video',
                'created_at': datetime.now(timezone.utc).isoformat()
            })
        
        return VideoRoomResponse(
            room_name=room_name,
            room_url=room_data.get('url', f"https://{DAILY_DOMAIN}/{room_name}"),
            meeting_token=meeting_token,
            lesson_id=lesson_id
        )
    except Exception as e:
        logging.error(f"Failed to join video room: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to join video room: {str(e)}")

@router.get("/lessons/{lesson_id}/video/status", response_model=VideoRoomStatus)
async def get_lesson_video_status(lesson_id: str, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        status = await daily_service.get_room_status(room_name)
        if status['exists']:
            return VideoRoomStatus(
                room_exists=True,
                room_name=room_name,
                room_url=status['room'].get('url'),
                participants_count=status['participants']
            )
        return VideoRoomStatus(room_exists=False)
    except Exception as e:
        logging.error(f"Failed to get room status: {e}")
        return VideoRoomStatus(room_exists=False)

@router.get("/lessons/{lesson_id}/recordings", response_model=LessonRecordingsResponse)
async def get_lesson_recordings(lesson_id: str, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        raw_recordings = await daily_service.get_recordings(room_name)
        recordings = []
        
        for rec in raw_recordings:
            access_link = await daily_service.get_recording_access_link(rec.get('id', ''))
            download_url = None
            if access_link:
                download_url = access_link.get('download_link') or access_link.get('link')
            
            recordings.append(RecordingResponse(
                id=rec.get('id', ''),
                room_name=rec.get('room_name', room_name),
                start_ts=rec.get('start_ts'),
                duration=rec.get('duration'),
                max_participants=rec.get('max_participants'),
                download_url=download_url,
                status=rec.get('status', 'unknown')
            ))
        
        return LessonRecordingsResponse(
            lesson_id=lesson_id,
            recordings=recordings,
            has_recordings=len(recordings) > 0
        )
    except Exception as e:
        logging.error(f"Failed to fetch recordings: {e}")
        return LessonRecordingsResponse(lesson_id=lesson_id, recordings=[], has_recordings=False)

@router.post("/lessons/{lesson_id}/recording/start", response_model=RecordingControlResponse)
async def start_lesson_recording(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        active = await daily_service.get_active_recording(room_name)
        if active.get('is_recording'):
            return RecordingControlResponse(
                success=False,
                message="Recording is already in progress",
                recording_id=active.get('recording_id'),
                is_recording=True
            )
        
        result = await daily_service.start_recording(room_name)
        
        if result.get('error'):
            return RecordingControlResponse(
                success=False,
                message=f"Failed to start recording: {result.get('error')}",
                is_recording=False
            )
        
        return RecordingControlResponse(
            success=True,
            message="Recording started successfully",
            recording_id=result.get('id'),
            is_recording=True
        )
    except Exception as e:
        logging.error(f"Failed to start recording: {e}")
        return RecordingControlResponse(success=False, message=f"Error: {str(e)}", is_recording=False)

@router.post("/lessons/{lesson_id}/recording/stop", response_model=RecordingControlResponse)
async def stop_lesson_recording(lesson_id: str, recording_id: str = Query(...), user: dict = Depends(require_teacher_or_admin)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        result = await daily_service.stop_recording(room_name, recording_id)
        
        if result.get('error'):
            return RecordingControlResponse(
                success=False,
                message=f"Failed to stop recording: {result.get('error')}",
                is_recording=True
            )
        
        return RecordingControlResponse(
            success=True,
            message="Recording stopped successfully",
            recording_id=recording_id,
            is_recording=False
        )
    except Exception as e:
        logging.error(f"Failed to stop recording: {e}")
        return RecordingControlResponse(success=False, message=f"Error: {str(e)}", is_recording=True)

@router.get("/lessons/{lesson_id}/recording/status")
async def get_lesson_recording_status(lesson_id: str, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        active = await daily_service.get_active_recording(room_name)
        return {
            "lesson_id": lesson_id,
            "is_recording": active.get('is_recording', False),
            "recording_id": active.get('recording_id')
        }
    except Exception as e:
        logging.error(f"Failed to get recording status: {e}")
        return {"lesson_id": lesson_id, "is_recording": False, "recording_id": None}
