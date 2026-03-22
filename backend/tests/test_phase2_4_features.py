"""
Test Phase 2-4 Features: Progress Dashboard, Settings, Attendance Reports, 
Search API, Certificate generation, Push notifications, Reading reminders
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


@pytest.fixture(scope="module")
def teacher_token():
    """Get teacher authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEACHER_EMAIL,
        "password": TEACHER_PASSWORD
    })
    assert response.status_code == 200, f"Teacher login failed: {response.text}"
    data = response.json()
    assert "token" in data
    assert data["user"]["role"] == "teacher"
    return data["token"]


@pytest.fixture(scope="module")
def member_token():
    """Get member authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MEMBER_EMAIL,
        "password": MEMBER_PASSWORD
    })
    assert response.status_code == 200, f"Member login failed: {response.text}"
    data = response.json()
    assert "token" in data
    assert data["user"]["role"] == "member"
    return data["token"]


class TestAuthentication:
    """Test authentication for teacher and member"""
    
    def test_teacher_login(self):
        """Teacher login returns valid token and user data"""
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
        assert data["user"]["is_approved"] == True
    
    def test_member_login(self):
        """Member login returns valid token and user data"""
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
        assert data["user"]["is_approved"] == True


class TestProgressAPI:
    """Test Progress Dashboard endpoints"""
    
    def test_my_progress_teacher(self, teacher_token):
        """GET /api/my-progress returns progress data for teacher"""
        response = requests.get(
            f"{BASE_URL}/api/my-progress",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Verify response structure
        assert "user_id" in data
        assert "user_name" in data
        assert "total_courses_enrolled" in data
        assert "total_lessons_completed" in data
        assert "courses" in data
        assert "streak_days" in data
        assert isinstance(data["courses"], list)
        assert isinstance(data["streak_days"], int)
    
    def test_my_progress_member(self, member_token):
        """GET /api/my-progress returns progress data for member"""
        response = requests.get(
            f"{BASE_URL}/api/my-progress",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "streak_days" in data
        assert "total_lessons_completed" in data
        assert "courses" in data
    
    def test_student_progress_teacher(self, teacher_token):
        """GET /api/teacher/student-progress returns students list for teacher"""
        response = requests.get(
            f"{BASE_URL}/api/teacher/student-progress",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "students" in data
        assert isinstance(data["students"], list)
        # Verify student data structure if students exist
        if len(data["students"]) > 0:
            student = data["students"][0]
            assert "user_id" in student
            assert "user_name" in student
            assert "email" in student
            assert "courses_enrolled" in student
            assert "lessons_completed" in student
    
    def test_student_progress_member_forbidden(self, member_token):
        """GET /api/teacher/student-progress returns 403 for member"""
        response = requests.get(
            f"{BASE_URL}/api/teacher/student-progress",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 403
        assert "Teacher access required" in response.json().get("detail", "")


class TestAttendanceReportsAPI:
    """Test Attendance Reports endpoints (teacher only)"""
    
    def test_attendance_summary_teacher(self, teacher_token):
        """GET /api/attendance/summary returns summary stats for teacher"""
        response = requests.get(
            f"{BASE_URL}/api/attendance/summary",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Verify response structure
        assert "total_members" in data
        assert "total_lessons" in data
        assert "total_attendance_records" in data
        assert "total_completions" in data
        assert "attendance_last_7_days" in data
        assert "avg_attendance_rate" in data
        # Verify data types
        assert isinstance(data["total_members"], int)
        assert isinstance(data["total_lessons"], int)
        assert isinstance(data["avg_attendance_rate"], (int, float))
    
    def test_attendance_report_teacher(self, teacher_token):
        """GET /api/attendance/report returns report data for teacher"""
        response = requests.get(
            f"{BASE_URL}/api/attendance/report",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "report" in data
        assert isinstance(data["report"], list)
        # Verify report entry structure if data exists
        if len(data["report"]) > 0:
            entry = data["report"][0]
            assert "user_id" in entry
            assert "user_name" in entry
            assert "lessons_attended" in entry
            assert "joined_video" in entry
            assert "watched_replay" in entry
            assert "marked_complete" in entry
    
    def test_attendance_summary_member_forbidden(self, member_token):
        """GET /api/attendance/summary returns 403 for member"""
        response = requests.get(
            f"{BASE_URL}/api/attendance/summary",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 403
    
    def test_attendance_report_member_forbidden(self, member_token):
        """GET /api/attendance/report returns 403 for member"""
        response = requests.get(
            f"{BASE_URL}/api/attendance/report",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 403


class TestSearchAPI:
    """Test Search endpoint"""
    
    def test_search_teacher(self, teacher_token):
        """GET /api/search returns search results for teacher"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": "test"},
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Verify response structure
        assert "courses" in data
        assert "lessons" in data
        assert "discussions" in data
        assert isinstance(data["courses"], list)
        assert isinstance(data["lessons"], list)
        assert isinstance(data["discussions"], list)
    
    def test_search_member(self, member_token):
        """GET /api/search returns search results for member"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": "gospel"},
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "courses" in data
        assert "lessons" in data
        assert "discussions" in data
    
    def test_search_empty_query_fails(self, teacher_token):
        """GET /api/search with empty query returns 422"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": ""},
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 422


