from fastapi import APIRouter, Depends, Query
from typing import Optional

from database import db
from auth import require_admin

router = APIRouter(prefix="/api")


@router.get("/security-logs")
async def get_security_logs(
    user: dict = Depends(require_admin),
    event_type: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0
):
    query = {}
    if event_type:
        query['event_type'] = event_type

    cursor = db.security_logs.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit)
    logs = await cursor.to_list(limit)
    total = await db.security_logs.count_documents(query)
    return {'logs': logs, 'total': total}


@router.get("/security-logs/summary")
async def get_security_summary(user: dict = Depends(require_admin)):
    pipeline = [
        {'$group': {'_id': '$event_type', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}}
    ]
    results = await db.security_logs.aggregate(pipeline).to_list(100)
    summary = {r['_id']: r['count'] for r in results}
    total = await db.security_logs.count_documents({})
    return {'summary': summary, 'total': total}
