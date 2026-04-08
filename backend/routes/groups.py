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
    
    # Admin with no group — return the first available group
    if not group_id and user.get('role') == 'admin':
        any_group = await db.groups.find_one({}, {'_id': 0})
        if any_group:
            member_count = await db.users.count_documents({'group_ids': any_group['id']})
            return GroupResponse(**any_group, member_count=member_count)
    
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

    # Unassign all members from both group_id and group_ids
    await db.users.update_many(
        {'group_id': group_id},
        {'$set': {'group_id': None}}
    )
    await db.users.update_many(
        {'group_ids': group_id},
        {'$pull': {'group_ids': group_id}}
    )

    # Also clean up users whose group_id was this group - set to first remaining group_id
    orphaned = await db.users.find(
        {'group_id': None, 'group_ids': {'$exists': True, '$not': {'$size': 0}}},
        {'_id': 0, 'id': 1, 'group_ids': 1}
    ).to_list(1000)
    for u in orphaned:
        if u['group_ids']:
            await db.users.update_one({'id': u['id']}, {'$set': {'group_id': u['group_ids'][0]}})

    await db.groups.delete_one({'id': group_id})

    return {
        'message': f"Group '{group['name']}' deleted. Members unassigned.",
    }


@router.get("/groups/{group_id}/members", response_model=List[UserResponse])
async def get_group_members(group_id: str, user: dict = Depends(require_admin)):
    """Get all members of a specific group."""
    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    members = await db.users.find(
        {'group_ids': group_id},
        {'_id': 0, 'password': 0}
    ).to_list(1000)
    return [UserResponse(**m) for m in members]


@router.delete("/groups/{group_id}/members/{user_id}")
async def remove_member_from_group(group_id: str, user_id: str, user: dict = Depends(require_admin)):
    """Remove a user from a specific group (without deleting them)."""
    group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    target = await db.users.find_one({'id': user_id}, {'_id': 0, 'password': 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.get('role') == 'admin':
        raise HTTPException(status_code=403, detail="Cannot remove admin from groups")

    if group_id not in target.get('group_ids', []):
        raise HTTPException(status_code=400, detail="User is not in this group")

    # Pull group from group_ids array
    await db.users.update_one(
        {'id': user_id},
        {'$pull': {'group_ids': group_id}}
    )

    # If this was their primary group_id, update to next remaining or null
    if target.get('group_id') == group_id:
        updated = await db.users.find_one({'id': user_id}, {'_id': 0, 'group_ids': 1})
        remaining = updated.get('group_ids', [])
        new_primary = remaining[0] if remaining else None
        await db.users.update_one({'id': user_id}, {'$set': {'group_id': new_primary}})

    return {
        'message': f"{target['name']} removed from {group['name']}",
        'user_id': user_id,
        'group_id': group_id,
    }


@router.put("/groups/{group_id}/members/{user_id}/move")
async def move_member_to_group(group_id: str, user_id: str, target_group_id: str = Query(...), user: dict = Depends(require_admin)):
    """Move a user from one group to another."""
    source_group = await db.groups.find_one({'id': group_id}, {'_id': 0})
    if not source_group:
        raise HTTPException(status_code=404, detail="Source group not found")

    target_group = await db.groups.find_one({'id': target_group_id}, {'_id': 0})
    if not target_group:
        raise HTTPException(status_code=404, detail="Target group not found")

    if group_id == target_group_id:
        raise HTTPException(status_code=400, detail="Source and target group are the same")

    target = await db.users.find_one({'id': user_id}, {'_id': 0, 'password': 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.get('role') == 'admin':
        raise HTTPException(status_code=403, detail="Cannot move admin between groups")

    if group_id not in target.get('group_ids', []):
        raise HTTPException(status_code=400, detail="User is not in the source group")

    # Atomic: remove from source, add to target
    await db.users.update_one(
        {'id': user_id},
        {
            '$pull': {'group_ids': group_id},
            '$set': {'group_id': target_group_id},
        }
    )
    await db.users.update_one(
        {'id': user_id},
        {'$addToSet': {'group_ids': target_group_id}}
    )

    return {
        'message': f"{target['name']} moved from {source_group['name']} to {target_group['name']}",
        'user_id': user_id,
        'from_group': source_group['name'],
        'to_group': target_group['name'],
    }


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