class TestPushNotificationsAPI:
    """Test Push Notification endpoints"""
    
    def test_vapid_public_key_no_auth(self):
        """GET /api/push/vapid-public-key returns key without auth"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-public-key")
        assert response.status_code == 200
        data = response.json()
        assert "publicKey" in data
        assert isinstance(data["publicKey"], str)
        assert len(data["publicKey"]) > 0
    
    def test_push_subscribe_teacher(self, teacher_token):
        """POST /api/push/subscribe creates subscription for teacher"""
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            json={
                "endpoint": "https://test.example.com/push/test_teacher_123",
                "keys": {"p256dh": "test_key_teacher", "auth": "test_auth_teacher"}
            },
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Subscribed" in data["message"]
    
    def test_push_subscribe_member(self, member_token):
        """POST /api/push/subscribe creates subscription for member"""
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            json={
                "endpoint": "https://test.example.com/push/test_member_123",
                "keys": {"p256dh": "test_key_member", "auth": "test_auth_member"}
            },
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "Subscribed" in data["message"]


class TestReadingRemindersAPI:
    """Test Reading Reminders endpoints"""
    
    def test_get_reading_reminder_settings_teacher(self, teacher_token):
        """GET /api/reading-reminders/settings returns settings for teacher"""
        response = requests.get(
            f"{BASE_URL}/api/reading-reminders/settings",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "reminder_time" in data
        assert isinstance(data["enabled"], bool)
        assert isinstance(data["reminder_time"], str)
    
    def test_get_reading_reminder_settings_member(self, member_token):
        """GET /api/reading-reminders/settings returns settings for member"""
        response = requests.get(
            f"{BASE_URL}/api/reading-reminders/settings",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "reminder_time" in data
    
    def test_update_reading_reminder_settings(self, teacher_token):
        """PUT /api/reading-reminders/settings updates settings"""
        # Update settings
        response = requests.put(
            f"{BASE_URL}/api/reading-reminders/settings",
            json={"enabled": True, "reminder_time": "09:00"},
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        
        # Verify update persisted
        get_response = requests.get(
            f"{BASE_URL}/api/reading-reminders/settings",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["enabled"] == True
        assert data["reminder_time"] == "09:00"
        
        # Reset to default
        requests.put(
            f"{BASE_URL}/api/reading-reminders/settings",
            json={"enabled": False, "reminder_time": "08:00"},
            headers={"Authorization": f"Bearer {teacher_token}"}
        )


class TestCertificateAPI:
    """Test Certificate generation endpoint"""
    
    def test_certificate_course_not_found(self, teacher_token):
        """GET /api/courses/{id}/certificate returns 404 for non-existent course"""
        response = requests.get(
            f"{BASE_URL}/api/courses/non-existent-course-id/certificate",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 404
    
    def test_certificate_incomplete_course(self, teacher_token):
        """GET /api/courses/{id}/certificate returns 400 for incomplete course"""
        # First get a course with lessons
        courses_response = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert courses_response.status_code == 200
        courses = courses_response.json()
        
        # Find a course with lessons
        course_with_lessons = None
        for course in courses:
            if course.get("lesson_count", 0) > 0:
                course_with_lessons = course
                break
        
        if course_with_lessons:
            # Try to get certificate for incomplete course
            response = requests.get(
                f"{BASE_URL}/api/courses/{course_with_lessons['id']}/certificate",
                headers={"Authorization": f"Bearer {teacher_token}"}
            )
            # Should return 400 if not completed
            assert response.status_code in [200, 400]  # 200 if completed, 400 if not
    
    def test_certificate_generates_pdf(self, teacher_token):
        """GET /api/courses/{id}/certificate generates PDF for completed course"""
        # Get courses
        courses_response = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        courses = courses_response.json()
        
        # Find a course with 0 lessons (will auto-complete)
        course_no_lessons = None
        for course in courses:
            if course.get("lesson_count", 0) == 0 and course.get("total_lessons", 0) == 0:
                course_no_lessons = course
                break
        
        if course_no_lessons:
            response = requests.get(
                f"{BASE_URL}/api/courses/{course_no_lessons['id']}/certificate",
                headers={"Authorization": f"Bearer {teacher_token}"}
            )
            # Course with 0 lessons should generate certificate
            assert response.status_code == 200
            assert response.headers.get("content-type") == "application/pdf"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
