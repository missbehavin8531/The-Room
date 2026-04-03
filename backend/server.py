from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import os
import logging

from database import client, UPLOAD_DIR

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

# Static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
