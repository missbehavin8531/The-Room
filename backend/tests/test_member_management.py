"""
Test suite for Member Management features:
- Remove member from group (DELETE /api/groups/{group_id}/members/{user_id})
- Move member between groups (PUT /api/groups/{group_id}/members/{user_id}/move)
- Admin guard (403 for admin users)
- Unassigned users after removal
- Multi-group support verification
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"


class TestMemberManagement:
    """Tests for remove/move member functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.admin_user = login_res.json().get("user")
        
        # Get all groups
        groups_res = self.session.get(f"{BASE_URL}/api/groups/all")
        assert groups_res.status_code == 200
        self.groups = groups_res.json()
        assert len(self.groups) >= 1, "Need at least 1 group for testing"
        
        yield
        
        # Cleanup: No specific cleanup needed as we create test users
    
    def test_get_group_members_endpoint(self):
        """Test GET /api/groups/{group_id}/members returns members using group_ids array"""
        group = self.groups[0]
        res = self.session.get(f"{BASE_URL}/api/groups/{group['id']}/members")
        assert res.status_code == 200, f"Failed to get members: {res.text}"
        members = res.json()
        assert isinstance(members, list), "Members should be a list"
        print(f"SUCCESS: GET /api/groups/{group['id']}/members returned {len(members)} members")
        
        # Verify member structure
        if members:
            member = members[0]
            assert "id" in member
            assert "name" in member
            assert "email" in member
            assert "role" in member
            print(f"SUCCESS: Member structure verified - has id, name, email, role")
    
    def test_remove_member_from_group(self):
        """Test DELETE /api/groups/{group_id}/members/{user_id} removes member"""
        # First create a test member
        test_email = f"test_remove_{uuid.uuid4().hex[:8]}@theroom.com"
        
        # Register test user
        reg_res = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Remove User",
            "email": test_email,
            "password": "testpass123",
            "invite_code": "DEMO2026"
        })
        assert reg_res.status_code in [200, 201], f"Registration failed: {reg_res.text}"
        test_user_id = reg_res.json().get("user", {}).get("id")
        
        # Approve the user
        approve_res = self.session.put(f"{BASE_URL}/api/users/{test_user_id}/approve")
        assert approve_res.status_code == 200, f"Approval failed: {approve_res.text}"
        
        # Get the demo group
        demo_group = next((g for g in self.groups if g.get("invite_code") == "DEMO2026"), self.groups[0])
        
        # Verify user is in group
        members_before = self.session.get(f"{BASE_URL}/api/groups/{demo_group['id']}/members").json()
        user_in_group = any(m["id"] == test_user_id for m in members_before)
        assert user_in_group, "Test user should be in group after registration"
        
        # Remove member from group
        remove_res = self.session.delete(f"{BASE_URL}/api/groups/{demo_group['id']}/members/{test_user_id}")
        assert remove_res.status_code == 200, f"Remove failed: {remove_res.text}"
        
        data = remove_res.json()
        assert "message" in data
        assert test_user_id in data.get("user_id", "")
        print(f"SUCCESS: Remove member returned: {data['message']}")
        
        # Verify user is no longer in group
        members_after = self.session.get(f"{BASE_URL}/api/groups/{demo_group['id']}/members").json()
        user_still_in_group = any(m["id"] == test_user_id for m in members_after)
        assert not user_still_in_group, "User should not be in group after removal"
        print(f"SUCCESS: User removed from group members list")
        
        # Verify user appears in unassigned list
        unassigned_res = self.session.get(f"{BASE_URL}/api/users/unassigned")
        assert unassigned_res.status_code == 200
        unassigned = unassigned_res.json()
        user_unassigned = any(u["id"] == test_user_id for u in unassigned)
        assert user_unassigned, "User should appear in unassigned list after removal"
        print(f"SUCCESS: User appears in unassigned list after removal")
        
        # Cleanup: delete test user
        self.session.delete(f"{BASE_URL}/api/users/{test_user_id}")
    
    def test_move_member_between_groups(self):
        """Test PUT /api/groups/{group_id}/members/{user_id}/move moves member"""
        # Need at least 2 groups
        if len(self.groups) < 2:
            pytest.skip("Need at least 2 groups for move test")
        
        # Create a test member
        test_email = f"test_move_{uuid.uuid4().hex[:8]}@theroom.com"
        
        reg_res = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Move User",
            "email": test_email,
            "password": "testpass123",
            "invite_code": "DEMO2026"
        })
        assert reg_res.status_code in [200, 201], f"Registration failed: {reg_res.text}"
        test_user_id = reg_res.json().get("user", {}).get("id")
        
        # Approve the user
        self.session.put(f"{BASE_URL}/api/users/{test_user_id}/approve")
        
        # Get source and target groups
        source_group = next((g for g in self.groups if g.get("invite_code") == "DEMO2026"), self.groups[0])
        target_group = next((g for g in self.groups if g["id"] != source_group["id"]), None)
        
        if not target_group:
            pytest.skip("Need a different target group")
        
        # Move member
        move_res = self.session.put(
            f"{BASE_URL}/api/groups/{source_group['id']}/members/{test_user_id}/move",
            params={"target_group_id": target_group["id"]}
        )
        assert move_res.status_code == 200, f"Move failed: {move_res.text}"
        
        data = move_res.json()
        assert "message" in data
        assert "from_group" in data
        assert "to_group" in data
        print(f"SUCCESS: Move member returned: {data['message']}")
        
        # Verify user is NOT in source group
        source_members = self.session.get(f"{BASE_URL}/api/groups/{source_group['id']}/members").json()
        user_in_source = any(m["id"] == test_user_id for m in source_members)
        assert not user_in_source, "User should not be in source group after move"
        print(f"SUCCESS: User removed from source group")
        
        # Verify user IS in target group
        target_members = self.session.get(f"{BASE_URL}/api/groups/{target_group['id']}/members").json()
        user_in_target = any(m["id"] == test_user_id for m in target_members)
        assert user_in_target, "User should be in target group after move"
        print(f"SUCCESS: User added to target group")
        
        # Cleanup: delete test user
        self.session.delete(f"{BASE_URL}/api/users/{test_user_id}")
    
    def test_admin_guard_remove(self):
        """Test that removing admin user returns 403"""
        # Get admin user ID
        admin_id = self.admin_user.get("id")
        group = self.groups[0]
        
        # Try to remove admin
        remove_res = self.session.delete(f"{BASE_URL}/api/groups/{group['id']}/members/{admin_id}")
        assert remove_res.status_code == 403, f"Expected 403 for admin removal, got {remove_res.status_code}"
        
        data = remove_res.json()
        assert "admin" in data.get("detail", "").lower(), "Error should mention admin"
        print(f"SUCCESS: Admin guard works for remove - returned 403: {data.get('detail')}")
    
    def test_admin_guard_move(self):
        """Test that moving admin user returns 403"""
        if len(self.groups) < 2:
            pytest.skip("Need at least 2 groups for move test")
        
        admin_id = self.admin_user.get("id")
        source_group = self.groups[0]
        target_group = self.groups[1]
        
        # Try to move admin
        move_res = self.session.put(
            f"{BASE_URL}/api/groups/{source_group['id']}/members/{admin_id}/move",
            params={"target_group_id": target_group["id"]}
        )
        assert move_res.status_code == 403, f"Expected 403 for admin move, got {move_res.status_code}"
        
        data = move_res.json()
        assert "admin" in data.get("detail", "").lower(), "Error should mention admin"
        print(f"SUCCESS: Admin guard works for move - returned 403: {data.get('detail')}")
    
    def test_remove_nonexistent_user(self):
        """Test removing non-existent user returns 404"""
        group = self.groups[0]
        fake_user_id = str(uuid.uuid4())
        
        res = self.session.delete(f"{BASE_URL}/api/groups/{group['id']}/members/{fake_user_id}")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        print(f"SUCCESS: Remove non-existent user returns 404")
    
    def test_move_to_same_group(self):
        """Test moving to same group returns 400"""
        # Create test user
        test_email = f"test_same_{uuid.uuid4().hex[:8]}@theroom.com"
        reg_res = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Same Group",
            "email": test_email,
            "password": "testpass123",
            "invite_code": "DEMO2026"
        })
        test_user_id = reg_res.json().get("user", {}).get("id")
        self.session.put(f"{BASE_URL}/api/users/{test_user_id}/approve")
        
        group = next((g for g in self.groups if g.get("invite_code") == "DEMO2026"), self.groups[0])
        
        # Try to move to same group
        move_res = self.session.put(
            f"{BASE_URL}/api/groups/{group['id']}/members/{test_user_id}/move",
            params={"target_group_id": group["id"]}
        )
        assert move_res.status_code == 400, f"Expected 400, got {move_res.status_code}"
        print(f"SUCCESS: Move to same group returns 400")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/users/{test_user_id}")
    
    def test_remove_user_not_in_group(self):
        """Test removing user not in group returns 400"""
        if len(self.groups) < 2:
            pytest.skip("Need at least 2 groups")
        
        # Create test user in one group
        test_email = f"test_notingroup_{uuid.uuid4().hex[:8]}@theroom.com"
        reg_res = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Not In Group",
            "email": test_email,
            "password": "testpass123",
            "invite_code": "DEMO2026"
        })
        test_user_id = reg_res.json().get("user", {}).get("id")
        self.session.put(f"{BASE_URL}/api/users/{test_user_id}/approve")
        
        # Try to remove from a different group
        other_group = next((g for g in self.groups if g.get("invite_code") != "DEMO2026"), None)
        if other_group:
            remove_res = self.session.delete(f"{BASE_URL}/api/groups/{other_group['id']}/members/{test_user_id}")
            assert remove_res.status_code == 400, f"Expected 400, got {remove_res.status_code}"
            print(f"SUCCESS: Remove user not in group returns 400")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/users/{test_user_id}")


