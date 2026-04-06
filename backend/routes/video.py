from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
import uuid
import os
import logging
from datetime import datetime, timezone

from database import db, DAILY_DOMAIN, UPLOAD_DIR, MAX_VIDEO_UPLOAD_SIZE
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


# ============== UPLOADED / LINKED RECORDINGS ==============

VIDEO_DIR = UPLOAD_DIR / 'videos'
VIDEO_DIR.mkdir(exist_ok=True)

ALLOWED_VIDEO_TYPES = [
    'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
    'video/x-matroska', 'video/mpeg', 'application/octet-stream'
]
ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.mpeg', '.mpg']


@router.post("/lessons/{lesson_id}/recordings/upload")
async def upload_recording(
    lesson_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_teacher_or_admin)
):
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Accepted: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
        )

    # Read in chunks to avoid memory spikes
    recording_id = str(uuid.uuid4())
    stored_filename = f"{recording_id}{ext}"
    file_path = VIDEO_DIR / stored_filename

    total_size = 0
    with open(file_path, 'wb') as f:
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_VIDEO_UPLOAD_SIZE:
                f.close()
                file_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size is {MAX_VIDEO_UPLOAD_SIZE // (1024*1024)}MB"
                )
            f.write(chunk)

    recording = {
        'id': recording_id,
        'lesson_id': lesson_id,
        'type': 'upload',
        'title': file.filename,
        'filename': stored_filename,
        'original_filename': file.filename,
        'file_size': total_size,
        'uploaded_by': user['id'],
        'uploaded_by_name': user['name'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.uploaded_recordings.insert_one(recording)

    return {
        'id': recording_id,
        'lesson_id': lesson_id,
        'type': 'upload',
        'title': file.filename,
        'original_filename': file.filename,
        'file_size': total_size,
        'stream_url': f"/api/recordings/{recording_id}/stream",
        'created_at': recording['created_at']
    }


@router.post("/lessons/{lesson_id}/recordings/link")
async def add_recording_link(
    lesson_id: str,
    url: str = Query(...),
    title: str = Query("Zoom Recording"),
    user: dict = Depends(require_teacher_or_admin)
):
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if not url.startswith('http'):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    recording_id = str(uuid.uuid4())
    recording = {
        'id': recording_id,
        'lesson_id': lesson_id,
        'type': 'link',
        'title': title,
        'url': url,
        'uploaded_by': user['id'],
        'uploaded_by_name': user['name'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.uploaded_recordings.insert_one(recording)

    return {
        'id': recording_id,
        'lesson_id': lesson_id,
        'type': 'link',
        'title': title,
        'url': url,
        'created_at': recording['created_at']
    }


@router.get("/lessons/{lesson_id}/recordings/uploaded")
async def get_uploaded_recordings(lesson_id: str, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    recordings = await db.uploaded_recordings.find(
        {'lesson_id': lesson_id}, {'_id': 0}
    ).sort('created_at', 1).to_list(50)

    result = []
    for rec in recordings:
        item = {
            'id': rec['id'],
            'lesson_id': rec['lesson_id'],
            'type': rec['type'],
            'title': rec.get('title', ''),
            'created_at': rec['created_at'],
            'uploaded_by_name': rec.get('uploaded_by_name', '')
        }
        if rec['type'] == 'upload':
            item['original_filename'] = rec.get('original_filename', '')
            item['file_size'] = rec.get('file_size', 0)
            item['stream_url'] = f"/api/recordings/{rec['id']}/stream"
        elif rec['type'] == 'link':
            item['url'] = rec.get('url', '')
        result.append(item)

    return result


@router.get("/recordings/{recording_id}/stream")
async def stream_recording(recording_id: str, token: str = Query(None)):
    # Auth via query param for <video src> tags
    if token:
        from jose import jwt as jose_jwt
        try:
            jose_jwt.decode(token, os.environ.get('JWT_SECRET', ''), algorithms=['HS256'])
        except Exception:
            raise HTTPException(status_code=403, detail="Invalid token")
    else:
        raise HTTPException(status_code=403, detail="Authentication required")

    recording = await db.uploaded_recordings.find_one(
        {'id': recording_id, 'type': 'upload'}, {'_id': 0}
    )
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    file_path = VIDEO_DIR / recording['filename']
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        file_path,
        media_type='video/mp4',
        filename=recording.get('original_filename', 'recording.mp4')
    )


@router.delete("/recordings/uploaded/{recording_id}")
async def delete_uploaded_recording(recording_id: str, user: dict = Depends(require_teacher_or_admin)):
    recording = await db.uploaded_recordings.find_one({'id': recording_id}, {'_id': 0})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Delete file if it was an upload
    if recording['type'] == 'upload' and recording.get('filename'):
        file_path = VIDEO_DIR / recording['filename']
        if file_path.exists():
            file_path.unlink()

    await db.uploaded_recordings.delete_one({'id': recording_id})
    return {'message': 'Recording deleted'}
