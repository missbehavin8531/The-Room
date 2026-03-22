"""
Test suite to validate all API endpoints after server.py refactoring.
Tests that all endpoints work correctly after splitting monolithic server.py into modular files.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEACHER_EMAIL = "teacher@theroom.com"
TEACHER_PASSWORD = "teacher123"
MEMBER_EMAIL = "member@theroom.com"
MEMBER_PASSWORD = "member123"


class TestAPIRoot:
    """Test API root endpoint"""
    
    def test_api_root(self):
        """Test that API root returns correct response"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "The Room API"
        assert data["version"] == "1.0.0"
        print("✓ API root endpoint working")


class TestAuthentication:
    """Test authentication endpoints from auth.py"""
    
    def test_teacher_login(self):
        """Test teacher login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEACHER_EMAIL
        assert data["user"]["role"] == "teacher"
        print("✓ Teacher login working")
    
    def test_member_login(self):
        """Test member login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == MEMBER_EMAIL
        assert data["user"]["role"] == "member"
        print("✓ Member login working")
    
    def test_invalid_login(self):
        """Test invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login returns 401")
    
    def test_get_me(self):
        """Test GET /api/auth/me returns user info"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEACHER_EMAIL
        assert data["role"] == "teacher"
        assert "id" in data
        assert "name" in data
        print("✓ GET /api/auth/me working")


class TestCourses:
    """Test course endpoints from routes/courses.py"""
    
    @pytest.fixture
    def teacher_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_courses(self, teacher_token):
        """Test GET /api/courses returns course list"""
        response = requests.get(f"{BASE_URL}/api/courses", headers={
            "Authorization": f"Bearer {teacher_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            course = data[0]
            assert "id" in course
            assert "title" in course
            assert "lesson_count" in course
            assert "enrollment_count" in course
            assert "is_enrolled" in course
        print(f"✓ GET /api/courses returns {len(data)} courses")
    
    def test_get_course_by_id(self, teacher_token):
        """Test GET /api/courses/{id} returns single course"""
        # First get courses list
        courses_resp = requests.get(f"{BASE_URL}/api/courses", headers={
            "Authorization": f"Bearer {teacher_token}"
        })
        courses = courses_resp.json()
        
        if len(courses) > 0:
            course_id = courses[0]["id"]
            response = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers={
                "Authorization": f"Bearer {teacher_token}"
            })
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == course_id
            assert "title" in data
            assert "description" in data
            print(f"✓ GET /api/courses/{course_id[:8]}... working")
        else:
            pytest.skip("No courses available to test")


class TestLessons:
    """Test lesson endpoints from routes/lessons.py"""
    
    @pytest.fixture
    def teacher_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_course_lessons(self, teacher_token):
        """Test GET /api/courses/{course_id}/lessons returns lessons"""
        # First get courses
        courses_resp = requests.get(f"{BASE_URL}/api/courses", headers={
            "Authorization": f"Bearer {teacher_token}"
        })
        courses = courses_resp.json()
        
        if len(courses) > 0:
            course_id = courses[0]["id"]
            response = requests.get(f"{BASE_URL}/api/courses/{course_id}/lessons", headers={
                "Authorization": f"Bearer {teacher_token}"
            })
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            if len(data) > 0:
                lesson = data[0]
                assert "id" in lesson
                assert "title" in lesson
                assert "resources" in lesson
                assert "prompts" in lesson
            print(f"✓ GET /api/courses/{course_id[:8]}../lessons returns {len(data)} lessons")
        else:
            pytest.skip("No courses available")
    
    def test_get_lesson_by_id(self, teacher_token):
        """Test GET /api/lessons/{id} returns single lesson"""
        # Get courses and lessons
        courses_resp = requests.get(f"{BASE_URL}/api/courses", headers={
            "Authorization": f"Bearer {teacher_token}"
        })
        courses = courses_resp.json()
        
        if len(courses) > 0:
            course_id = courses[0]["id"]
            lessons_resp = requests.get(f"{BASE_URL}/api/courses/{course_id}/lessons", headers={
                "Authorization": f"Bearer {teacher_token}"
            })
            lessons = lessons_resp.json()
            
            if len(lessons) > 0:
                lesson_id = lessons[0]["id"]
                response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers={
                    "Authorization": f"Bearer {teacher_token}"
                })
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == lesson_id
                assert "title" in data
                assert "resources" in data
                assert "prompts" in data
                print(f"✓ GET /api/lessons/{lesson_id[:8]}... working")
            else:
                pytest.skip("No lessons available")
        else:
            pytest.skip("No courses available")
    
    def test_mark_lesson_complete(self, member_token):
        """Test POST /api/lessons/{id}/complete marks lesson complete"""
        # Get courses and lessons
        courses_resp = requests.get(f"{BASE_URL}/api/courses", headers={
            "Authorization": f"Bearer {member_token}"
        })
        courses = courses_resp.json()
        
        if len(courses) > 0:
            course_id = courses[0]["id"]
            lessons_resp = requests.get(f"{BASE_URL}/api/courses/{course_id}/lessons", headers={
                "Authorization": f"Bearer {member_token}"
            })
            lessons = lessons_resp.json()
            
            if len(lessons) > 0:
                lesson_id = lessons[0]["id"]
                response = requests.post(f"{BASE_URL}/api/lessons/{lesson_id}/complete", headers={
                    "Authorization": f"Bearer {member_token}"
                })
                # Should be 200 whether already completed or newly completed
                assert response.status_code == 200
                data = response.json()
                assert "message" in data
                print(f"✓ POST /api/lessons/{lesson_id[:8]}../complete working")
            else:
                pytest.skip("No lessons available")
        else:
            pytest.skip("No courses available")


