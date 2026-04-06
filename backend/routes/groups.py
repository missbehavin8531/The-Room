from fastapi import APIRouter, HTTPException, Depends, Query
import uuid
import secrets
from datetime import datetime, timezone
from typing import List

from database import db
from models import GroupCreate, GroupUpdate, GroupResponse, UserResponse
from auth import require_approved, require_teacher_or_admin, require_admin

router = APIRouter(prefix="/api")


def generate_invite_code():
    return secrets.token_urlsafe(6).upper()[:8]


@router.get("/groups/all", response_model=List[GroupResponse])
async def list_all_groups(user: dict = Depends(require_admin)):
    """List all groups with member counts."""
    groups = await db.groups.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    result = []
    for g in groups:
        count = await db.users.count_documents({'group_id': g['id']})
        result.append(GroupResponse(**g, member_count=count))
    return result


@router.post("/groups", response_model=GroupResponse)
async def create_group(data: GroupCreate, user: dict = Depends(require_teacher_or_admin)):
    # Teachers can only own 1 group
    if user['role'] == 'teacher':
        existing = await db.groups.find_one({'created_by': user['id']}, {'_id': 0})
        if existing:
            raise HTTPException(status_code=400, detail="You already have a group. Teachers are limited to one group.")

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

    # If teacher creating their group, assign them to it
    if user['role'] == 'teacher' and not user.get('group_id'):
        await db.users.update_one(
            {'id': user['id']},
            {'$set': {'group_id': group_id}, '$addToSet': {'group_ids': group_id}}
        )

    return GroupResponse(**group, member_count=1 if user['role'] == 'teacher' else 0)


@router.get("/groups/my", response_model=GroupResponse)
async def get_my_group(user: dict = Depends(require_approved)):
    group_ids = user.get('group_ids', [])
    group_id = group_ids[0] if group_ids else user.get('group_id')
    if not group_id:
        raise HTTPException(status_code=404, detail="You are not part of any group")

    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    member_count = await db.users.count_documents({'group_ids': group_id})
    return GroupResponse(**group, member_count=member_count)


@router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_group(group_id: str, data: GroupUpdate, user: dict = Depends(require_admin)):
    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    update_data = data.model_dump(exclude_unset=True, exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No changes to update")

    await db.groups.update_one({'id': group_id}, {'$set': update_data})
    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    member_count = await db.users.count_documents({'group_id': group_id})
    return GroupResponse(**group, member_count=member_count)


@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, user: dict = Depends(require_admin)):
    """Delete a group. Members become unassigned."""
    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Prevent deleting admin's own group
    if user.get('group_id') == group_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own group")

    # Unassign all members
    result = await db.users.update_many(
        {'group_id': group_id},
        {'$set': {'group_id': None}}
    )

    await db.groups.delete_one({'id': group_id})

    return {
        'message': f"Group '{group['name']}' deleted. {result.modified_count} members unassigned.",
        'members_unassigned': result.modified_count
    }


@router.get("/groups/{group_id}/members", response_model=List[UserResponse])
async def get_group_members(group_id: str, user: dict = Depends(require_admin)):
    """Get all members of a specific group."""
    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = await db.users.find(
        {'group_id': group_id},
        {'_id': 0, 'password': 0}
    ).to_list(1000)
    return [UserResponse(**m) for m in members]


@router.get("/groups/{group_id}/invite-code")
async def get_invite_code(group_id: str, user: dict = Depends(require_admin)):
    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return {'invite_code': group['invite_code']}


@router.post("/groups/{group_id}/regenerate-code")
async def regenerate_invite_code(group_id: str, user: dict = Depends(require_admin)):
    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    new_code = generate_invite_code()
    await db.groups.update_one({'id': group_id}, {'$set': {'invite_code': new_code}})
    return {'invite_code': new_code}


@router.post("/groups/join")
async def join_group_by_code(invite_code: str, user: dict = Depends(require_approved)):
    group = await db.groups.find_one({'invite_code': invite_code}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    user_group_ids = user.get('group_ids', [])
    if group['id'] in user_group_ids:
        raise HTTPException(status_code=400, detail="You are already a member of this group")

    await db.users.update_one(
        {'id': user['id']},
        {'$addToSet': {'group_ids': group['id']}, '$set': {'group_id': group['id']}}
    )

    return {'message': f"Joined {group['name']} successfully", 'group_id': group['id'], 'group_name': group['name']}


@router.get("/groups/lookup")
async def lookup_group(invite_code: str):
    """Public endpoint to verify an invite code before registration"""
    group = await db.groups.find_one({'invite_code': invite_code}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    return {'group_id': group['id'], 'group_name': group['name']}
