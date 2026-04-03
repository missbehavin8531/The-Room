from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from typing import List
import uuid
from datetime import datetime, timezone

from database import db
from models import UserResponse
from auth import require_admin, require_teacher_or_admin
from services.email_service import email_service

router = APIRouter(prefix="/api")


@router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_admin)):
    query = {}
    group_id = user.get('group_id')
    if group_id:
        query['group_id'] = group_id
    users = await db.users.find(query, {'_id': 0, 'password': 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@router.get("/users/pending", response_model=List[UserResponse])
async def get_pending_users(user: dict = Depends(require_admin)):
    query = {'is_approved': False}
    group_id = user.get('group_id')
    if group_id:
        query['group_id'] = group_id
    users = await db.users.find(query, {'_id': 0, 'password': 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@router.put("/users/{user_id}/approve")
async def approve_user(user_id: str, background_tasks: BackgroundTasks, user: dict = Depends(require_admin)):
    user_to_approve = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user_to_approve:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.users.update_one({'id': user_id}, {'$set': {'is_approved': True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or already approved")
    
    if user_to_approve.get('email'):
        background_tasks.add_task(
            email_service.send_welcome_email,
            user_to_approve['email'],
            user_to_approve['name']
        )
    
    return {'message': 'User approved'}

@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str = Query(...), user: dict = Depends(require_teacher_or_admin)):
    if role not in ['member', 'teacher', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one({'id': user_id}, {'$set': {'role': role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': f'User role updated to {role}'}

@router.put("/users/{user_id}/mute")
async def mute_user(user_id: str, muted: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.users.update_one({'id': user_id}, {'$set': {'is_muted': muted}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': f'User {"muted" if muted else "unmuted"}'}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.users.delete_one({'id': user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': 'User deleted'}

@router.get("/teachers", response_model=List[UserResponse])
async def get_teachers(user: dict = Depends(require_admin)):
    query = {'role': 'teacher', 'is_approved': True}
    group_id = user.get('group_id')
    if group_id:
        query['group_id'] = group_id
    teachers = await db.users.find(query, {'_id': 0, 'password': 0}).to_list(100)
    return [UserResponse(**t) for t in teachers]
