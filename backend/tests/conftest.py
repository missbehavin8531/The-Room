"""Shared test configuration — credentials loaded from environment or .env file."""
import os
from dotenv import load_dotenv

# Load .env files
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
_fe_env = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', '.env')
if os.path.exists(_fe_env):
    load_dotenv(_fe_env)

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'kirah092804@gmail.com')
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'sZ3Og1s$f&ki')

TEACHER_PASSWORD = os.environ.get('TEST_TEACHER_PASSWORD', 'teacher123')
MEMBER_PASSWORD = os.environ.get('TEST_MEMBER_PASSWORD', 'member123')
