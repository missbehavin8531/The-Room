from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import os
import logging

from database import client, db, UPLOAD_DIR

# Import routers
from auth import router as auth_router
from routes.users import router as users_router
from routes.courses import router as courses_router
from routes.lessons import router as lessons_router
from routes.prompts import router as prompts_router
from routes.social import router as social_router
from routes.attendance import router as attendance_router
from routes.video import router as video_router
from routes.progress import router as progress_router
from routes.notifications import router as notifications_router
from routes.seed import router as seed_router
from routes.groups import router as groups_router
from routes.websocket import router as websocket_router
from routes.zoom import router as zoom_router
from routes.security_log import router as security_log_router

# Create the main app
app = FastAPI(title="The Room API")

# Include all routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(courses_router)
app.include_router(lessons_router)
app.include_router(prompts_router)
app.include_router(social_router)
app.include_router(attendance_router)
app.include_router(video_router)
app.include_router(progress_router)
app.include_router(notifications_router)
app.include_router(seed_router)
app.include_router(groups_router)
app.include_router(websocket_router)
app.include_router(zoom_router)
app.include_router(security_log_router)

# Static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# CORS
frontend_url = os.environ.get('FRONTEND_URL', '')
cors_origins = os.environ.get('CORS_ORIGINS', frontend_url).split(',')
cors_origins = [o.strip() for o in cors_origins if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins if cors_origins else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_migrate_courses():
    """Auto-fix courses with orphaned group_ids on every startup."""
    try:
        # Get all active groups
        all_groups = await db.groups.find({}, {'_id': 0, 'id': 1}).to_list(500)
        valid_group_ids = {g['id'] for g in all_groups}

        if not valid_group_ids:
            logger.info("Migration: No groups found, skipping course fix.")
            return

        # Find courses with missing, null, or orphaned group_ids
        all_courses = await db.courses.find({}, {'_id': 0, 'id': 1, 'group_id': 1, 'title': 1}).to_list(5000)
        orphaned = [c for c in all_courses if not c.get('group_id') or c.get('group_id') not in valid_group_ids]

        if not orphaned:
            logger.info("Migration: All courses have valid group_ids.")
            return

        # Find the most populated group to assign orphaned courses to
        best_group_id = None
        best_count = -1
        for gid in valid_group_ids:
            count = await db.users.count_documents({'$or': [{'group_ids': gid}, {'group_id': gid}]})
            if count > best_count:
                best_count = count
                best_group_id = gid

        if not best_group_id:
            logger.warning("Migration: No group with users found.")
            return

        group_doc = await db.groups.find_one({'id': best_group_id}, {'_id': 0, 'name': 1})
        group_name = group_doc.get('name', 'Unknown') if group_doc else 'Unknown'

        # Reassign orphaned courses
        orphaned_ids = [c['id'] for c in orphaned]
        result = await db.courses.update_many(
            {'id': {'$in': orphaned_ids}},
            {'$set': {'group_id': best_group_id}}
        )
        logger.info(f"Migration: Reassigned {result.modified_count} orphaned courses to '{group_name}' ({best_group_id})")

        # Also fix lessons belonging to these courses
        orphaned_course_ids = [c['id'] for c in orphaned]
        lesson_result = await db.lessons.update_many(
            {'course_id': {'$in': orphaned_course_ids}, '$or': [{'group_id': {'$exists': False}}, {'group_id': None}]},
            {'$set': {'group_id': best_group_id}}
        )
        if lesson_result.modified_count:
            logger.info(f"Migration: Updated group_id on {lesson_result.modified_count} lessons.")

    except Exception as e:
        logger.error(f"Migration error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
