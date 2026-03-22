from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
from typing import List
import bcrypt
import jwt
import uuid

from database import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from models import UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/api")
security = HTTPBearer()


# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_approved(user: dict = Depends(get_current_user)):
    if not user.get('is_approved'):
        raise HTTPException(status_code=403, detail="Account pending approval")
    return user

async def require_teacher(user: dict = Depends(require_approved)):
    if user['role'] not in ['teacher', 'admin']:
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user

require_teacher_or_admin = require_teacher
require_admin = require_teacher


# ============== AUTH ROUTES ==============

@router.post("/auth/register", response_model=dict)
async def register(data: UserCreate):
    existing = await db.users.find_one({'email': data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'email': data.email,
        'name': data.name,
        'password': hash_password(data.password),
        'role': 'member',
        'is_approved': False,
        'is_muted': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    return {'message': 'Registration successful. Please wait for admin approval.', 'user_id': user_id}

@router.post("/auth/login", response_model=dict)
async def login(data: UserLogin):
    user = await db.users.find_one({'email': data.email}, {'_id': 0})
    if not user or not verify_password(data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    onboarding = await db.user_onboarding.find_one({'user_id': user['id']})
    onboarding_complete = onboarding.get('completed', False) if onboarding else False
    
    token = create_token(user['id'], user['email'], user['role'])
    return {
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'is_approved': user['is_approved'],
            'onboarding_complete': onboarding_complete
        }
    }

@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    onboarding = await db.user_onboarding.find_one({'user_id': user['id']})
    onboarding_complete = onboarding.get('completed', False) if onboarding else False
    
    return UserResponse(
        id=user['id'],
        email=user['email'],
        name=user['name'],
        role=user['role'],
        is_approved=user['is_approved'],
        created_at=user['created_at'],
        onboarding_complete=onboarding_complete
    )

@router.get("/auth/onboarding-status")
async def get_onboarding_status(user: dict = Depends(get_current_user)):
    onboarding = await db.user_onboarding.find_one({'user_id': user['id']})
    return {
        'completed': onboarding.get('completed', False) if onboarding else False,
        'steps_completed': onboarding.get('steps_completed', []) if onboarding else [],
        'role': user['role']
    }

@router.post("/auth/onboarding-complete")
async def complete_onboarding(user: dict = Depends(get_current_user)):
    await db.user_onboarding.update_one(
        {'user_id': user['id']},
        {'$set': {'completed': True, 'completed_at': datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {'message': 'Onboarding completed'}

@router.post("/auth/onboarding-step")
async def complete_onboarding_step(step: str = Query(...), user: dict = Depends(get_current_user)):
    await db.user_onboarding.update_one(
        {'user_id': user['id']},
        {'$addToSet': {'steps_completed': step}},
        upsert=True
    )
    return {'message': f'Step {step} completed'}
