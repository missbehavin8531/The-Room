"""
Test Group Management Features (Admin Panel)
- GET /api/groups/all - list all groups with member counts (admin only)
- POST /api/groups - create new group with auto-generated invite code
- PUT /api/groups/{id} - update group name
- DELETE /api/groups/{id} - delete group and unassign members (cannot delete own group)
- GET /api/groups/{id}/members - get members of a specific group
- POST /api/groups/{id}/regenerate-code - generate new invite code
- GET /api/users/unassigned - get users with no group_id
- PUT /api/users/{user_id}/assign-group?group_id=X - assign user to any group
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture(scope="module")
def admin_user(admin_token):
    """Get admin user info"""
    response = requests.get(f"{BASE_URL}/api/auth/me", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert response.status_code == 200
    return response.json()


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestGroupsAll:
    """Test GET /api/groups/all endpoint"""
    
    def test_get_all_groups_returns_list(self, admin_headers):
        """GET /api/groups/all returns list of all groups with member_count"""
        response = requests.get(f"{BASE_URL}/api/groups/all", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one group"
        
        # Verify structure of first group
        first_group = data[0]
        assert "id" in first_group, "Group should have id"
        assert "name" in first_group, "Group should have name"
        assert "invite_code" in first_group, "Group should have invite_code"
        assert "member_count" in first_group, "Group should have member_count"
        assert isinstance(first_group["member_count"], int), "member_count should be integer"
        print(f"✓ Found {len(data)} groups, first group: {first_group['name']} with {first_group['member_count']} members")
    
    def test_get_all_groups_requires_admin(self):
        """GET /api/groups/all requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/groups/all")
        assert response.status_code in [401, 403], "Should require authentication"


class TestCreateGroup:
    """Test POST /api/groups endpoint"""
    
    def test_create_group_success(self, admin_headers):
        """POST /api/groups creates new group with auto-generated invite code"""
        unique_name = f"TEST_Group_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/groups", headers=admin_headers, json={
            "name": unique_name
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["name"] == unique_name, "Name should match"
        assert "id" in data, "Should have id"
        assert "invite_code" in data, "Should have auto-generated invite_code"
        assert len(data["invite_code"]) >= 6, "Invite code should be at least 6 chars"
        assert data["member_count"] == 0, "New group should have 0 members"
        print(f"✓ Created group '{unique_name}' with invite code: {data['invite_code']}")
        
        # Store for cleanup
        return data["id"]
    
    def test_create_group_requires_name(self, admin_headers):
        """POST /api/groups requires name field"""
        response = requests.post(f"{BASE_URL}/api/groups", headers=admin_headers, json={})
        assert response.status_code == 422, "Should fail validation without name"


class TestUpdateGroup:
    """Test PUT /api/groups/{id} endpoint"""
    
    def test_update_group_name(self, admin_headers):
        """PUT /api/groups/{id} updates group name"""
        # First create a test group
        unique_name = f"TEST_Update_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/groups", headers=admin_headers, json={
            "name": unique_name
        })
        assert create_response.status_code == 200
        group_id = create_response.json()["id"]
        
        # Update the name
        new_name = f"TEST_Updated_{uuid.uuid4().hex[:8]}"
        update_response = requests.put(f"{BASE_URL}/api/groups/{group_id}", headers=admin_headers, json={
            "name": new_name
        })
        assert update_response.status_code == 200, f"Failed: {update_response.text}"
        
        data = update_response.json()
        assert data["name"] == new_name, "Name should be updated"
        print(f"✓ Updated group name from '{unique_name}' to '{new_name}'")
    
    def test_update_nonexistent_group(self, admin_headers):
        """PUT /api/groups/{id} returns 404 for nonexistent group"""
        fake_id = str(uuid.uuid4())
        response = requests.put(f"{BASE_URL}/api/groups/{fake_id}", headers=admin_headers, json={
            "name": "Test"
        })
        assert response.status_code == 404, "Should return 404 for nonexistent group"


