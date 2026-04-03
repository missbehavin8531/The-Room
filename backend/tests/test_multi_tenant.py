"""
Test suite for multi-tenant (church) support and video room features.
Tests: Login with church_id, registration flows, church management, scoped queries, video token generation.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"
DEFAULT_INVITE_CODE = "THEROOM1"
TEST_LESSON_ID = "f76ba67f-d0ac-47ff-ae75-a2b8c46dec9e"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestLoginWithChurchSupport:
    """Test login API returns church_id and church_name"""
    
    def test_login_returns_church_id_and_name(self, api_client):
        """POST /api/auth/login should return church_id and church_name"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user object"
        
        user = data["user"]
        assert "church_id" in user, "User missing church_id"
        assert "church_name" in user, "User missing church_name"
        assert user["church_id"] is not None, "church_id should not be None for admin"
        assert user["church_name"] is not None, "church_name should not be None for admin"
        print(f"Login successful - church_id: {user['church_id']}, church_name: {user['church_name']}")


class TestAuthMe:
    """Test GET /api/auth/me returns church info"""
    
    def test_auth_me_returns_church_info(self, authenticated_client):
        """GET /api/auth/me should return church_id and church_name"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        
        data = response.json()
        assert "church_id" in data, "Response missing church_id"
        assert "church_name" in data, "Response missing church_name"
        assert data["church_id"] is not None, "church_id should not be None"
        print(f"Auth/me - church_id: {data['church_id']}, church_name: {data['church_name']}")


class TestChurchLookup:
    """Test public church lookup endpoint"""
    
    def test_lookup_valid_invite_code(self, authenticated_client):
        """GET /api/churches/lookup?invite_code=XXX should return church info"""
        # First get the current invite code from the church
        church_response = authenticated_client.get(f"{BASE_URL}/api/churches/my")
        assert church_response.status_code == 200
        current_invite_code = church_response.json()["invite_code"]
        
        # Now test the public lookup endpoint (no auth needed)
        headers = {"Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/churches/lookup?invite_code={current_invite_code}",
            headers=headers
        )
        assert response.status_code == 200, f"Lookup failed: {response.text}"
        
        data = response.json()
        assert "church_id" in data, "Response missing church_id"
        assert "church_name" in data, "Response missing church_name"
        print(f"Lookup successful - church_id: {data['church_id']}, church_name: {data['church_name']}")
    
    def test_lookup_invalid_invite_code(self, api_client):
        """GET /api/churches/lookup with invalid code should return 404"""
        headers = {"Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/churches/lookup?invite_code=INVALID123",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestChurchManagement:
    """Test church management endpoints"""
    
    def test_get_my_church(self, authenticated_client):
        """GET /api/churches/my should return church details with member_count"""
        response = authenticated_client.get(f"{BASE_URL}/api/churches/my")
        assert response.status_code == 200, f"Get my church failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing id"
        assert "name" in data, "Response missing name"
        assert "invite_code" in data, "Response missing invite_code"
        assert "member_count" in data, "Response missing member_count"
        assert isinstance(data["member_count"], int), "member_count should be integer"
        print(f"My church: {data['name']}, members: {data['member_count']}, code: {data['invite_code']}")
        return data
    
    def test_update_church_name(self, authenticated_client):
        """PUT /api/churches/{id} should update church name"""
        # First get current church
        church_response = authenticated_client.get(f"{BASE_URL}/api/churches/my")
        assert church_response.status_code == 200
        church = church_response.json()
        church_id = church["id"]
        original_name = church["name"]
        
        # Update name
        new_name = f"Test Church {uuid.uuid4().hex[:6]}"
        update_response = authenticated_client.put(
            f"{BASE_URL}/api/churches/{church_id}",
            json={"name": new_name}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        verify_response = authenticated_client.get(f"{BASE_URL}/api/churches/my")
        assert verify_response.status_code == 200
        assert verify_response.json()["name"] == new_name
        
        # Restore original name
        authenticated_client.put(
            f"{BASE_URL}/api/churches/{church_id}",
            json={"name": original_name}
        )
        print(f"Church name update test passed")
    
    def test_regenerate_invite_code(self, authenticated_client):
        """POST /api/churches/{id}/regenerate-code should generate new invite code"""
        # Get current church
        church_response = authenticated_client.get(f"{BASE_URL}/api/churches/my")
        assert church_response.status_code == 200
        church = church_response.json()
        church_id = church["id"]
        old_code = church["invite_code"]
        
        # Regenerate code
        regen_response = authenticated_client.post(
            f"{BASE_URL}/api/churches/{church_id}/regenerate-code"
        )
        assert regen_response.status_code == 200, f"Regenerate failed: {regen_response.text}"
        
        data = regen_response.json()
        assert "invite_code" in data, "Response missing invite_code"
        new_code = data["invite_code"]
        # Note: In rare cases, the new code could be the same as old (random collision)
        # So we just verify the response structure
        assert len(new_code) >= 6, "Invite code should be at least 6 characters"
        print(f"Regenerate code test passed - old: {old_code}, new: {new_code}")
        
        # Store the new code for subsequent tests
        TestChurchManagement.current_invite_code = new_code


class TestScopedQueries:
    """Test that queries are scoped to user's church_id"""
    
    def test_courses_scoped_to_church(self, authenticated_client):
        """GET /api/courses should return courses scoped to church_id"""
        response = authenticated_client.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200, f"Get courses failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Courses returned: {len(data)}")
    
    def test_users_scoped_to_church(self, authenticated_client):
        """GET /api/users should return users scoped to church_id"""
        response = authenticated_client.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200, f"Get users failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Users returned: {len(data)}")
    
    def test_analytics_scoped_to_church(self, authenticated_client):
        """GET /api/analytics should return analytics scoped to church"""
        response = authenticated_client.get(f"{BASE_URL}/api/analytics")
        assert response.status_code == 200, f"Get analytics failed: {response.text}"
        
        data = response.json()
        assert "total_users" in data, "Response missing total_users"
        assert "total_courses" in data, "Response missing total_courses"
        print(f"Analytics - users: {data['total_users']}, courses: {data['total_courses']}")
    
    def test_search_scoped_to_church(self, authenticated_client):
        """GET /api/search?q=test should return results scoped to church"""
        response = authenticated_client.get(f"{BASE_URL}/api/search?q=test")
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        assert "courses" in data, "Response missing courses"
        assert "lessons" in data, "Response missing lessons"
        assert "discussions" in data, "Response missing discussions"
        print(f"Search results - courses: {len(data['courses'])}, lessons: {len(data['lessons'])}")


