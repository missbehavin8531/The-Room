"""
Backend API Tests for Sunday School Lesson-Centric Flow
Tests: Authentication, Lessons, Teacher Prompts, Prompt Replies, Attendance
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MEMBER_CREDS = {"email": "member@sundayschool.com", "password": "member123"}
TEACHER_CREDS = {"email": "teacher@sundayschool.com", "password": "teacher123"}
ADMIN_CREDS = {"email": "admin@sundayschool.com", "password": "admin123"}


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_member_login_success(self):
        """Test member login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEMBER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == MEMBER_CREDS["email"]
        assert data["user"]["role"] == "member"
        assert data["user"]["is_approved"] == True
    
    def test_teacher_login_success(self):
        """Test teacher login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEACHER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "teacher"
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
    
    def test_get_me_authenticated(self):
        """Test /auth/me endpoint with valid token"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=MEMBER_CREDS)
        token = login_res.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == MEMBER_CREDS["email"]


class TestLessons:
    """Lesson endpoints tests"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEMBER_CREDS)
        return response.json()["token"]
    
    def test_get_next_lesson(self, member_token):
        """Test getting next/upcoming lesson"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/next/upcoming",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should return a lesson with required fields
        assert "id" in data
        assert "title" in data
        assert "description" in data
        # New lesson-centric fields
        assert "prompts" in data  # Teacher prompts
        assert "user_attendance" in data  # User's attendance actions
    
    def test_get_lesson_by_id(self, member_token):
        """Test getting a specific lesson by ID"""
        # First get the next lesson to get an ID
        next_res = requests.get(
            f"{BASE_URL}/api/lessons/next/upcoming",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        lesson_id = next_res.json()["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/lessons/{lesson_id}",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == lesson_id
        # Check for teacher_notes and reading_plan fields
        assert "teacher_notes" in data or data.get("teacher_notes") is None
        assert "reading_plan" in data or data.get("reading_plan") is None
    
    def test_get_all_lessons(self, member_token):
        """Test getting all lessons"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/all",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTeacherPrompts:
    """Teacher prompts endpoints tests"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEMBER_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def teacher_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEACHER_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def lesson_id(self, member_token):
        response = requests.get(
            f"{BASE_URL}/api/lessons/next/upcoming",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        return response.json()["id"]
    
    def test_get_lesson_prompts(self, member_token, lesson_id):
        """Test getting prompts for a lesson"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{lesson_id}/prompts",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # If prompts exist, verify structure
        if len(data) > 0:
            prompt = data[0]
            assert "id" in prompt
            assert "question" in prompt
            assert "order" in prompt
    
    def test_prompts_included_in_lesson_response(self, member_token, lesson_id):
        """Test that prompts are included in lesson detail response"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{lesson_id}",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "prompts" in data
        assert isinstance(data["prompts"], list)


class TestPromptReplies:
    """Prompt replies endpoints tests"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEMBER_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def teacher_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEACHER_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def prompt_id(self, member_token):
        # Get lesson first
        lesson_res = requests.get(
            f"{BASE_URL}/api/lessons/next/upcoming",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        lesson_id = lesson_res.json()["id"]
        
        # Get prompts
        prompts_res = requests.get(
            f"{BASE_URL}/api/lessons/{lesson_id}/prompts",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        prompts = prompts_res.json()
        if len(prompts) > 0:
            return prompts[0]["id"]
        pytest.skip("No prompts available for testing")
    
    def test_get_prompt_replies(self, member_token, prompt_id):
        """Test getting replies for a prompt"""
        response = requests.get(
            f"{BASE_URL}/api/prompts/{prompt_id}/replies",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_submit_reply_to_prompt(self, member_token, prompt_id):
        """Test submitting a reply to a prompt"""
        response = requests.post(
            f"{BASE_URL}/api/prompts/{prompt_id}/reply",
            json={"content": "TEST_reply_content_from_automated_test"},
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["content"] == "TEST_reply_content_from_automated_test"
        assert "user_name" in data
        assert "created_at" in data
        
        # Verify reply appears in replies list
        replies_res = requests.get(
            f"{BASE_URL}/api/prompts/{prompt_id}/replies",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        replies = replies_res.json()
        reply_ids = [r["id"] for r in replies]
        assert data["id"] in reply_ids


class TestAttendance:
    """Attendance endpoints tests"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEMBER_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def lesson_id(self, member_token):
        response = requests.get(
            f"{BASE_URL}/api/lessons/next/upcoming",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        return response.json()["id"]
    
    def test_record_attendance_joined_live(self, member_token, lesson_id):
        """Test recording 'joined_live' attendance"""
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            json={"lesson_id": lesson_id, "action": "joined_live"},
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "joined_live"
        assert data["lesson_id"] == lesson_id
    
    def test_record_attendance_watched_replay(self, member_token, lesson_id):
        """Test recording 'watched_replay' attendance"""
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            json={"lesson_id": lesson_id, "action": "watched_replay"},
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "watched_replay"
    
    def test_record_attendance_viewed_slides(self, member_token, lesson_id):
        """Test recording 'viewed_slides' attendance"""
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            json={"lesson_id": lesson_id, "action": "viewed_slides"},
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "viewed_slides"
    
    def test_record_attendance_marked_attended(self, member_token, lesson_id):
        """Test recording 'marked_attended' attendance"""
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            json={"lesson_id": lesson_id, "action": "marked_attended"},
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["action"] == "marked_attended"
    
    def test_get_my_attendance(self, member_token, lesson_id):
        """Test getting current user's attendance for a lesson"""
        response = requests.get(
            f"{BASE_URL}/api/attendance/my/{lesson_id}",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data
        assert isinstance(data["actions"], list)
    
    def test_attendance_included_in_lesson_response(self, member_token, lesson_id):
        """Test that user_attendance is included in lesson detail"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{lesson_id}",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_attendance" in data
        assert isinstance(data["user_attendance"], list)


class TestCourses:
    """Course endpoints tests"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEMBER_CREDS)
        return response.json()["token"]
    
    def test_get_courses(self, member_token):
        """Test getting all courses"""
        response = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            course = data[0]
            assert "id" in course
            assert "title" in course
            assert "zoom_link" in course or course.get("zoom_link") is None
    
    def test_get_course_by_id(self, member_token):
        """Test getting a specific course"""
        # First get courses list
        courses_res = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        courses = courses_res.json()
        if len(courses) == 0:
            pytest.skip("No courses available")
        
        course_id = courses[0]["id"]
        response = requests.get(
            f"{BASE_URL}/api/courses/{course_id}",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == course_id


class TestChat:
    """Chat endpoints tests"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEMBER_CREDS)
        return response.json()["token"]
    
    def test_get_chat_messages(self, member_token):
        """Test getting chat messages"""
        response = requests.get(
            f"{BASE_URL}/api/chat",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_send_chat_message(self, member_token):
        """Test sending a chat message"""
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json={"content": "TEST_chat_message_from_automated_test"},
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["content"] == "TEST_chat_message_from_automated_test"


class TestLessonResources:
    """Lesson resources endpoints tests"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MEMBER_CREDS)
        return response.json()["token"]
    
    @pytest.fixture
    def lesson_id(self, member_token):
        response = requests.get(
            f"{BASE_URL}/api/lessons/next/upcoming",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        return response.json()["id"]
    
    def test_resources_included_in_lesson(self, member_token, lesson_id):
        """Test that resources are included in lesson detail"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{lesson_id}",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "resources" in data
        assert isinstance(data["resources"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
