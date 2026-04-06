from datetime import datetime, timezone
import uuid

from database import db


async def log_security_event(
    event_type: str,
    description: str,
    email: str = None,
    user_id: str = None,
    ip_address: str = None,
    metadata: dict = None
):
    """Utility to record a security event."""
    entry = {
        'id': str(uuid.uuid4()),
        'event_type': event_type,
        'description': description,
        'email': email,
        'user_id': user_id,
        'ip_address': ip_address,
        'metadata': metadata or {},
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.security_logs.insert_one(entry)
