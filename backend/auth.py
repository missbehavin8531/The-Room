from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import BackgroundTasks
from datetime import datetime, timezone, timedelta
from typing import List
import bcrypt
import jwt
import uuid

from database import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from models import UserCreate, UserLogin, UserResponse
from pydantic import BaseModel
from services.email_service import email_service

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
    
    church_id = None
    church_name = None
    role = 'member'
    is_approved = False

    # Join existing church via invite code
    if data.invite_code:
        church = await db.churches.find_one({'invite_code': data.invite_code}, {'_id': 0})
        if not church:
            raise HTTPException(status_code=400, detail="Invalid invite code")
        church_id = church['id']
        church_name = church['name']
    # Create a new church
    elif data.church_name:
        import secrets
        church_id = str(uuid.uuid4())
        invite_code = secrets.token_urlsafe(6).upper()[:8]
        church = {
            'id': church_id,
            'name': data.church_name,
            'description': '',
            'invite_code': invite_code,
            'created_by': None,  # Will be updated below
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.churches.insert_one(church)
        church_name = data.church_name
        role = 'admin'
        is_approved = True

    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'email': data.email,
        'name': data.name,
        'password': hash_password(data.password),
        'role': role,
        'is_approved': is_approved,
        'is_muted': False,
        'church_id': church_id,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)

    # Update church created_by if new church was created
    if data.church_name and church_id:
        await db.churches.update_one({'id': church_id}, {'$set': {'created_by': user_id}})

    msg = 'Registration successful!'
    if role == 'admin':
        msg = 'Registration successful! You are the admin of your new church.'
    elif not is_approved:
        msg = 'Registration successful. Please wait for admin approval.'

    return {'message': msg, 'user_id': user_id, 'church_id': church_id, 'church_name': church_name}

@router.post("/auth/login", response_model=dict)
async def login(data: UserLogin):
    user = await db.users.find_one({'email': data.email}, {'_id': 0})
    if not user or not verify_password(data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    onboarding = await db.user_onboarding.find_one({'user_id': user['id']})
    onboarding_complete = onboarding.get('completed', False) if onboarding else False
    
    church_name = None
    church_id = user.get('church_id')
    if church_id:
        church = await db.churches.find_one({'id': church_id}, {'_id': 0, 'name': 1})
        if church:
            church_name = church['name']
    
    token = create_token(user['id'], user['email'], user['role'])
    return {
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'is_approved': user['is_approved'],
            'onboarding_complete': onboarding_complete,
            'church_id': church_id,
            'church_name': church_name
        }
    }

@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    onboarding = await db.user_onboarding.find_one({'user_id': user['id']})
    onboarding_complete = onboarding.get('completed', False) if onboarding else False
    
    church_name = None
    church_id = user.get('church_id')
    if church_id:
        church = await db.churches.find_one({'id': church_id}, {'_id': 0, 'name': 1})
        if church:
            church_name = church['name']
    
    return UserResponse(
        id=user['id'],
        email=user['email'],
        name=user['name'],
        role=user['role'],
        is_approved=user['is_approved'],
        created_at=user['created_at'],
        onboarding_complete=onboarding_complete,
        church_id=church_id,
        church_name=church_name
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


# ============== PROFILE UPDATES ==============

class UpdateNameRequest(BaseModel):
    name: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.put("/auth/update-name")
async def update_name(data: UpdateNameRequest, user: dict = Depends(get_current_user)):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    await db.users.update_one({'id': user['id']}, {'$set': {'name': data.name.strip()}})
    return {'message': 'Name updated successfully', 'name': data.name.strip()}

@router.put("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    full_user = await db.users.find_one({'id': user['id']}, {'_id': 0})
    if not verify_password(data.current_password, full_user['password']):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    await db.users.update_one({'id': user['id']}, {'$set': {'password': hash_password(data.new_password)}})
    return {'message': 'Password changed successfully'}


# ============== PASSWORD RESET ==============

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

@router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    user = await db.users.find_one({'email': data.email}, {'_id': 0})
    # Always return success to avoid email enumeration
    if not user:
        return {'message': 'If an account with that email exists, a reset link has been sent.'}
    
    # Generate reset token (JWT with short expiry)
    reset_token = jwt.encode(
        {
            'user_id': user['id'],
            'email': user['email'],
            'purpose': 'password_reset',
            'exp': datetime.now(timezone.utc) + timedelta(hours=1)
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    # Store token in DB for single-use validation
    await db.password_resets.update_one(
        {'user_id': user['id']},
        {'$set': {
            'user_id': user['id'],
            'token': reset_token,
            'used': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Send reset email
    reset_content = f"""
    <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
    <p style="color: #555; line-height: 1.6;">Hi {user['name']},</p>
    <p style="color: #555; line-height: 1.6;">
        We received a request to reset your password. Use the code below on the reset page:
    </p>
    <div style="background-color: #f9f9f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #333; font-size: 24px; font-weight: 700; letter-spacing: 2px; font-family: monospace;">
            {reset_token[:8].upper()}
        </p>
    </div>
    <p style="color: #555; line-height: 1.6;">
        Or click the button below to reset your password:
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="javascript:void(0)" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Reset Password
        </a>
    </div>
    <p style="color: #888; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    """
    
    background_tasks.add_task(
        email_service.send_email,
        user['email'],
        'Password Reset - The Room',
        email_service.get_base_template(reset_content)
    )
    
    # Return token directly for the app's reset flow
    return {'message': 'If an account with that email exists, a reset link has been sent.', 'reset_token': reset_token}

@router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    # Validate the token
    try:
        payload = jwt.decode(data.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('purpose') != 'password_reset':
            raise HTTPException(status_code=400, detail="Invalid reset token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    # Check token hasn't been used
    reset_record = await db.password_resets.find_one({
        'user_id': payload['user_id'],
        'token': data.token,
        'used': False
    })
    if not reset_record:
        raise HTTPException(status_code=400, detail="This reset link has already been used or is invalid.")
    
    # Validate password length
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    new_hash = hash_password(data.password)
    await db.users.update_one(
        {'id': payload['user_id']},
        {'$set': {'password': new_hash}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {'token': data.token},
        {'$set': {'used': True}}
    )
    
    return {'message': 'Password has been reset successfully. You can now log in with your new password.'}
