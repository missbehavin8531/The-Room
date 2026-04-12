from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
import uuid
from datetime import datetime, timezone

from database import db
from models import (
    CommentCreate, CommentResponse,
    ChatMessageCreate, ChatMessageResponse,
    PrivateMessageCreate, PrivateMessageResponse
)
from auth import require_approved, require_teacher_or_admin, require_non_guest

router = APIRouter(prefix="/api")


# ============== COMMENTS ==============

@router.post("/lessons/{lesson_id}/comments", response_model=CommentResponse)
async def create_comment(lesson_id: str, data: CommentCreate, user: dict = Depends(require_non_guest)):
    if user.get('is_muted'):
        raise HTTPException(status_code=403, detail="You are muted and cannot post")
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    comment_id = str(uuid.uuid4())
    comment = {
        'id': comment_id,
        'lesson_id': lesson_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'content': data.content,
        'is_hidden': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment)
    return CommentResponse(**comment)

@router.get("/lessons/{lesson_id}/comments", response_model=List[CommentResponse])
async def get_comments(lesson_id: str, user: dict = Depends(require_approved)):
    query = {'lesson_id': lesson_id}
    if user['role'] not in ['teacher', 'admin']:
        query['is_hidden'] = False
    comments = await db.comments.find(query, {'_id': 0}).sort('created_at', 1).to_list(1000)
    return [CommentResponse(**c) for c in comments]

@router.put("/comments/{comment_id}/hide")
async def hide_comment(comment_id: str, hidden: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.comments.update_one({'id': comment_id}, {'$set': {'is_hidden': hidden}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {'message': f'Comment {"hidden" if hidden else "shown"}'}

@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.comments.delete_one({'id': comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {'message': 'Comment deleted'}


# ============== GLOBAL CHAT ==============

@router.post("/chat", response_model=ChatMessageResponse)
async def send_chat_message(data: ChatMessageCreate, user: dict = Depends(require_non_guest)):
    if user.get('is_muted'):
        raise HTTPException(status_code=403, detail="You are muted and cannot chat")
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    message_id = str(uuid.uuid4())
    message = {
        'id': message_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'content': data.content,
        'is_hidden': False,
        'group_id': user.get('group_id'),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(message)
    return ChatMessageResponse(**message)

@router.get("/chat", response_model=List[ChatMessageResponse])
async def get_chat_messages(limit: int = 100, user: dict = Depends(require_approved)):
    query = {}
    if user['role'] not in ['teacher', 'admin']:
        query['is_hidden'] = False
    group_id = user.get('group_id')
    if group_id:
        query['group_id'] = group_id
    messages = await db.chat_messages.find(query, {'_id': 0}).sort('created_at', -1).limit(limit).to_list(limit)
    message_ids = [m['id'] for m in messages]

    # Batch fetch reactions for all messages
    all_reactions = await db.chat_reactions.find({'message_id': {'$in': message_ids}}, {'_id': 0}).to_list(5000)
    reactions_map = {}
    for r in all_reactions:
        mid = r['message_id']
        e = r['emoji']
        if mid not in reactions_map:
            reactions_map[mid] = {}
        if e not in reactions_map[mid]:
            reactions_map[mid][e] = {'emoji': e, 'count': 0, 'users': [], 'user_reacted': False}
        reactions_map[mid][e]['count'] += 1
        reactions_map[mid][e]['users'].append(r['user_name'])
        if r['user_id'] == user['id']:
            reactions_map[mid][e]['user_reacted'] = True

    result = []
    for m in reversed(messages):
        msg_dict = dict(m)
        msg_dict['reactions'] = list(reactions_map.get(m['id'], {}).values())
        result.append(msg_dict)

    return result

@router.put("/chat/{message_id}/hide")
async def hide_chat_message(message_id: str, hidden: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.chat_messages.update_one({'id': message_id}, {'$set': {'is_hidden': hidden}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {'message': f'Message {"hidden" if hidden else "shown"}'}

@router.delete("/chat/{message_id}")
async def delete_chat_message(message_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.chat_messages.delete_one({'id': message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    # Clean up reactions and read receipts
    await db.chat_reactions.delete_many({'message_id': message_id})
    await db.chat_read_receipts.delete_many({'message_id': message_id})
    return {'message': 'Message deleted'}


# ============== CHAT REACTIONS ==============

@router.post("/chat/{message_id}/react")
async def toggle_reaction(message_id: str, emoji: str = Query(...), user: dict = Depends(require_non_guest)):
    msg = await db.chat_messages.find_one({'id': message_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    existing = await db.chat_reactions.find_one({
        'message_id': message_id,
        'user_id': user['id'],
        'emoji': emoji,
    })
    if existing:
        await db.chat_reactions.delete_one({'_id': existing['_id']})
        return {'action': 'removed', 'emoji': emoji}

    await db.chat_reactions.insert_one({
        'id': str(uuid.uuid4()),
        'message_id': message_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'emoji': emoji,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    return {'action': 'added', 'emoji': emoji}


@router.get("/chat/{message_id}/reactions")
async def get_message_reactions(message_id: str, user: dict = Depends(require_approved)):
    reactions = await db.chat_reactions.find({'message_id': message_id}, {'_id': 0}).to_list(500)
    grouped = {}
    for r in reactions:
        e = r['emoji']
        if e not in grouped:
            grouped[e] = {'emoji': e, 'count': 0, 'users': [], 'user_reacted': False}
        grouped[e]['count'] += 1
        grouped[e]['users'].append(r['user_name'])
        if r['user_id'] == user['id']:
            grouped[e]['user_reacted'] = True
    return list(grouped.values())


# ============== CHAT READ RECEIPTS ==============

@router.post("/chat/mark-read")
async def mark_chat_read(user: dict = Depends(require_non_guest)):
    """Mark all visible chat messages as read by this user."""
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_read_receipts.update_one(
        {'user_id': user['id']},
        {'$set': {'user_id': user['id'], 'user_name': user['name'], 'last_read_at': now}},
        upsert=True
    )
    return {'message': 'Chat marked as read'}


@router.get("/chat/read-receipts")
async def get_read_receipts(user: dict = Depends(require_approved)):
    """Get all users' last-read timestamps."""
    receipts = await db.chat_read_receipts.find({}, {'_id': 0}).to_list(500)
    return receipts


# ============== PRIVATE MESSAGES ==============

@router.post("/messages", response_model=PrivateMessageResponse)
async def send_private_message(data: PrivateMessageCreate, user: dict = Depends(require_non_guest)):
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    teacher = await db.users.find_one({'id': data.teacher_id, 'role': {'$in': ['teacher', 'admin']}}, {'_id': 0})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    message_id = str(uuid.uuid4())
    message = {
        'id': message_id,
        'sender_id': user['id'],
        'sender_name': user['name'],
        'teacher_id': data.teacher_id,
        'teacher_name': teacher['name'],
        'content': data.content,
        'is_read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.private_messages.insert_one(message)
    return PrivateMessageResponse(**message)

@router.get("/messages/inbox", response_model=List[PrivateMessageResponse])
async def get_inbox(user: dict = Depends(require_approved)):
    if user['role'] == 'teacher':
        messages = await db.private_messages.find({'teacher_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    else:
        messages = await db.private_messages.find({'sender_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return [PrivateMessageResponse(**m) for m in messages]

@router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.private_messages.update_one({'id': message_id}, {'$set': {'is_read': True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {'message': 'Marked as read'}
