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
        # group_id -> list of (websocket, user_dict)
        self.connections: dict[str, list[tuple[WebSocket, dict]]] = {}
        # ws -> user_dict (for quick lookup on disconnect)
        self.ws_users: dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, user: dict):
        await websocket.accept()
        group_ids = user.get('group_ids', [])
        group_id = group_ids[0] if group_ids else user.get('group_id')

        # Admin with no groups sees global chat
        room_key = group_id or '__global__'

        if room_key not in self.connections:
            self.connections[room_key] = []
        self.connections[room_key].append((websocket, user))
        self.ws_users[websocket] = {**user, '_room_key': room_key}
        logger.info(f"WS connected: {user['name']} -> room {room_key}")

    def disconnect(self, websocket: WebSocket):
        user = self.ws_users.pop(websocket, None)
        if user:
            room_key = user.get('_room_key', '__global__')
            if room_key in self.connections:
                self.connections[room_key] = [
                    (ws, u) for ws, u in self.connections[room_key] if ws != websocket
                ]
                if not self.connections[room_key]:
                    del self.connections[room_key]
            logger.info(f"WS disconnected: {user.get('name')}")

    async def broadcast_to_room(self, room_key: str, message: dict, exclude_ws: WebSocket = None):
        """Send message to all connections in a room."""
        targets = self.connections.get(room_key, [])
        # Also broadcast to __global__ (admins watching all groups)
        if room_key != '__global__':
            targets = targets + self.connections.get('__global__', [])

        dead = []
        for ws, u in targets:
            if ws == exclude_ws:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)

        # Cleanup dead connections
        for ws in dead:
            self.disconnect(ws)

    def get_online_count(self, room_key: str) -> int:
        count = len(self.connections.get(room_key, []))
        if room_key != '__global__':
            count += len(self.connections.get('__global__', []))
        return count


manager = ConnectionManager()


async def authenticate_ws(token: str) -> dict | None:
    """Validate JWT token and return user dict, or None."""
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if user and user.get('is_approved'):
            return user
    except Exception as e:
        logger.warning(f"WS auth failed: {e}")
    return None


@router.websocket("/api/ws/chat")
async def websocket_chat(websocket: WebSocket):
    token = websocket.query_params.get('token')
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    user = await authenticate_ws(token)
    if not user:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    # Block guest tokens from WebSocket chat
    if user.get('role') == 'guest':
        await websocket.close(code=4003, reason="Guests cannot use live chat")
        return

    await manager.connect(websocket, user)

    # Determine this user's room
    group_ids = user.get('group_ids', [])
    group_id = group_ids[0] if group_ids else user.get('group_id')
    room_key = group_id or '__global__'

    # Send online count on connect
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
                continue

            if msg_type == 'message':
                content = data.get('content', '').strip()
                if not content:
                    continue
                if user.get('is_muted'):
                    await websocket.send_json({'type': 'error', 'message': 'You are muted'})
                    continue
                if chat_rate_limiter.is_rate_limited(user['id']):
                    await websocket.send_json({'type': 'error', 'message': 'Too many messages. Please wait a moment.'})
                    continue
                content = sanitize_text(content, LIMITS['chat_message'])
                if not content:
                    continue

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

                broadcast_msg = {
                    'type': 'new_message',
                    'message': {
                        'id': message_id,
                        'user_id': user['id'],
                        'user_name': user['name'],
                        'content': content,
                        'is_hidden': False,
                        'created_at': message['created_at']
                    }
                }
                # Broadcast to room (including sender for confirmation)
                await manager.broadcast_to_room(room_key, broadcast_msg)

            elif msg_type == 'delete':
                message_id = data.get('message_id')
                if not message_id:
                    continue
                if user['role'] not in ['teacher', 'admin']:
                    await websocket.send_json({'type': 'error', 'message': 'Not authorized'})
                    continue
                await db.chat_messages.delete_one({'id': message_id})
                await manager.broadcast_to_room(room_key, {
                    'type': 'message_deleted',
                    'message_id': message_id
                })

            elif msg_type == 'hide':
                message_id = data.get('message_id')
                hidden = data.get('hidden', True)
                if not message_id:
                    continue
                if user['role'] not in ['teacher', 'admin']:
                    await websocket.send_json({'type': 'error', 'message': 'Not authorized'})
                    continue
                await db.chat_messages.update_one(
                    {'id': message_id}, {'$set': {'is_hidden': hidden}}
                )
                await manager.broadcast_to_room(room_key, {
                    'type': 'message_hidden',
                    'message_id': message_id,
                    'hidden': hidden
                })

            elif msg_type == 'typing':
                await manager.broadcast_to_room(room_key, {
                    'type': 'typing',
                    'user_id': user['id'],
                    'user_name': user['name']
                }, exclude_ws=websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # Notify remaining users about updated count
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
