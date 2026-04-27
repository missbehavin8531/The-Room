"""
Test course_type field persistence and return in GET/POST/PUT /api/courses
Iteration 43: Tests for new course_type field (scheduled, self_paced, hybrid)
"""
import os
import pytest
import requests
from pathlib import Path

# Load REACT_APP_BACKEND_URL from frontend/.env
def _load_backend_url():
    val = os.environ.get('REACT_APP_BACKEND_URL', '')
    if val:
        return val.rstrip('/')
    env_file = Path(__file__).resolve().parents[2] / 'frontend' / '.env'
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.split('=', 1)[1].strip().rstrip('/')
    return ''

BASE_URL = _load_backend_url()
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    }, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestCourseType:
    """Tests for course_type field (scheduled/self_paced/hybrid)"""

    def test_get_courses_returns_course_type(self, headers):
        r = requests.get(f"{BASE_URL}/api/courses", headers=headers, timeout=15)
        assert r.status_code == 200
        courses = r.json()
        assert isinstance(courses, list)
        if courses:
            for c in courses:
                assert "course_type" in c, f"course_type missing from course {c.get('id')}"
                assert c["course_type"] in ("scheduled", "self_paced", "hybrid"), \
                    f"invalid course_type: {c['course_type']}"

    def test_create_course_with_self_paced(self, headers):
        payload = {
            "title": "TEST_SelfPacedCourse",
            "description": "Testing self-paced course type",
            "is_published": False,
            "unlock_type": "sequential",
            "course_type": "self_paced",
        }
        r = requests.post(f"{BASE_URL}/api/courses", headers=headers, json=payload, timeout=15)
        assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
        created = r.json()
        course_id = created["id"]
        # Assert response carries our course_type
        assert created.get("course_type") == "self_paced", \
            f"POST response returned course_type={created.get('course_type')} (expected self_paced)"

        # GET to verify persistence
        g = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers=headers, timeout=15)
        assert g.status_code == 200
        fetched = g.json()
        assert fetched.get("course_type") == "self_paced", \
            f"GET by id returned course_type={fetched.get('course_type')} (expected self_paced). BUG: course_type not persisted."

        # Also confirm in list
        lr = requests.get(f"{BASE_URL}/api/courses", headers=headers, timeout=15)
        found = next((c for c in lr.json() if c["id"] == course_id), None)
        assert found is not None
        assert found.get("course_type") == "self_paced", \
            f"GET list returned course_type={found.get('course_type')} (expected self_paced). BUG: $project missing course_type."

        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=headers, timeout=15)

    def test_create_course_with_hybrid(self, headers):
        payload = {
            "title": "TEST_HybridCourse",
            "description": "Testing hybrid course",
            "course_type": "hybrid",
        }
        r = requests.post(f"{BASE_URL}/api/courses", headers=headers, json=payload, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        g = requests.get(f"{BASE_URL}/api/courses/{cid}", headers=headers, timeout=15)
        assert g.json().get("course_type") == "hybrid", \
            f"hybrid not persisted: got {g.json().get('course_type')}"
        requests.delete(f"{BASE_URL}/api/courses/{cid}", headers=headers, timeout=15)

    def test_update_course_type(self, headers):
        # create scheduled, update to self_paced
        create = requests.post(f"{BASE_URL}/api/courses", headers=headers, json={
            "title": "TEST_UpdateType", "description": "x", "course_type": "scheduled"
        }, timeout=15)
        cid = create.json()["id"]
        upd = requests.put(f"{BASE_URL}/api/courses/{cid}", headers=headers,
                           json={"course_type": "self_paced"}, timeout=15)
        assert upd.status_code == 200
        g = requests.get(f"{BASE_URL}/api/courses/{cid}", headers=headers, timeout=15)
        assert g.json().get("course_type") == "self_paced", \
            f"update didn't persist: {g.json().get('course_type')}"
        requests.delete(f"{BASE_URL}/api/courses/{cid}", headers=headers, timeout=15)

    def test_default_course_type_is_scheduled(self, headers):
        # Create without course_type field
        payload = {"title": "TEST_DefaultType", "description": "x"}
        r = requests.post(f"{BASE_URL}/api/courses", headers=headers, json=payload, timeout=15)
        assert r.status_code == 200
        cid = r.json()["id"]
        g = requests.get(f"{BASE_URL}/api/courses/{cid}", headers=headers, timeout=15)
        assert g.json().get("course_type") == "scheduled"
        requests.delete(f"{BASE_URL}/api/courses/{cid}", headers=headers, timeout=15)
