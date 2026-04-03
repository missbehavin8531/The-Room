from fastapi import APIRouter, HTTPException, Depends
import uuid
import secrets
from datetime import datetime, timezone

from database import db
from models import ChurchCreate, ChurchUpdate, ChurchResponse
from auth import require_approved, require_teacher_or_admin

router = APIRouter(prefix="/api")


def generate_invite_code():
    return secrets.token_urlsafe(6).upper()[:8]


@router.post("/churches", response_model=ChurchResponse)
async def create_church(data: ChurchCreate, user: dict = Depends(require_approved)):
    church_id = str(uuid.uuid4())
    invite_code = generate_invite_code()

    church = {
        'id': church_id,
        'name': data.name,
        'description': data.description or '',
        'invite_code': invite_code,
        'created_by': user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.churches.insert_one(church)

    # Assign creating user to this church and make them admin
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'church_id': church_id, 'role': 'admin'}}
    )

    member_count = await db.users.count_documents({'church_id': church_id})
    return ChurchResponse(**church, member_count=member_count)


@router.get("/churches/my", response_model=ChurchResponse)
async def get_my_church(user: dict = Depends(require_approved)):
    church_id = user.get('church_id')
    if not church_id:
        raise HTTPException(status_code=404, detail="You are not part of any church")

    church = await db.churches.find_one({'id': church_id}, {'_id': 0})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")

    member_count = await db.users.count_documents({'church_id': church_id})
    return ChurchResponse(**church, member_count=member_count)


@router.put("/churches/{church_id}", response_model=ChurchResponse)
async def update_church(church_id: str, data: ChurchUpdate, user: dict = Depends(require_teacher_or_admin)):
    if user.get('church_id') != church_id:
        raise HTTPException(status_code=403, detail="You can only edit your own church")

    update_data = data.model_dump(exclude_unset=True, exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No changes to update")

    await db.churches.update_one({'id': church_id}, {'$set': update_data})
    church = await db.churches.find_one({'id': church_id}, {'_id': 0})
    member_count = await db.users.count_documents({'church_id': church_id})
    return ChurchResponse(**church, member_count=member_count)


@router.get("/churches/{church_id}/invite-code")
async def get_invite_code(church_id: str, user: dict = Depends(require_teacher_or_admin)):
    if user.get('church_id') != church_id:
        raise HTTPException(status_code=403, detail="You can only view your own church's invite code")

    church = await db.churches.find_one({'id': church_id}, {'_id': 0})
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")

    return {'invite_code': church['invite_code']}


@router.post("/churches/{church_id}/regenerate-code")
async def regenerate_invite_code(church_id: str, user: dict = Depends(require_teacher_or_admin)):
    if user.get('church_id') != church_id:
        raise HTTPException(status_code=403, detail="You can only manage your own church")

    new_code = generate_invite_code()
    await db.churches.update_one({'id': church_id}, {'$set': {'invite_code': new_code}})
    return {'invite_code': new_code}


@router.post("/churches/join")
async def join_church_by_code(invite_code: str, user: dict = Depends(require_approved)):
    if user.get('church_id'):
        raise HTTPException(status_code=400, detail="You are already part of a church")

    church = await db.churches.find_one({'invite_code': invite_code}, {'_id': 0})
    if not church:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'church_id': church['id']}}
    )

    return {'message': f"Joined {church['name']} successfully", 'church_id': church['id'], 'church_name': church['name']}


@router.get("/churches/lookup")
async def lookup_church(invite_code: str):
    """Public endpoint to verify an invite code before registration"""
    church = await db.churches.find_one({'invite_code': invite_code}, {'_id': 0})
    if not church:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    return {'church_id': church['id'], 'church_name': church['name']}
