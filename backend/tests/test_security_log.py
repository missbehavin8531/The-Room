"""
Test Security Log Feature - Backend API Tests
Tests for:
- GET /api/security-logs (admin only, paginated)
- GET /api/security-logs/summary (admin only)
- Security event logging on login success/failure
- Non-admin access returns 403
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"
DEMO_INVITE_CODE = "DEMO2026"


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
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestSecurityLogAPI:
    """Security Log endpoint tests (admin only)"""

    def test_get_security_logs_admin_success(self, admin_client):
        """Admin can access security logs"""
        response = admin_client.get(f"{BASE_URL}/api/security-logs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "logs" in data, "Response should contain 'logs' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["logs"], list), "logs should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        print(f"✓ Security logs returned {len(data['logs'])} entries, total: {data['total']}")

    def test_get_security_logs_with_pagination(self, admin_client):
        """Security logs support pagination"""
        response = admin_client.get(f"{BASE_URL}/api/security-logs?limit=5&skip=0")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["logs"]) <= 5, "Should respect limit parameter"
        print(f"✓ Pagination works: returned {len(data['logs'])} logs with limit=5")

    def test_get_security_logs_with_event_type_filter(self, admin_client):
        """Security logs can be filtered by event_type"""
        response = admin_client.get(f"{BASE_URL}/api/security-logs?event_type=login_success")
        assert response.status_code == 200
        
        data = response.json()
        # All returned logs should be login_success type
        for log in data["logs"]:
            assert log["event_type"] == "login_success", f"Expected login_success, got {log['event_type']}"
        print(f"✓ Event type filter works: {len(data['logs'])} login_success events")

    def test_get_security_summary_admin_success(self, admin_client):
        """Admin can access security summary"""
        response = admin_client.get(f"{BASE_URL}/api/security-logs/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Response should contain 'summary' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["summary"], dict), "summary should be a dict"
        print(f"✓ Security summary: {data['summary']}, total: {data['total']}")

    def test_security_logs_unauthorized_no_token(self, api_client):
        """Security logs require authentication"""
        # Create a fresh session without auth
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.get(f"{BASE_URL}/api/security-logs")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthenticated request correctly rejected with {response.status_code}")


class TestLoginSecurityEvents:
    """Test that login generates security events"""

    def test_successful_login_creates_event(self, api_client, admin_client):
        """Successful login should create login_success event"""
        # First, do a fresh login to generate an event
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        login_response = fresh_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, "Login should succeed"
        
        # Now check security logs for login_success event
        logs_response = admin_client.get(f"{BASE_URL}/api/security-logs?event_type=login_success&limit=10")
        assert logs_response.status_code == 200
        
        data = logs_response.json()
        # Should have at least one login_success event
        assert len(data["logs"]) > 0, "Should have login_success events"
        
        # Check the most recent login event
        recent_login = data["logs"][0]
        assert recent_login["event_type"] == "login_success"
        assert ADMIN_EMAIL in recent_login.get("email", "") or ADMIN_EMAIL in recent_login.get("description", "")
        print(f"✓ Login success event found: {recent_login['description']}")

    def test_failed_login_creates_event(self, api_client, admin_client):
        """Failed login should create login_failed event"""
        # Attempt login with wrong password
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        test_email = f"test_failed_{uuid.uuid4().hex[:8]}@example.com"
        login_response = fresh_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "wrongpassword123"
        })
        assert login_response.status_code == 401, "Login should fail with wrong credentials"
        
        # Check security logs for login_failed event
        logs_response = admin_client.get(f"{BASE_URL}/api/security-logs?event_type=login_failed&limit=10")
        assert logs_response.status_code == 200
        
        data = logs_response.json()
        # Should have at least one login_failed event
        assert len(data["logs"]) > 0, "Should have login_failed events"
        print(f"✓ Login failed events found: {len(data['logs'])} events")


class TestSecurityLogStructure:
    """Test security log entry structure"""

    def test_log_entry_has_required_fields(self, admin_client):
        """Each log entry should have required fields"""
        response = admin_client.get(f"{BASE_URL}/api/security-logs?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["logs"]) > 0:
            log = data["logs"][0]
            required_fields = ["id", "event_type", "description", "created_at"]
            for field in required_fields:
                assert field in log, f"Log entry missing required field: {field}"
            print(f"✓ Log entry has all required fields: {list(log.keys())}")
        else:
            print("⚠ No logs to verify structure (this is OK if fresh database)")

    def test_summary_contains_event_types(self, admin_client):
        """Summary should contain counts for different event types"""
        response = admin_client.get(f"{BASE_URL}/api/security-logs/summary")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        # Check if we have any event types in summary
        if summary:
            print(f"✓ Summary contains event types: {list(summary.keys())}")
            for event_type, count in summary.items():
                assert isinstance(count, int), f"Count for {event_type} should be int"
                assert count >= 0, f"Count for {event_type} should be non-negative"
        else:
            print("⚠ Summary is empty (this is OK if fresh database)")


class TestNonAdminAccess:
    """Test that non-admin users cannot access security logs"""

    def test_member_cannot_access_security_logs(self, api_client):
        """Create a test member and verify they cannot access security logs"""
        # First, register a new test user
        test_email = f"TEST_member_{uuid.uuid4().hex[:8]}@example.com"
        
        register_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test Member",
            "invite_code": DEMO_INVITE_CODE
        })
        
        if register_response.status_code == 200:
            # Try to login (will fail if not approved, but we can test the endpoint)
            login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": "testpass123"
            })
            
            if login_response.status_code == 200:
                token = login_response.json().get("token")
                member_session = requests.Session()
                member_session.headers.update({
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}"
                })
                
                # Try to access security logs
                logs_response = member_session.get(f"{BASE_URL}/api/security-logs")
                assert logs_response.status_code == 403, f"Member should get 403, got {logs_response.status_code}"
                print(f"✓ Non-admin correctly rejected with 403")
            else:
                # User not approved yet - this is expected behavior
                print(f"⚠ Test user not approved (expected), skipping member access test")
                pytest.skip("Test user not approved - cannot test member access")
        else:
            print(f"⚠ Could not register test user: {register_response.text}")
            pytest.skip("Could not register test user")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
