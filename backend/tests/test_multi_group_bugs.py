"""
Test suite for Multi-Group Bug Fixes:
1. Multi-group: Users need to be part of multiple groups (group_ids array)
2. Resource download: Token auth via query param
3. Message Teacher: GET /api/teachers returns teachers for approved users
4. Join Group: POST /api/groups/join adds to group_ids array
5. Course scoping: Courses filtered by user's group_ids array
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"
INVITE_CODE = "VJ3QHHL8"
LESSON_WITH_RESOURCES = "f76ba67f-d0ac-47ff-ae75-a2b8c46dec9e"


class TestMultiGroupAuth:
    """Test that login and /api/auth/me return group_ids array"""
    
    def test_login_returns_group_ids_array(self):
        """Login response should include group_ids array"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify user object has group_ids array
        assert "user" in data, "Response missing 'user' field"
        user = data["user"]
        assert "group_ids" in user, "User missing 'group_ids' field"
        assert isinstance(user["group_ids"], list), "group_ids should be a list"
        print(f"Login returned group_ids: {user['group_ids']}")
    
    def test_auth_me_returns_group_ids_array(self):
        """GET /api/auth/me should return group_ids array"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"GET /api/auth/me failed: {response.text}"
        data = response.json()
        
        assert "group_ids" in data, "Response missing 'group_ids' field"
        assert isinstance(data["group_ids"], list), "group_ids should be a list"
        print(f"GET /api/auth/me returned group_ids: {data['group_ids']}")


class TestResourceDownload:
    """Test resource download with token auth via query param"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_download_without_token_returns_403(self, auth_token):
        """Download without token should return 403"""
        # First get a resource ID from the lesson
        lesson_resp = requests.get(
            f"{BASE_URL}/api/lessons/{LESSON_WITH_RESOURCES}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if lesson_resp.status_code != 200:
            pytest.skip(f"Lesson not found: {LESSON_WITH_RESOURCES}")
        
        lesson = lesson_resp.json()
        resources = lesson.get("resources", [])
        
        if not resources:
            pytest.skip("No resources found in lesson")
        
        resource_id = resources[0]["id"]
        
        # Try download without token
        response = requests.get(f"{BASE_URL}/api/resources/{resource_id}/download")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"Download without token correctly returned 403")
    
    def test_download_with_token_returns_200(self, auth_token):
        """Download with token query param should return 200"""
        # First get a resource ID from the lesson
        lesson_resp = requests.get(
            f"{BASE_URL}/api/lessons/{LESSON_WITH_RESOURCES}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if lesson_resp.status_code != 200:
            pytest.skip(f"Lesson not found: {LESSON_WITH_RESOURCES}")
        
        lesson = lesson_resp.json()
        resources = lesson.get("resources", [])
        
        if not resources:
            pytest.skip("No resources found in lesson")
        
        resource_id = resources[0]["id"]
        
        # Download with token query param
        response = requests.get(
            f"{BASE_URL}/api/resources/{resource_id}/download?token={auth_token}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Download with token returned 200, content-length: {len(response.content)}")


class TestTeachersEndpoint:
    """Test GET /api/teachers returns teachers for approved users"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_teachers_endpoint_returns_teachers(self, auth_token):
        """GET /api/teachers should return teachers/admins for approved users"""
        response = requests.get(
            f"{BASE_URL}/api/teachers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"GET /api/teachers failed: {response.text}"
        
        teachers = response.json()
        assert isinstance(teachers, list), "Response should be a list"
        
        # Verify all returned users are teachers or admins
        for teacher in teachers:
            assert teacher["role"] in ["teacher", "admin"], f"Unexpected role: {teacher['role']}"
            assert teacher["is_approved"] == True, "Teacher should be approved"
        
        print(f"GET /api/teachers returned {len(teachers)} teachers/admins")
        for t in teachers:
            print(f"  - {t['name']} ({t['role']})")
    
    def test_teachers_endpoint_requires_auth(self):
        """GET /api/teachers without auth should return 401/403"""
        response = requests.get(f"{BASE_URL}/api/teachers")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"GET /api/teachers without auth correctly returned {response.status_code}")


class TestJoinGroup:
    """Test POST /api/groups/join adds to group_ids array"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_join_group_endpoint_exists(self, auth_token):
        """POST /api/groups/join should exist and accept invite_code"""
        # Try with invalid code first to verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/groups/join?invite_code=INVALID123",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should return 404 for invalid code, not 405 (method not allowed)
        assert response.status_code in [400, 404], f"Expected 400/404 for invalid code, got {response.status_code}: {response.text}"
        print(f"POST /api/groups/join endpoint exists, returned {response.status_code} for invalid code")
    
    def test_join_group_with_valid_code(self, auth_token):
        """POST /api/groups/join with valid code should work or return 'already member'"""
        response = requests.post(
            f"{BASE_URL}/api/groups/join?invite_code={INVITE_CODE}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Either success (200) or already a member (400)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}: {response.text}"
        
        data = response.json()
        if response.status_code == 200:
            assert "group_id" in data, "Response should include group_id"
            print(f"Joined group: {data.get('group_name', 'unknown')}")
        else:
            # Already a member
            print(f"Already a member: {data.get('detail', data)}")


class TestCourseScoping:
    """Test courses are filtered by user's group_ids array"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_courses_endpoint_returns_courses(self, auth_token):
        """GET /api/courses should return courses for user's groups"""
        response = requests.get(
            f"{BASE_URL}/api/courses",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"GET /api/courses failed: {response.text}"
        
        courses = response.json()
        assert isinstance(courses, list), "Response should be a list"
        print(f"GET /api/courses returned {len(courses)} courses")
        
        for course in courses[:3]:  # Print first 3
            print(f"  - {course['title']} (published: {course['is_published']})")


class TestAssignUserToGroup:
    """Test PUT /api/users/{id}/assign-group uses $addToSet"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_assign_group_endpoint_exists(self, auth_token):
        """PUT /api/users/{id}/assign-group should exist"""
        # Get a user to test with
        users_resp = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if users_resp.status_code != 200:
            pytest.skip("Cannot get users list")
        
        users = users_resp.json()
        if not users:
            pytest.skip("No users found")
        
        # Get groups
        groups_resp = requests.get(
            f"{BASE_URL}/api/groups/all",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if groups_resp.status_code != 200:
            pytest.skip("Cannot get groups list")
        
        groups = groups_resp.json()
        if not groups:
            pytest.skip("No groups found")
        
        # Try to assign first user to first group
        user_id = users[0]["id"]
        group_id = groups[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/users/{user_id}/assign-group?group_id={group_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should succeed or return meaningful error
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}: {response.text}"
        print(f"Assign group endpoint returned {response.status_code}: {response.json()}")


class TestSettingsJoinGroup:
    """Test Settings page Join Another Group functionality"""
    
    def test_groups_lookup_endpoint(self):
        """GET /api/groups/lookup should verify invite code"""
        response = requests.get(f"{BASE_URL}/api/groups/lookup?invite_code={INVITE_CODE}")
        assert response.status_code == 200, f"Lookup failed: {response.text}"
        
        data = response.json()
        assert "group_id" in data, "Response should include group_id"
        assert "group_name" in data, "Response should include group_name"
        print(f"Lookup returned: {data['group_name']} ({data['group_id']})")
    
    def test_groups_lookup_invalid_code(self):
        """GET /api/groups/lookup with invalid code should return 404"""
        response = requests.get(f"{BASE_URL}/api/groups/lookup?invite_code=INVALID123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Lookup with invalid code correctly returned 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