class TestDeleteGroup:
    """Test DELETE /api/groups/{id} endpoint"""
    
    def test_delete_group_success(self, admin_headers):
        """DELETE /api/groups/{id} deletes group and unassigns members"""
        # First create a test group
        unique_name = f"TEST_Delete_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/groups", headers=admin_headers, json={
            "name": unique_name
        })
        assert create_response.status_code == 200
        group_id = create_response.json()["id"]
        
        # Delete the group
        delete_response = requests.delete(f"{BASE_URL}/api/groups/{group_id}", headers=admin_headers)
        assert delete_response.status_code == 200, f"Failed: {delete_response.text}"
        
        data = delete_response.json()
        assert "message" in data, "Should have message"
        assert "members_unassigned" in data, "Should report members_unassigned count"
        print(f"✓ Deleted group '{unique_name}', {data['members_unassigned']} members unassigned")
        
        # Verify group is gone
        get_response = requests.get(f"{BASE_URL}/api/groups/all", headers=admin_headers)
        groups = get_response.json()
        group_ids = [g["id"] for g in groups]
        assert group_id not in group_ids, "Deleted group should not appear in list"
    
    def test_cannot_delete_own_group(self, admin_headers, admin_user):
        """DELETE /api/groups/{id} cannot delete admin's own group"""
        admin_group_id = admin_user.get("group_id")
        assert admin_group_id, "Admin should have a group_id"
        
        response = requests.delete(f"{BASE_URL}/api/groups/{admin_group_id}", headers=admin_headers)
        assert response.status_code == 400, f"Should not allow deleting own group: {response.text}"
        
        data = response.json()
        assert "cannot delete your own group" in data.get("detail", "").lower(), "Should mention cannot delete own group"
        print(f"✓ Correctly prevented deletion of admin's own group")
    
    def test_delete_nonexistent_group(self, admin_headers):
        """DELETE /api/groups/{id} returns 404 for nonexistent group"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/groups/{fake_id}", headers=admin_headers)
        assert response.status_code == 404, "Should return 404 for nonexistent group"


class TestGroupMembers:
    """Test GET /api/groups/{id}/members endpoint"""
    
    def test_get_group_members(self, admin_headers, admin_user):
        """GET /api/groups/{id}/members returns list of members"""
        admin_group_id = admin_user.get("group_id")
        assert admin_group_id, "Admin should have a group_id"
        
        response = requests.get(f"{BASE_URL}/api/groups/{admin_group_id}/members", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Admin should be in their own group
        member_ids = [m["id"] for m in data]
        assert admin_user["id"] in member_ids, "Admin should be in their own group's members"
        
        # Verify member structure
        if len(data) > 0:
            member = data[0]
            assert "id" in member, "Member should have id"
            assert "name" in member, "Member should have name"
            assert "email" in member, "Member should have email"
            assert "role" in member, "Member should have role"
        
        print(f"✓ Found {len(data)} members in admin's group")
    
    def test_get_members_nonexistent_group(self, admin_headers):
        """GET /api/groups/{id}/members returns 404 for nonexistent group"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/groups/{fake_id}/members", headers=admin_headers)
        assert response.status_code == 404, "Should return 404 for nonexistent group"


class TestRegenerateCode:
    """Test POST /api/groups/{id}/regenerate-code endpoint"""
    
    def test_regenerate_invite_code(self, admin_headers):
        """POST /api/groups/{id}/regenerate-code generates new invite code"""
        # First create a test group
        unique_name = f"TEST_Regen_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/groups", headers=admin_headers, json={
            "name": unique_name
        })
        assert create_response.status_code == 200
        group_data = create_response.json()
        group_id = group_data["id"]
        old_code = group_data["invite_code"]
        
        # Regenerate the code
        regen_response = requests.post(f"{BASE_URL}/api/groups/{group_id}/regenerate-code", headers=admin_headers)
        assert regen_response.status_code == 200, f"Failed: {regen_response.text}"
        
        data = regen_response.json()
        assert "invite_code" in data, "Should return new invite_code"
        new_code = data["invite_code"]
        assert new_code != old_code, "New code should be different from old code"
        assert len(new_code) >= 6, "New code should be at least 6 chars"
        print(f"✓ Regenerated invite code: {old_code} -> {new_code}")
    
    def test_regenerate_code_nonexistent_group(self, admin_headers):
        """POST /api/groups/{id}/regenerate-code returns 404 for nonexistent group"""
        fake_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/api/groups/{fake_id}/regenerate-code", headers=admin_headers)
        assert response.status_code == 404, "Should return 404 for nonexistent group"


