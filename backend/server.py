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


@app.on_event("startup")
async def seed_demo_courses():
    """Ensure the DEMO2026 group has the introduction courses for Try Demo."""
    try:
        demo_group = await db.groups.find_one({'invite_code': 'DEMO2026'}, {'_id': 0})
        if not demo_group:
            logger.info("Demo seed: No DEMO2026 group found, skipping.")
            return

        gid = demo_group['id']
        # Check which intro courses already exist in this group
        existing = await db.courses.find(
            {'group_id': gid, 'title': {'$regex': '^Introduction'}},
            {'_id': 0, 'title': 1}
        ).to_list(20)
        existing_titles = {c['title'] for c in existing}

        import uuid
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        teacher_id = demo_group.get('created_by', 'system')

        demo_courses = [
            {
                'title': 'Introduction to the Gospel',
                'description': 'A foundational course exploring the core teachings of the Christian Gospel, from creation to redemption.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1529070538774-1327cb8751e8?w=600',
                'lessons': [
                    {'title': 'The Good News', 'description': 'Understanding the heart of the Gospel message.'},
                    {'title': 'Faith and Grace', 'description': 'How faith and grace work together in the Christian life.'},
                    {'title': 'Living in Christ', 'description': 'Practical application of Gospel truths in daily life.'},
                ]
            },
            {
                'title': 'Introduction to Artificial Intelligence',
                'description': 'Explore the fundamentals of AI — from machine learning and neural networks to real-world applications.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600',
                'lessons': [
                    {'title': 'What Is AI?', 'description': 'A beginner-friendly overview of artificial intelligence.'},
                    {'title': 'Machine Learning Basics', 'description': 'How machines learn from data.'},
                    {'title': 'AI Ethics & the Future', 'description': 'Navigating the ethical landscape of AI.'},
                ]
            },
            {
                'title': 'Introduction to Digital Marketing',
                'description': 'Master the essentials of SEO, social media strategy, and online advertising.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
                'lessons': [
                    {'title': 'SEO Fundamentals', 'description': 'How search engines work and how to rank.'},
                    {'title': 'Social Media Strategy', 'description': 'Building an effective social media presence.'},
                    {'title': 'Paid Advertising (Google & Meta Ads)', 'description': 'Getting started with paid campaigns.'},
                ]
            },
            {
                'title': 'Introduction to Mindfulness & Mental Wellness',
                'description': 'Build a sustainable mindfulness practice for stress management and emotional well-being.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600',
                'lessons': [
                    {'title': 'The Science of Mindfulness', 'description': 'Evidence-based benefits of mindfulness.'},
                    {'title': 'Stress Management & Emotional Regulation', 'description': 'Practical techniques for managing stress.'},
                    {'title': 'Building a Sustainable Wellness Routine', 'description': 'Creating lasting healthy habits.'},
                ]
            },
            {
                'title': 'Introduction to Finance Basics',
                'description': 'Learn budgeting, investing fundamentals, and strategies for building long-term wealth.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600',
                'lessons': [
                    {'title': 'Budgeting That Actually Works', 'description': 'Practical budgeting frameworks.'},
                    {'title': 'Investing 101', 'description': 'Stocks, bonds, and index funds explained.'},
                    {'title': 'Building Long-Term Wealth', 'description': 'Strategies for financial freedom.'},
                ]
            },
        ]

        seeded = 0
        for course_data in demo_courses:
            if course_data['title'] in existing_titles:
                continue

            course_id = str(uuid.uuid4())
            base_date = now + timedelta(days=seeded * 7)
            course = {
                'id': course_id,
                'title': course_data['title'],
                'description': course_data['description'],
                'thumbnail_url': course_data['thumbnail_url'],
                'is_published': True,
                'unlock_type': 'all',
                'teacher_id': teacher_id,
                'teacher_name': 'Teacher',
                'group_id': gid,
                'created_at': now.isoformat()
            }
            await db.courses.insert_one(course)

            for i, lesson in enumerate(course_data['lessons']):
                lesson_date = (base_date + timedelta(days=i * 7)).strftime('%Y-%m-%d')
                await db.lessons.insert_one({
                    'id': str(uuid.uuid4()),
                    'course_id': course_id,
                    'title': lesson['title'],
                    'description': lesson['description'],
                    'lesson_date': lesson_date,
                    'is_published': True,
                    'order': i,
                    'created_at': now.isoformat()
                })

            seeded += 1

        if seeded:
            logger.info(f"Demo seed: Created {seeded} introduction courses in '{demo_group['name']}'.")
        else:
            logger.info("Demo seed: All introduction courses already exist.")

    except Exception as e:
        logger.error(f"Demo seed error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
