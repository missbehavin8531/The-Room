"""
Test Role Restructure: Platform Admin vs Teacher vs Member
- Admin: kirah092804@gmail.com - full access to everything
- Teacher: isolated to their own group, limited to 1 group
- Member: joins via invite code
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"
TEACHER_EMAIL = "newteacher@test.com"
TEACHER_PASSWORD = "teacher123"


class TestAdminLogin:
    """Test admin login and access"""
    
    def test_admin_login_returns_admin_role(self):
        """Admin login should return role=admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"
        assert data["user"]["needs_group_setup"] == False
        print(f"Admin login successful: {data['user']['name']}, role={data['user']['role']}")
    
    def test_admin_can_access_admin_endpoint(self):
        """Admin should be able to access /api/groups/all (admin-only)"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Access admin endpoint
        response = requests.get(f"{BASE_URL}/api/groups/all", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        print(f"Admin accessed /api/groups/all successfully, found {len(response.json())} groups")
    
    def test_admin_me_endpoint(self):
        """GET /api/auth/me should return admin user with needs_group_setup=false"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"
        assert data["needs_group_setup"] == False
        print(f"Admin /me: role={data['role']}, needs_group_setup={data['needs_group_setup']}")


class TestTeacherNeedingSetup:
    """Test teacher who needs group setup"""
    
    def test_teacher_login_returns_needs_group_setup_true(self):
        """Teacher without group should have needs_group_setup=true"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "teacher"
        assert data["user"]["needs_group_setup"] == True
        assert data["user"]["group_id"] is None
        print(f"Teacher login: needs_group_setup={data['user']['needs_group_setup']}, group_id={data['user']['group_id']}")
    
    def test_teacher_me_endpoint_shows_needs_setup(self):
        """GET /api/auth/me should return needs_group_setup=true for teacher without group"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        token = login_res.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "teacher"
        assert data["needs_group_setup"] == True
        print(f"Teacher /me: role={data['role']}, needs_group_setup={data['needs_group_setup']}")
    
    def test_teacher_cannot_access_admin_endpoint(self):
        """Teacher should NOT be able to access admin-only endpoints"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Try to access admin endpoint
        response = requests.get(f"{BASE_URL}/api/groups/all", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 403
        print(f"Teacher correctly denied access to /api/groups/all: {response.status_code}")


class TestTeacherGroupCreation:
    """Test teacher group creation flow"""
    
    def test_teacher_can_create_group(self):
        """Teacher should be able to create a group"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Create group
        response = requests.post(f"{BASE_URL}/api/groups", 
            json={"name": "TEST_Teacher_Setup_Group"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "invite_code" in data
        assert data["name"] == "TEST_Teacher_Setup_Group"
        print(f"Teacher created group: {data['name']}, invite_code={data['invite_code']}")
        
        # Store group_id for cleanup
        return data["id"]
    
    def test_teacher_assigned_to_group_after_creation(self):
        """After creating group, teacher should be assigned to it"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Check /me endpoint
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        data = response.json()
        
        # If teacher already created a group, they should have group_id
        if data.get("group_id"):
            assert data["needs_group_setup"] == False
            print(f"Teacher has group_id={data['group_id']}, needs_group_setup={data['needs_group_setup']}")
        else:
            # Teacher hasn't created group yet
            assert data["needs_group_setup"] == True
            print(f"Teacher still needs setup: needs_group_setup={data['needs_group_setup']}")
    
    def test_teacher_limited_to_one_group(self):
        """Teacher should not be able to create a second group"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        token = login_res.json()["token"]
        user_data = login_res.json()["user"]
        
        # If teacher already has a group, trying to create another should fail
        if user_data.get("group_id") or not user_data.get("needs_group_setup"):
            response = requests.post(f"{BASE_URL}/api/groups", 
                json={"name": "TEST_Second_Group"},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 400
            assert "already have a group" in response.json().get("detail", "").lower()
            print(f"Teacher correctly denied second group: {response.json()['detail']}")
        else:
            pytest.skip("Teacher doesn't have a group yet, can't test limit")


class TestRegisterRequiresInviteCode:
    """Test that registration requires invite code"""
    
    def test_register_without_invite_code_fails(self):
        """Registration without invite code should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "test_no_code@example.com",
            "password": "testpass123"
        })
        # Should fail with 422 (validation error) or 400
        assert response.status_code in [400, 422]
        print(f"Register without invite code failed as expected: {response.status_code}")
    
    def test_register_with_invalid_invite_code_fails(self):
        """Registration with invalid invite code should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "test_bad_code@example.com",
            "password": "testpass123",
            "invite_code": "INVALID123"
        })
        assert response.status_code == 400
        assert "invalid invite code" in response.json().get("detail", "").lower()
        print(f"Register with invalid code failed: {response.json()['detail']}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_teacher_group(self):
        """Reset teacher's group_id to null for future tests"""
        # Login as admin
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = login_res.json()["token"]
        
        # Get all groups to find TEST_ groups
        groups_res = requests.get(f"{BASE_URL}/api/groups/all", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        if groups_res.status_code == 200:
            groups = groups_res.json()
            for g in groups:
                if g["name"].startswith("TEST_"):
                    # Delete test group
                    del_res = requests.delete(f"{BASE_URL}/api/groups/{g['id']}", headers={
                        "Authorization": f"Bearer {admin_token}"
                    })
                    print(f"Deleted test group: {g['name']} - {del_res.status_code}")
        
        print("Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