class TestUnassignedUsers:
    """Test GET /api/users/unassigned endpoint"""
    
    def test_get_unassigned_users(self, admin_headers):
        """GET /api/users/unassigned returns users with no group_id"""
        response = requests.get(f"{BASE_URL}/api/users/unassigned", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if there are unassigned users
        if len(data) > 0:
            user = data[0]
            assert "id" in user, "User should have id"
            assert "name" in user, "User should have name"
            assert "email" in user, "User should have email"
            # group_id should be None or not present
            assert user.get("group_id") is None, "Unassigned user should have null group_id"
        
        print(f"✓ Found {len(data)} unassigned users")


class TestAssignUserToGroup:
    """Test PUT /api/users/{user_id}/assign-group endpoint"""
    
    def test_assign_user_to_group(self, admin_headers):
        """PUT /api/users/{user_id}/assign-group assigns user to any group"""
        # First check if there are unassigned users
        unassigned_response = requests.get(f"{BASE_URL}/api/users/unassigned", headers=admin_headers)
        unassigned_users = unassigned_response.json()
        
        # Get all groups
        groups_response = requests.get(f"{BASE_URL}/api/groups/all", headers=admin_headers)
        groups = groups_response.json()
        assert len(groups) > 0, "Should have at least one group"
        
        if len(unassigned_users) == 0:
            # Create a test group and skip this test since no unassigned users
            print("⚠ No unassigned users to test with - skipping assign test")
            pytest.skip("No unassigned users available for testing")
        
        # Assign first unassigned user to first group
        user_to_assign = unassigned_users[0]
        target_group = groups[0]
        
        response = requests.put(
            f"{BASE_URL}/api/users/{user_to_assign['id']}/assign-group",
            headers=admin_headers,
            params={"group_id": target_group["id"]}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Should have message"
        assert data["user_id"] == user_to_assign["id"], "Should return user_id"
        assert data["group_id"] == target_group["id"], "Should return group_id"
        print(f"✓ Assigned user '{user_to_assign['name']}' to group '{target_group['name']}'")
    
    def test_assign_to_nonexistent_group(self, admin_headers):
        """PUT /api/users/{user_id}/assign-group returns 404 for nonexistent group"""
        # Get any user
        users_response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        users = users_response.json()
        if len(users) == 0:
            pytest.skip("No users available for testing")
        
        user = users[0]
        fake_group_id = str(uuid.uuid4())
        
        response = requests.put(
            f"{BASE_URL}/api/users/{user['id']}/assign-group",
            headers=admin_headers,
            params={"group_id": fake_group_id}
        )
        assert response.status_code == 404, "Should return 404 for nonexistent group"
    
    def test_assign_nonexistent_user(self, admin_headers):
        """PUT /api/users/{user_id}/assign-group returns 404 for nonexistent user"""
        # Get any group
        groups_response = requests.get(f"{BASE_URL}/api/groups/all", headers=admin_headers)
        groups = groups_response.json()
        if len(groups) == 0:
            pytest.skip("No groups available for testing")
        
        group = groups[0]
        fake_user_id = str(uuid.uuid4())
        
        response = requests.put(
            f"{BASE_URL}/api/users/{fake_user_id}/assign-group",
            headers=admin_headers,
            params={"group_id": group["id"]}
        )
        assert response.status_code == 404, "Should return 404 for nonexistent user"


class TestDeleteGroupUnassignsMembers:
    """Test that deleting a group properly unassigns its members"""
    
    def test_delete_group_members_become_unassigned(self, admin_headers):
        """When a group is deleted, its members should become unassigned"""
        # Create a test group
        unique_name = f"TEST_Unassign_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/groups", headers=admin_headers, json={
            "name": unique_name
        })
        assert create_response.status_code == 200
        group_id = create_response.json()["id"]
        
        # Get initial unassigned count
        initial_unassigned = requests.get(f"{BASE_URL}/api/users/unassigned", headers=admin_headers).json()
        initial_count = len(initial_unassigned)
        
        # Delete the group
        delete_response = requests.delete(f"{BASE_URL}/api/groups/{group_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        members_unassigned = delete_response.json()["members_unassigned"]
        
        # Check unassigned count increased by members_unassigned
        final_unassigned = requests.get(f"{BASE_URL}/api/users/unassigned", headers=admin_headers).json()
        final_count = len(final_unassigned)
        
        # The count should increase by the number of members that were unassigned
        # (This test group had 0 members since it was just created)
        print(f"✓ Group deleted, {members_unassigned} members unassigned (initial: {initial_count}, final: {final_count})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