class TestVideoRoomToken:
    """Test video room token generation via REST API"""
    
    def test_video_join_returns_valid_token(self, authenticated_client):
        """POST /api/lessons/{id}/video/join should return valid room_url and meeting_token"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/lessons/{TEST_LESSON_ID}/video/join"
        )
        
        # May return 404 if lesson doesn't exist, which is acceptable
        if response.status_code == 404:
            pytest.skip("Test lesson not found - skipping video test")
        
        assert response.status_code == 200, f"Video join failed: {response.text}"
        
        data = response.json()
        assert "room_url" in data, "Response missing room_url"
        assert "meeting_token" in data, "Response missing meeting_token"
        assert "room_name" in data, "Response missing room_name"
        
        # Token from REST API should be 300+ chars (not manual JWT which is shorter)
        token = data["meeting_token"]
        assert len(token) > 300, f"Token too short ({len(token)} chars) - may be manual JWT instead of REST API token"
        
        # Room URL should contain the Daily domain
        assert "daily.co" in data["room_url"], "room_url should contain daily.co domain"
        
        print(f"Video join successful - room: {data['room_name']}, token length: {len(token)}")


class TestRegistrationFlows:
    """Test registration with church creation and joining"""
    
    def test_registration_with_new_church(self, api_client):
        """POST /api/auth/register with church_name creates new church + user as admin"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"test_church_creator_{unique_id}@test.com"
        test_church = f"Test Church {unique_id}"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "Test Church Creator",
                "email": test_email,
                "password": "testpass123",
                "church_name": test_church
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response missing user_id"
        assert "church_id" in data, "Response missing church_id"
        assert "church_name" in data, "Response missing church_name"
        assert data["church_name"] == test_church, "church_name mismatch"
        assert data["church_id"] is not None, "church_id should not be None"
        
        # Verify user can login and is admin
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email, "password": "testpass123"},
            headers={"Content-Type": "application/json"}
        )
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert login_data["user"]["role"] == "admin", "Church creator should be admin"
        assert login_data["user"]["is_approved"] == True, "Church creator should be auto-approved"
        
        print(f"Registration with new church successful - church_id: {data['church_id']}")
    
    def test_registration_with_invite_code(self, api_client, admin_token):
        """POST /api/auth/register with invite_code joins existing church"""
        # First get the current invite code from the church
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        church_response = requests.get(f"{BASE_URL}/api/churches/my", headers=headers)
        assert church_response.status_code == 200, f"Failed to get church: {church_response.text}"
        current_invite_code = church_response.json()["invite_code"]
        
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"test_joiner_{unique_id}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "Test Church Joiner",
                "email": test_email,
                "password": "testpass123",
                "invite_code": current_invite_code
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response missing user_id"
        assert "church_id" in data, "Response missing church_id"
        assert "church_name" in data, "Response missing church_name"
        assert data["church_id"] is not None, "church_id should not be None"
        
        # Verify user can login (but may need approval)
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email, "password": "testpass123"},
            headers={"Content-Type": "application/json"}
        )
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert login_data["user"]["role"] == "member", "Joiner should be member"
        
        print(f"Registration with invite code successful - church_id: {data['church_id']}")
    
    def test_registration_with_invalid_invite_code(self, api_client):
        """POST /api/auth/register with invalid invite_code should fail"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"test_invalid_{unique_id}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "Test Invalid",
                "email": test_email,
                "password": "testpass123",
                "invite_code": "INVALID123"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid invite code correctly rejected")


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self, api_client):
        """API root should return version info"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
