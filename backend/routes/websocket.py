from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
import json
import uuid
import logging
import jwt as pyjwt
import asyncio

from database import db, JWT_SECRET, JWT_ALGORITHM
from utils.sanitize import sanitize_text, LIMITS
from utils.rate_limit import chat_rate_limiter

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections grouped by group_id."""

    def __init__(self):
        self.connections: dict[str, list[tuple[WebSocket, dict]]] = {}
        self.ws_users: dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, user: dict):
        await websocket.accept()
        group_ids = user.get('group_ids', [])
        group_id = group_ids[0] if group_ids else user.get('group_id')

        room_key = group_id or '__global__'
        if room_key not in self.connections:
            self.connections[room_key] = []
        self.connections[room_key].append((websocket, user))
        self.ws_users[websocket] = user

    def disconnect(self, websocket: WebSocket):
        user = self.ws_users.pop(websocket, None)
        if user:
            for room_key, conns in self.connections.items():
                self.connections[room_key] = [(ws, u) for ws, u in conns if ws != websocket]

    def get_online_count(self, room_key: str) -> int:
        return len(self.connections.get(room_key, []))

    async def broadcast_to_room(self, room_key: str, data: dict, exclude_ws: WebSocket = None):
        """Broadcast a JSON message to all connections in a room."""
        conns = self.connections.get(room_key, [])
        dead = []
        for ws, _user in conns:
            if ws == exclude_ws:
                continue
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


async def authenticate_ws(token: str) -> dict | None:
    """Authenticate a WebSocket connection by JWT token."""
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('role') == 'guest':
            return payload
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        return user
    except Exception:
        return None


# --- Message Handlers ---

async def handle_message(user: dict, data: dict, group_id: str, room_key: str, websocket: WebSocket):
    """Handle a new chat message."""
    content = data.get('content', '').strip()
    if not content:
        return
    if user.get('is_muted'):
        await websocket.send_json({'type': 'error', 'message': 'You are muted'})
        return
    if chat_rate_limiter.is_rate_limited(user['id']):
        await websocket.send_json({'type': 'error', 'message': 'Too many messages. Please wait a moment.'})
        return
    content = sanitize_text(content, LIMITS['chat_message'])
    if not content:
        return

    message_id = str(uuid.uuid4())
    message = {
        'id': message_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'content': content,
        'is_hidden': False,
        'group_id': group_id,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(message)

    await manager.broadcast_to_room(room_key, {
        'type': 'new_message',
        'message': {
            'id': message_id,
            'user_id': user['id'],
            'user_name': user['name'],
            'content': content,
            'is_hidden': False,
            'created_at': message['created_at']
        }
    })


async def handle_delete(user: dict, data: dict, room_key: str, websocket: WebSocket):
    """Handle message deletion (teacher/admin only)."""
    message_id = data.get('message_id')
    if not message_id:
        return
    if user['role'] not in ['teacher', 'admin']:
        await websocket.send_json({'type': 'error', 'message': 'Not authorized'})
        return
    await db.chat_messages.delete_one({'id': message_id})
    await manager.broadcast_to_room(room_key, {
        'type': 'message_deleted',
        'message_id': message_id
    })


async def handle_hide(user: dict, data: dict, room_key: str, websocket: WebSocket):
    """Handle message hide/unhide (teacher/admin only)."""
    message_id = data.get('message_id')
    hidden = data.get('hidden', True)
    if not message_id:
        return
    if user['role'] not in ['teacher', 'admin']:
        await websocket.send_json({'type': 'error', 'message': 'Not authorized'})
        return
    await db.chat_messages.update_one(
        {'id': message_id}, {'$set': {'is_hidden': hidden}}
    )
    await manager.broadcast_to_room(room_key, {
        'type': 'message_hidden',
        'message_id': message_id,
        'hidden': hidden
    })


async def handle_typing(user: dict, room_key: str, websocket: WebSocket):
    """Broadcast typing indicator to other users in the room."""
    await manager.broadcast_to_room(room_key, {
        'type': 'typing',
        'user_id': user['id'],
        'user_name': user['name']
    }, exclude_ws=websocket)


# --- WebSocket Endpoint ---

@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    token = websocket.query_params.get('token')
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    user = await authenticate_ws(token)
    if not user:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    if user.get('role') == 'guest':
        await websocket.close(code=4003, reason="Guests cannot use live chat")
        return

    await manager.connect(websocket, user)

    group_ids = user.get('group_ids', [])
    group_id = group_ids[0] if group_ids else user.get('group_id')
    room_key = group_id or '__global__'

    try:
        await websocket.send_json({
            'type': 'connected',
            'online_count': manager.get_online_count(room_key)
        })
    except Exception:
        manager.disconnect(websocket)
        return

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({'type': 'error', 'message': 'Invalid JSON'})
                continue

            msg_type = data.get('type', 'message')

            if msg_type == 'ping':
                await websocket.send_json({'type': 'pong'})
            elif msg_type == 'message':
                await handle_message(user, data, group_id, room_key, websocket)
            elif msg_type == 'delete':
                await handle_delete(user, data, room_key, websocket)
            elif msg_type == 'hide':
                await handle_hide(user, data, room_key, websocket)
            elif msg_type == 'typing':
                await handle_typing(user, room_key, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        try:
            await manager.broadcast_to_room(room_key, {
                'type': 'user_left',
                'online_count': manager.get_online_count(room_key)
            })
        except Exception:
            pass
    except Exception as e:
        logger.error(f"WS error: {e}")
        manager.disconnect(websocket)
