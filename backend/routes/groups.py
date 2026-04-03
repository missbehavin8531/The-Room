from fastapi import APIRouter, HTTPException, Depends
import uuid
import secrets
from datetime import datetime, timezone

from database import db
from models import GroupCreate, GroupUpdate, GroupResponse
from auth import require_approved, require_teacher_or_admin

router = APIRouter(prefix="/api")


def generate_invite_code():
    return secrets.token_urlsafe(6).upper()[:8]


@router.post("/groups", response_model=GroupResponse)
async def create_group(data: GroupCreate, user: dict = Depends(require_approved)):
    group_id = str(uuid.uuid4())
    invite_code = generate_invite_code()

    group = {
        'id': group_id,
        'name': data.name,
        'description': data.description or '',
        'invite_code': invite_code,
        'created_by': user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.groups.insert_one(group)

    # Assign creating user to this group and make them admin
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'group_id': group_id, 'role': 'admin'}}
    )

    member_count = await db.users.count_documents({'group_id': group_id})
    return GroupResponse(**group, member_count=member_count)


@router.get("/groups/my", response_model=GroupResponse)
async def get_my_group(user: dict = Depends(require_approved)):
    group_id = user.get('group_id')
    if not group_id:
        raise HTTPException(status_code=404, detail="You are not part of any group")

    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    member_count = await db.users.count_documents({'group_id': group_id})
    return GroupResponse(**group, member_count=member_count)


@router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_group(group_id: str, data: GroupUpdate, user: dict = Depends(require_teacher_or_admin)):
    if user.get('group_id') != group_id:
        raise HTTPException(status_code=403, detail="You can only edit your own group")

    update_data = data.model_dump(exclude_unset=True, exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No changes to update")

    await db.groups.update_one({'id': group_id}, {'$set': update_data})
    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    member_count = await db.users.count_documents({'group_id': group_id})
    return GroupResponse(**group, member_count=member_count)


@router.get("/groups/{group_id}/invite-code")
async def get_invite_code(group_id: str, user: dict = Depends(require_teacher_or_admin)):
    if user.get('group_id') != group_id:
        raise HTTPException(status_code=403, detail="You can only view your own group's invite code")

    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    return {'invite_code': group['invite_code']}


@router.post("/groups/{group_id}/regenerate-code")
async def regenerate_invite_code(group_id: str, user: dict = Depends(require_teacher_or_admin)):
    if user.get('group_id') != group_id:
        raise HTTPException(status_code=403, detail="You can only manage your own group")

    new_code = generate_invite_code()
    await db.groups.update_one({'id': group_id}, {'$set': {'invite_code': new_code}})
    return {'invite_code': new_code}


@router.post("/groups/join")
async def join_group_by_code(invite_code: str, user: dict = Depends(require_approved)):
    if user.get('group_id'):
        raise HTTPException(status_code=400, detail="You are already part of a group")

    group = await db.groups.find_one({'invite_code': invite_code}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'group_id': group['id']}}
    )

    return {'message': f"Joined {group['name']} successfully", 'group_id': group['id'], 'group_name': group['name']}


@router.get("/groups/lookup")
async def lookup_group(invite_code: str):
    """Public endpoint to verify an invite code before registration"""
    group = await db.groups.find_one({'invite_code': invite_code}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    return {'group_id': group['id'], 'group_name': group['name']}
