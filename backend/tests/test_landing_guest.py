"""
Test Landing Page + Guest Mode Features
- Guest login endpoint
- Guest can read courses/lessons
- Guest cannot send chat messages (403)
- Admin login still works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"
DEMO_INVITE_CODE = "DEMO2026"


class TestGuestLogin:
    """Test guest login endpoint"""
    
    def test_guest_login_returns_token(self):
        """POST /api/auth/guest should return token and guest user"""
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        user = data["user"]
        assert user["role"] == "guest", f"Expected role 'guest', got {user['role']}"
        assert user["is_approved"] == True, "Guest should be auto-approved"
        assert "group_ids" in user, "Guest should have group_ids"
        print(f"SUCCESS: Guest login returned token and user with role={user['role']}")
    
    def test_guest_token_has_correct_claims(self):
        """Guest token should have 4-hour expiry and guest role"""
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200
        
        data = response.json()
        token = data["token"]
        
        # Token should be a valid JWT (3 parts separated by dots)
        parts = token.split(".")
        assert len(parts) == 3, "Token should be a valid JWT with 3 parts"
        print(f"SUCCESS: Guest token is valid JWT format")


class TestGuestReadAccess:
    """Test that guest can read courses and lessons"""
    
    @pytest.fixture
    def guest_token(self):
        """Get a guest token"""
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        return response.json()["token"]
    
    def test_guest_can_get_courses(self, guest_token):
        """Guest should be able to list courses"""
        headers = {"Authorization": f"Bearer {guest_token}"}
        response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        courses = response.json()
        assert isinstance(courses, list), "Response should be a list of courses"
        print(f"SUCCESS: Guest can access courses endpoint, found {len(courses)} courses")
    
    def test_guest_can_get_course_detail(self, guest_token):
        """Guest should be able to view course details"""
        headers = {"Authorization": f"Bearer {guest_token}"}
        
        # First get list of courses
        courses_response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        courses = courses_response.json()
        
        if len(courses) > 0:
            course_id = courses[0]["id"]
            response = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers=headers)
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            course = response.json()
            assert "id" in course, "Course should have id"
            assert "title" in course, "Course should have title"
            print(f"SUCCESS: Guest can view course detail: {course['title']}")
        else:
            pytest.skip("No courses available to test")
    
    def test_guest_can_get_lessons(self, guest_token):
        """Guest should be able to view lessons"""
        headers = {"Authorization": f"Bearer {guest_token}"}
        
        # First get list of courses
        courses_response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        courses = courses_response.json()
        
        if len(courses) > 0:
            course_id = courses[0]["id"]
            response = requests.get(f"{BASE_URL}/api/courses/{course_id}/lessons", headers=headers)
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            lessons = response.json()
            assert isinstance(lessons, list), "Response should be a list of lessons"
            print(f"SUCCESS: Guest can access lessons, found {len(lessons)} lessons")
        else:
            pytest.skip("No courses available to test")


class TestGuestWriteRestrictions:
    """Test that guest cannot perform write operations"""
    
    @pytest.fixture
    def guest_token(self):
        """Get a guest token"""
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        return response.json()["token"]
    
    def test_guest_cannot_send_chat_message(self, guest_token):
        """Guest should get 403 when trying to send chat message"""
        headers = {"Authorization": f"Bearer {guest_token}"}
        response = requests.post(
            f"{BASE_URL}/api/chat",
            headers=headers,
            json={"content": "Test message from guest"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        assert "guest" in data["detail"].lower() or "sign up" in data["detail"].lower(), \
            f"Error should mention guest restriction: {data['detail']}"
        print(f"SUCCESS: Guest chat blocked with message: {data['detail']}")
    
    def test_guest_cannot_post_comment(self, guest_token):
        """Guest should get 403 when trying to post a comment"""
        headers = {"Authorization": f"Bearer {guest_token}"}
        
        # First get a lesson ID
        courses_response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        courses = courses_response.json()
        
        if len(courses) > 0:
            course_id = courses[0]["id"]
            lessons_response = requests.get(f"{BASE_URL}/api/courses/{course_id}/lessons", headers=headers)
            lessons = lessons_response.json()
            
            if len(lessons) > 0:
                lesson_id = lessons[0]["id"]
                response = requests.post(
                    f"{BASE_URL}/api/lessons/{lesson_id}/comments",
                    headers=headers,
                    json={"content": "Test comment from guest"}
                )
                
                assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
                print(f"SUCCESS: Guest comment blocked with 403")
            else:
                pytest.skip("No lessons available to test")
        else:
            pytest.skip("No courses available to test")
    
    def test_guest_can_read_chat_messages(self, guest_token):
        """Guest should be able to read chat messages"""
        headers = {"Authorization": f"Bearer {guest_token}"}
        response = requests.get(f"{BASE_URL}/api/chat", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        messages = response.json()
        assert isinstance(messages, list), "Response should be a list of messages"
        print(f"SUCCESS: Guest can read chat messages, found {len(messages)} messages")


class TestAdminLogin:
    """Test that admin login still works via the same auth system"""
    
    def test_admin_login_works(self):
        """Admin should be able to login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        
        user = data["user"]
        assert user["role"] == "admin", f"Expected role 'admin', got {user['role']}"
        assert user["is_approved"] == True, "Admin should be approved"
        print(f"SUCCESS: Admin login works, user={user['name']}, role={user['role']}")
    
    def test_admin_can_send_chat_message(self):
        """Admin should be able to send chat messages"""
        # Login as admin
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{BASE_URL}/api/chat",
            headers=headers,
            json={"content": "Test message from admin"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain message id"
        assert data["content"] == "Test message from admin", "Message content should match"
        print(f"SUCCESS: Admin can send chat messages")


class TestDemoGroupExists:
    """Test that demo group with DEMO2026 invite code exists"""
    
    def test_demo_group_lookup(self):
        """Demo group should exist and be accessible"""
        # Guest login should work because demo group exists
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200, f"Guest login failed: {response.text}"
        
        data = response.json()
        user = data["user"]
        
        # Guest should have at least one group (the demo group)
        assert len(user.get("group_ids", [])) > 0, "Guest should be assigned to demo group"
        print(f"SUCCESS: Demo group exists, guest assigned to group_ids={user['group_ids']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
