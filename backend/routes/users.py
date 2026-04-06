from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from typing import List
import uuid
from datetime import datetime, timezone

from database import db
from models import UserResponse
from auth import require_admin, require_teacher_or_admin, require_approved
from services.email_service import email_service
from services.security_logger import log_security_event

router = APIRouter(prefix="/api")


@router.get("/users", response_model=List[UserResponse])
async def get_users(skip: int = Query(0, ge=0), limit: int = Query(200, ge=1, le=500), user: dict = Depends(require_teacher_or_admin)):
    query = {}
    if user['role'] == 'teacher':
        group_ids = user.get('group_ids', [])
        group_id = user.get('group_id')
        if group_ids:
            query['group_ids'] = {'$in': group_ids}
        elif group_id:
            query['group_ids'] = group_id
        else:
            return []
    users = await db.users.find(query, {'_id': 0, 'password': 0}).skip(skip).limit(limit).to_list(limit)
    return [UserResponse(**u) for u in users]

@router.get("/users/pending", response_model=List[UserResponse])
async def get_pending_users(skip: int = Query(0, ge=0), limit: int = Query(200, ge=1, le=500), user: dict = Depends(require_teacher_or_admin)):
    query = {'is_approved': False}
    if user['role'] == 'teacher':
        group_ids = user.get('group_ids', [])
        group_id = user.get('group_id')
        if group_ids:
            query['group_ids'] = {'$in': group_ids}
        elif group_id:
            query['group_ids'] = group_id
        else:
            return []
    users = await db.users.find(query, {'_id': 0, 'password': 0}).skip(skip).limit(limit).to_list(limit)
    return [UserResponse(**u) for u in users]


@router.get("/users/unassigned", response_model=List[UserResponse])
async def get_unassigned_users(skip: int = Query(0, ge=0), limit: int = Query(200, ge=1, le=500), user: dict = Depends(require_admin)):
    """Get non-admin users that are not assigned to any group."""
    users = await db.users.find(
        {'$and': [
            {'$or': [{'group_ids': {'$size': 0}}, {'group_ids': {'$exists': False}}]},
            {'role': {'$ne': 'admin'}}
        ]},
        {'_id': 0, 'password': 0}
    ).skip(skip).limit(limit).to_list(limit)
    return [UserResponse(**u) for u in users]


@router.put("/users/{user_id}/assign-group")
async def assign_user_to_group(user_id: str, group_id: str = Query(...), user: dict = Depends(require_admin)):
    """Assign a user to a group (adds to their group_ids array)."""
    target_group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not target_group:
        raise HTTPException(status_code=404, detail="Group not found")

    target_user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one(
        {'id': user_id},
        {'$addToSet': {'group_ids': group_id}, '$set': {'group_id': group_id}}
    )

    return {
        'message': f"{target_user['name']} has been added to {target_group['name']}",
        'user_id': user_id,
        'group_id': group_id,
        'group_name': target_group['name']
    }

@router.put("/users/{user_id}/approve")
async def approve_user(user_id: str, background_tasks: BackgroundTasks, user: dict = Depends(require_teacher_or_admin)):
    user_to_approve = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user_to_approve:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Teachers can only approve members in their group
    if user['role'] == 'teacher':
        if user.get('group_id') != user_to_approve.get('group_id'):
            raise HTTPException(status_code=403, detail="You can only approve members in your group")
    
    result = await db.users.update_one({'id': user_id}, {'$set': {'is_approved': True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or already approved")
    
    await log_security_event('user_approved', f'{user_to_approve["email"]} approved by {user["email"]}', email=user_to_approve['email'], user_id=user_id)
    
    if user_to_approve.get('email'):
        background_tasks.add_task(
            email_service.send_welcome_email,
            user_to_approve['email'],
            user_to_approve['name']
        )
    
    return {'message': 'User approved'}

@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str = Query(...), background_tasks: BackgroundTasks = None, user: dict = Depends(require_admin)):
    """Only app admin can change roles. When promoting to teacher, sends email."""
    if role not in ['member', 'teacher']:
        raise HTTPException(status_code=400, detail="Invalid role. Use 'member' or 'teacher'.")
    
    target_user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role = target_user.get('role')
    await db.users.update_one({'id': user_id}, {'$set': {'role': role, 'is_approved': True}})
    
    # Send email when promoting to teacher
    if role == 'teacher' and old_role != 'teacher' and target_user.get('email'):
        try:
            background_tasks.add_task(
                email_service.send_teacher_promotion_email,
                target_user['email'],
                target_user['name']
            )
        except Exception:
            pass
    
    return {'message': f"Role updated to {role}", 'role': role}

@router.put("/users/{user_id}/mute")
async def mute_user(user_id: str, muted: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.users.update_one({'id': user_id}, {'$set': {'is_muted': muted}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': f'User {"muted" if muted else "unmuted"}'}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_teacher_or_admin)):
    target = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Teachers can only delete members in their own group(s)
    if user['role'] == 'teacher':
        teacher_groups = set(user.get('group_ids', []))
        target_groups = set(target.get('group_ids', []))
        if not teacher_groups.intersection(target_groups):
            raise HTTPException(status_code=403, detail="You can only delete members in your group")
    # Prevent deleting admin accounts
    if target.get('role') == 'admin':
        raise HTTPException(status_code=403, detail="Cannot delete admin accounts")
    await log_security_event('user_deleted', f'{target["email"]} deleted by {user["email"]}', email=target['email'], user_id=user_id)
    result = await db.users.delete_one({'id': user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': 'User deleted'}

@router.get("/teachers", response_model=List[UserResponse])
async def get_teachers(user: dict = Depends(require_approved)):
    query = {'role': {'$in': ['teacher', 'admin']}, 'is_approved': True}
    group_id = user.get('group_id')
    if group_id:
        query['group_id'] = group_id
    teachers = await db.users.find(query, {'_id': 0, 'password': 0}).to_list(100)
    return [UserResponse(**t) for t in teachers]