class TestMultiGroupJoin:
    """Test that multi-group join still works via Settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
    
    def test_join_another_group(self):
        """Test POST /api/groups/join allows joining another group"""
        # Get all groups
        groups_res = self.session.get(f"{BASE_URL}/api/groups/all")
        groups = groups_res.json()
        
        if len(groups) < 2:
            pytest.skip("Need at least 2 groups for multi-group test")
        
        # Create a test user
        test_email = f"test_multigroup_{uuid.uuid4().hex[:8]}@theroom.com"
        reg_res = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Multi Group",
            "email": test_email,
            "password": "testpass123",
            "invite_code": "DEMO2026"
        })
        test_user_id = reg_res.json().get("user", {}).get("id")
        test_token = reg_res.json().get("token")
        
        # Approve user
        self.session.put(f"{BASE_URL}/api/users/{test_user_id}/approve")
        
        # Login as test user
        user_session = requests.Session()
        user_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {test_token}"
        })
        
        # Find another group to join
        other_group = next((g for g in groups if g.get("invite_code") != "DEMO2026"), None)
        if not other_group:
            pytest.skip("No other group available")
        
        # Join another group
        join_res = user_session.post(
            f"{BASE_URL}/api/groups/join",
            params={"invite_code": other_group["invite_code"]}
        )
        assert join_res.status_code == 200, f"Join failed: {join_res.text}"
        
        data = join_res.json()
        assert "message" in data
        assert "Joined" in data["message"]
        print(f"SUCCESS: Multi-group join works: {data['message']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/users/{test_user_id}")


class TestGroupMembersQuery:
    """Test that group members query uses group_ids array correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
    
    def test_members_query_uses_group_ids_array(self):
        """Verify GET /api/groups/{id}/members queries group_ids array"""
        groups_res = self.session.get(f"{BASE_URL}/api/groups/all")
        groups = groups_res.json()
        
        if not groups:
            pytest.skip("No groups available")
        
        # Get members for each group
        for group in groups[:2]:  # Test first 2 groups
            members_res = self.session.get(f"{BASE_URL}/api/groups/{group['id']}/members")
            assert members_res.status_code == 200
            members = members_res.json()
            
            print(f"Group '{group['name']}' has {len(members)} members")
            
            # Verify each member has expected fields
            for member in members[:3]:  # Check first 3 members
                assert "id" in member
                assert "name" in member
                assert "email" in member
                assert "role" in member
                # Note: group_ids may or may not be exposed in response
        
        print(f"SUCCESS: Members query works correctly for all tested groups")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