class TestSearch:
    """Test search endpoint from routes/notifications.py"""
    
    @pytest.fixture
    def teacher_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        return response.json()["token"]
    
    def test_search_gospel(self, teacher_token):
        """Test GET /api/search?q=gospel returns results"""
        response = requests.get(f"{BASE_URL}/api/search?q=gospel", headers={
            "Authorization": f"Bearer {teacher_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "courses" in data
        assert "lessons" in data
        assert "discussions" in data
        print(f"✓ GET /api/search?q=gospel returns courses:{len(data['courses'])}, lessons:{len(data['lessons'])}, discussions:{len(data['discussions'])}")
    
    def test_search_requires_auth(self):
        """Test search requires authentication"""
        response = requests.get(f"{BASE_URL}/api/search?q=test")
        assert response.status_code in [401, 403]
        print("✓ Search requires authentication")


class TestProgress:
    """Test progress endpoints from routes/progress.py"""
    
    @pytest.fixture
    def teacher_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_my_progress(self, member_token):
        """Test GET /api/my-progress returns progress with streak_days"""
        response = requests.get(f"{BASE_URL}/api/my-progress", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "streak_days" in data
        assert "total_lessons_completed" in data
        assert "courses" in data
        print(f"✓ GET /api/my-progress returns streak_days:{data['streak_days']}, completed:{data['total_lessons_completed']}")
    
    def test_get_student_progress_teacher_only(self, teacher_token, member_token):
        """Test GET /api/teacher/student-progress is teacher only"""
        # Teacher should have access
        response = requests.get(f"{BASE_URL}/api/teacher/student-progress", headers={
            "Authorization": f"Bearer {teacher_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "students" in data
        print(f"✓ GET /api/teacher/student-progress returns {len(data['students'])} students")
        
        # Member should be denied
        response = requests.get(f"{BASE_URL}/api/teacher/student-progress", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert response.status_code == 403
        print("✓ Member denied access to student-progress (403)")


class TestAttendance:
    """Test attendance endpoints from routes/attendance.py"""
    
    @pytest.fixture
    def teacher_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_attendance_summary(self, teacher_token):
        """Test GET /api/attendance/summary returns summary"""
        response = requests.get(f"{BASE_URL}/api/attendance/summary", headers={
            "Authorization": f"Bearer {teacher_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_members" in data
        assert "total_lessons" in data
        assert "total_attendance_records" in data
        print(f"✓ GET /api/attendance/summary returns members:{data['total_members']}, lessons:{data['total_lessons']}")
    
    def test_get_attendance_report(self, teacher_token):
        """Test GET /api/attendance/report returns report"""
        response = requests.get(f"{BASE_URL}/api/attendance/report", headers={
            "Authorization": f"Bearer {teacher_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "report" in data
        print(f"✓ GET /api/attendance/report returns {len(data['report'])} records")


class TestPushNotifications:
    """Test push notification endpoints from routes/notifications.py"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_vapid_public_key(self):
        """Test GET /api/push/vapid-public-key returns VAPID key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert response.status_code == 200
        data = response.json()
        assert "publicKey" in data
        print(f"✓ GET /api/push/vapid-public-key returns key (length: {len(data['publicKey'])})")
    
    def test_get_reading_reminder_settings(self, member_token):
        """Test GET /api/reading-reminders/settings returns settings"""
        response = requests.get(f"{BASE_URL}/api/reading-reminders/settings", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "reminder_time" in data
        print(f"✓ GET /api/reading-reminders/settings returns enabled:{data['enabled']}")


class TestChat:
    """Test chat endpoints from routes/social.py"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_chat_messages(self, member_token):
        """Test GET /api/chat returns chat messages"""
        response = requests.get(f"{BASE_URL}/api/chat", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            msg = data[0]
            assert "id" in msg
            assert "content" in msg
            assert "user_name" in msg
        print(f"✓ GET /api/chat returns {len(data)} messages")
    
    def test_post_chat_message(self, member_token):
        """Test POST /api/chat sends message"""
        response = requests.post(f"{BASE_URL}/api/chat", 
            json={"content": "TEST_refactoring_test_message"},
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["content"] == "TEST_refactoring_test_message"
        print("✓ POST /api/chat sends message successfully")


class TestMessages:
    """Test private messages endpoints from routes/social.py"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_inbox(self, member_token):
        """Test GET /api/messages/inbox returns messages"""
        response = requests.get(f"{BASE_URL}/api/messages/inbox", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/messages/inbox returns {len(data)} messages")


class TestFeedback:
    """Test feedback endpoints from routes/prompts.py"""
    
    @pytest.fixture
    def member_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_my_feedback(self, member_token):
        """Test GET /api/my-feedback returns private feedback"""
        response = requests.get(f"{BASE_URL}/api/my-feedback", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/my-feedback returns {len(data)} feedback items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
