"""
Tests for Input Validation & Moderation:
- HTML/XSS sanitization (strip HTML/script tags)
- Max-length truncation across endpoints
- Chat rate limit (10 messages / 30 seconds, 429 on 11th)
"""
import os
import time
import uuid
import pytest
import requests

def _load_backend_url():
    url = os.environ.get('REACT_APP_BACKEND_URL')
    if not url:
        try:
            with open('/app/frontend/.env', 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.split('=', 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not configured")
    return url.rstrip('/')


BASE_URL = _load_backend_url()

ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"


# ------------------ Fixtures ------------------

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=20,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_user(admin_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def a_lesson_id(admin_headers):
    """Find a lesson id (any lesson) for posting comments."""
    r = requests.get(f"{BASE_URL}/api/courses", headers=admin_headers, timeout=15)
    if r.status_code != 200:
        pytest.skip("Cannot list courses")
    for c in r.json():
        cid = c.get("id")
        if not cid:
            continue
        lr = requests.get(f"{BASE_URL}/api/courses/{cid}/lessons", headers=admin_headers, timeout=15)
        if lr.status_code == 200:
            for lesson in lr.json():
                if lesson.get("id"):
                    return lesson["id"]
    pytest.skip("No lessons available for comment test")


def _wait_for_rate_window():
    """Sleep just over the 30 sec window so chat counter resets."""
    time.sleep(31)


# ------------------ Sanitization: chat ------------------

class TestChatSanitization:
    def test_chat_strips_html_tags(self, admin_headers):
        _wait_for_rate_window()  # fresh window to avoid 429
        payload = {"content": "<b>Hello</b> <i>world</i>"}
        r = requests.post(f"{BASE_URL}/api/chat", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "<" not in data["content"]
        assert "Hello" in data["content"] and "world" in data["content"]

    def test_chat_strips_script_tag(self, admin_headers):
        payload = {"content": "<script>alert(1)</script>text"}
        r = requests.post(f"{BASE_URL}/api/chat", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        # script block fully removed, leaving only "text"
        assert r.json()["content"] == "text"

    def test_chat_truncates_to_1000_chars(self, admin_headers):
        payload = {"content": "A" * 1050}
        r = requests.post(f"{BASE_URL}/api/chat", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        assert len(r.json()["content"]) == 1000


# ------------------ Sanitization: chat edit ------------------

class TestChatEditSanitization:
    def test_chat_edit_strips_html(self, admin_headers):
        # Create a message first
        create = requests.post(
            f"{BASE_URL}/api/chat",
            json={"content": "original message"},
            headers=admin_headers,
            timeout=15,
        )
        assert create.status_code == 200, create.text
        msg_id = create.json()["id"]

        edit = requests.put(
            f"{BASE_URL}/api/chat/{msg_id}/edit",
            json={"content": "<p>edited <script>alert(1)</script>content</p>"},
            headers=admin_headers,
            timeout=15,
        )
        assert edit.status_code == 200, edit.text
        body = edit.json()
        assert "<" not in body["content"]
        assert "alert(1)" not in body["content"]
        assert "edited" in body["content"] and "content" in body["content"]


# ------------------ Sanitization: private messages ------------------

class TestPrivateMessageSanitization:
    def test_message_strips_html(self, admin_headers, admin_user):
        payload = {
            "teacher_id": admin_user["id"],
            "content": "<b>Hello</b> teacher <script>x()</script>",
        }
        r = requests.post(f"{BASE_URL}/api/messages", json=payload, headers=admin_headers, timeout=15)
        # Backend currently does NOT call sanitize_text on send_private_message; verify behavior:
        assert r.status_code == 200, r.text
        # Validate behavior - we expect sanitization. If not, this asserts the bug.
        assert "<" not in r.json()["content"], (
            "Private message endpoint did NOT strip HTML tags - sanitize missing"
        )

    def test_message_truncates_to_2000(self, admin_headers, admin_user):
        payload = {"teacher_id": admin_user["id"], "content": "B" * 2500}
        r = requests.post(f"{BASE_URL}/api/messages", json=payload, headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        assert len(r.json()["content"]) == 2000, (
            f"Expected truncation to 2000, got {len(r.json()['content'])}"
        )


# ------------------ Sanitization: comments ------------------

class TestCommentSanitization:
    def test_comment_strips_html(self, admin_headers, a_lesson_id):
        payload = {"content": "<div>Nice</div> <script>bad()</script> lesson"}
        r = requests.post(
            f"{BASE_URL}/api/lessons/{a_lesson_id}/comments",
            json=payload,
            headers=admin_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        c = r.json()["content"]
        assert "<" not in c
        assert "bad()" not in c
        assert "Nice" in c and "lesson" in c


# ------------------ Sanitization: courses ------------------

class TestCourseSanitization:
    def test_course_title_truncated_and_desc_stripped(self, admin_headers):
        long_title = "T" * 250
        payload = {
            "title": long_title,
            "description": "<p>Cool</p> <script>e()</script> course",
            "category": "general",
        }
        r = requests.post(f"{BASE_URL}/api/courses", json=payload, headers=admin_headers, timeout=20)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert len(body["title"]) == 200, f"title len {len(body['title'])}"
        assert "<" not in body["description"]
        assert "Cool" in body["description"] and "course" in body["description"]

        # Cleanup
        cid = body.get("id")
        if cid:
            requests.delete(f"{BASE_URL}/api/courses/{cid}", headers=admin_headers, timeout=15)


# ------------------ Rate Limiting ------------------

class TestChatRateLimiting:
    def test_rate_limit_triggers_after_10_messages(self, admin_headers):
        _wait_for_rate_window()  # ensure clean 30s window

        statuses = []
        for i in range(11):
            r = requests.post(
                f"{BASE_URL}/api/chat",
                json={"content": f"rate test {i} {uuid.uuid4().hex[:6]}"},
                headers=admin_headers,
                timeout=15,
            )
            statuses.append(r.status_code)

        # First 10 expected 200; 11th expected 429
        first_10 = statuses[:10]
        eleventh = statuses[10]
        assert all(s == 200 for s in first_10), f"First 10 not all 200: {statuses}"
        assert eleventh == 429, f"11th status was {eleventh} (full: {statuses})"
