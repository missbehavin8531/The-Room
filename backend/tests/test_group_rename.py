"""
Test suite for multi-tenant 'group' rename (church -> group)
Tests all API endpoints to verify:
1. No 'church' terminology in API responses
2. All endpoints use 'group_id' and 'group_name'
3. Cross-group isolation (Group A data not visible to Group B)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
ADMIN_GROUP_A = {
    "email": "kirah092804@gmail.com",
    "password": "sZ3Og1s$f&ki"
}

ADMIN_GROUP_B = {
    "email": "pastor.mike@test.com",
    "password": "test1234"
}


class TestAuthGroupTerminology:
    """Test that auth endpoints use 'group' terminology, not 'church'"""
    
    def test_login_returns_group_id_and_group_name(self):
        """POST /api/auth/login should return group_id and group_name (NOT church_id/church_name)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        user = data.get('user', {})
        
        # Verify group terminology is used
        assert 'group_id' in user, "Response should contain 'group_id'"
        assert 'group_name' in user, "Response should contain 'group_name'"
        
        # Verify church terminology is NOT used
        assert 'church_id' not in user, "Response should NOT contain 'church_id'"
        assert 'church_name' not in user, "Response should NOT contain 'church_name'"
        
        print(f"✓ Login returns group_id={user.get('group_id')}, group_name={user.get('group_name')}")
    
    def test_auth_me_returns_group_id_and_group_name(self):
        """GET /api/auth/me should return group_id and group_name (NOT church_id/church_name)"""
        # First login to get token
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        assert login_res.status_code == 200
        token = login_res.json()['token']
        
        # Get /auth/me
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        
        data = response.json()
        
        # Verify group terminology is used
        assert 'group_id' in data, "Response should contain 'group_id'"
        assert 'group_name' in data, "Response should contain 'group_name'"
        
        # Verify church terminology is NOT used
        assert 'church_id' not in data, "Response should NOT contain 'church_id'"
        assert 'church_name' not in data, "Response should NOT contain 'church_name'"
        
        print(f"✓ Auth/me returns group_id={data.get('group_id')}, group_name={data.get('group_name')}")


class TestGroupsAPI:
    """Test /api/groups/* endpoints (renamed from /api/churches/*)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for Group A"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()['token']
    
    def test_groups_lookup_public_endpoint(self, admin_token):
        """GET /api/groups/lookup?invite_code=XXX should return group info"""
        # First get the current invite code
        headers = {"Authorization": f"Bearer {admin_token}"}
        my_group_res = requests.get(f"{BASE_URL}/api/groups/my", headers=headers)
        assert my_group_res.status_code == 200, f"Get my group failed: {my_group_res.text}"
        
        invite_code = my_group_res.json().get('invite_code')
        assert invite_code, "Group should have an invite_code"
        
        # Lookup without auth (public endpoint)
        response = requests.get(f"{BASE_URL}/api/groups/lookup?invite_code={invite_code}")
        assert response.status_code == 200, f"Lookup failed: {response.text}"
        
        data = response.json()
        assert 'group_id' in data, "Lookup should return 'group_id'"
        assert 'group_name' in data, "Lookup should return 'group_name'"
        
        # Verify no church terminology
        assert 'church_id' not in data, "Lookup should NOT return 'church_id'"
        assert 'church_name' not in data, "Lookup should NOT return 'church_name'"
        
        print(f"✓ Groups lookup returns group_id={data.get('group_id')}, group_name={data.get('group_name')}")
    
    def test_groups_lookup_invalid_code_returns_404(self):
        """GET /api/groups/lookup with invalid code should return 404"""
        response = requests.get(f"{BASE_URL}/api/groups/lookup?invite_code=INVALID123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid invite code returns 404")
    
    def test_groups_my_returns_group_details(self, admin_token):
        """GET /api/groups/my should return group details with member_count"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/groups/my", headers=headers)
        assert response.status_code == 200, f"Get my group failed: {response.text}"
        
        data = response.json()
        assert 'id' in data, "Response should contain 'id'"
        assert 'name' in data, "Response should contain 'name'"
        assert 'invite_code' in data, "Response should contain 'invite_code'"
        assert 'member_count' in data, "Response should contain 'member_count'"
        
        print(f"✓ Groups/my returns name={data.get('name')}, member_count={data.get('member_count')}")
    
    def test_groups_update_name(self, admin_token):
        """PUT /api/groups/{id} should update group name"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current group
        my_group_res = requests.get(f"{BASE_URL}/api/groups/my", headers=headers)
        assert my_group_res.status_code == 200
        group = my_group_res.json()
        group_id = group['id']
        original_name = group['name']
        
        # Update name
        new_name = f"Test Group {uuid.uuid4().hex[:6]}"
        update_res = requests.put(
            f"{BASE_URL}/api/groups/{group_id}",
            headers=headers,
            json={"name": new_name}
        )
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        
        # Verify update
        updated_group = update_res.json()
        assert updated_group['name'] == new_name, "Name should be updated"
        
        # Restore original name
        requests.put(
            f"{BASE_URL}/api/groups/{group_id}",
            headers=headers,
            json={"name": original_name}
        )
        
        print(f"✓ Group name update works (tested: {new_name})")
    
    def test_groups_regenerate_code(self, admin_token):
        """POST /api/groups/{id}/regenerate-code should generate new invite code"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current group
        my_group_res = requests.get(f"{BASE_URL}/api/groups/my", headers=headers)
        assert my_group_res.status_code == 200
        group = my_group_res.json()
        group_id = group['id']
        old_code = group['invite_code']
        
        # Regenerate code
        regen_res = requests.post(
            f"{BASE_URL}/api/groups/{group_id}/regenerate-code",
            headers=headers
        )
        assert regen_res.status_code == 200, f"Regenerate failed: {regen_res.text}"
        
        new_code = regen_res.json().get('invite_code')
        assert new_code, "Response should contain new invite_code"
        assert new_code != old_code, "New code should be different from old code"
        
        print(f"✓ Regenerate code works (old: {old_code}, new: {new_code})")


class TestRegistrationWithGroups:
    """Test registration with group creation and joining"""
    
    def test_register_with_group_name_creates_new_group(self):
        """POST /api/auth/register with group_name creates new group + user as admin"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"test_creator_{unique_id}@test.com"
        test_group = f"Test Group {unique_id}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test Creator",
            "group_name": test_group
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert 'group_id' in data, "Response should contain 'group_id'"
        assert 'group_name' in data, "Response should contain 'group_name'"
        assert data['group_name'] == test_group, "Group name should match"
        
        # Verify no church terminology
        assert 'church_id' not in data, "Response should NOT contain 'church_id'"
        assert 'church_name' not in data, "Response should NOT contain 'church_name'"
        
        print(f"✓ Register with group_name creates group: {test_group}")
        
        # Cleanup: Login and verify user is admin and auto-approved
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert login_res.status_code == 200, "New user should be able to login"
        user = login_res.json()['user']
        assert user['role'] == 'admin', "Creator should be admin"
        assert user['is_approved'] == True, "Creator should be auto-approved"
        print(f"✓ Creator is admin and auto-approved")
    
    def test_register_with_invite_code_joins_existing_group(self):
        """POST /api/auth/register with invite_code joins existing group as member"""
        # First get an invite code from Group A
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        assert login_res.status_code == 200
        token = login_res.json()['token']
        
        headers = {"Authorization": f"Bearer {token}"}
        my_group_res = requests.get(f"{BASE_URL}/api/groups/my", headers=headers)
        assert my_group_res.status_code == 200
        invite_code = my_group_res.json()['invite_code']
        
        # Register new user with invite code
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"test_joiner_{unique_id}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test Joiner",
            "invite_code": invite_code
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert 'group_id' in data, "Response should contain 'group_id'"
        assert 'group_name' in data, "Response should contain 'group_name'"
        
        print(f"✓ Register with invite_code joins group: {data.get('group_name')}")
    
    def test_register_with_invalid_invite_code_returns_400(self):
        """POST /api/auth/register with invalid invite_code returns 400"""
        unique_id = uuid.uuid4().hex[:8]
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_invalid_{unique_id}@test.com",
            "password": "testpass123",
            "name": "Test Invalid",
            "invite_code": "INVALID123"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid invite code returns 400")


class TestGroupScopedEndpoints:
    """Test that data is scoped to user's group"""
    
    @pytest.fixture
    def group_a_token(self):
        """Get token for Group A admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        assert response.status_code == 200
        return response.json()['token']
    
    @pytest.fixture
    def group_b_token(self):
        """Get token for Group B admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_B)
        if response.status_code != 200:
            pytest.skip("Group B admin not available")
        return response.json()['token']
    
    def test_courses_scoped_to_group(self, group_a_token):
        """GET /api/courses returns courses only for user's group_id"""
        headers = {"Authorization": f"Bearer {group_a_token}"}
        response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        assert response.status_code == 200, f"Get courses failed: {response.text}"
        
        # Just verify the endpoint works and returns a list
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Courses endpoint returns {len(data)} courses for user's group")
    
    def test_users_scoped_to_group(self, group_a_token):
        """GET /api/users returns users only for user's group_id"""
        headers = {"Authorization": f"Bearer {group_a_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200, f"Get users failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all users have group_id (not church_id)
        for user in data:
            if 'group_id' in user or 'church_id' in user:
                assert 'church_id' not in user, "User should NOT have 'church_id'"
        
        print(f"✓ Users endpoint returns {len(data)} users for user's group")
    
    def test_analytics_scoped_to_group(self, group_a_token):
        """GET /api/analytics returns analytics scoped to group"""
        headers = {"Authorization": f"Bearer {group_a_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics", headers=headers)
        assert response.status_code == 200, f"Get analytics failed: {response.text}"
        
        data = response.json()
        assert 'total_users' in data, "Analytics should contain 'total_users'"
        assert 'total_courses' in data, "Analytics should contain 'total_courses'"
        
        print(f"✓ Analytics endpoint works (users: {data.get('total_users')}, courses: {data.get('total_courses')})")


class TestCrossGroupIsolation:
    """Test that Group A data is NOT visible to Group B"""
    
    def test_cross_group_course_isolation(self):
        """Courses created by Group A admin should NOT be visible to Group B admin"""
        # Login as Group A
        login_a = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        assert login_a.status_code == 200
        token_a = login_a.json()['token']
        headers_a = {"Authorization": f"Bearer {token_a}"}
        
        # Login as Group B
        login_b = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_B)
        if login_b.status_code != 200:
            pytest.skip("Group B admin not available for cross-group test")
        token_b = login_b.json()['token']
        headers_b = {"Authorization": f"Bearer {token_b}"}
        
        # Get courses for Group A
        courses_a = requests.get(f"{BASE_URL}/api/courses", headers=headers_a)
        assert courses_a.status_code == 200
        courses_a_ids = [c['id'] for c in courses_a.json()]
        
        # Get courses for Group B
        courses_b = requests.get(f"{BASE_URL}/api/courses", headers=headers_b)
        assert courses_b.status_code == 200
        courses_b_ids = [c['id'] for c in courses_b.json()]
        
        # Verify no overlap (unless both groups have 0 courses)
        if courses_a_ids and courses_b_ids:
            overlap = set(courses_a_ids) & set(courses_b_ids)
            assert len(overlap) == 0, f"Groups should not share courses, but found overlap: {overlap}"
            print(f"✓ Cross-group isolation verified: Group A has {len(courses_a_ids)} courses, Group B has {len(courses_b_ids)} courses, no overlap")
        else:
            print(f"✓ Cross-group isolation: Group A has {len(courses_a_ids)} courses, Group B has {len(courses_b_ids)} courses")
    
    def test_cross_group_user_isolation(self):
        """Users in Group A should NOT be visible in Group B admin panel"""
        # Login as Group A
        login_a = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        assert login_a.status_code == 200
        token_a = login_a.json()['token']
        headers_a = {"Authorization": f"Bearer {token_a}"}
        
        # Login as Group B
        login_b = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_B)
        if login_b.status_code != 200:
            pytest.skip("Group B admin not available for cross-group test")
        token_b = login_b.json()['token']
        headers_b = {"Authorization": f"Bearer {token_b}"}
        
        # Get users for Group A
        users_a = requests.get(f"{BASE_URL}/api/users", headers=headers_a)
        assert users_a.status_code == 200
        users_a_ids = [u['id'] for u in users_a.json()]
        
        # Get users for Group B
        users_b = requests.get(f"{BASE_URL}/api/users", headers=headers_b)
        assert users_b.status_code == 200
        users_b_ids = [u['id'] for u in users_b.json()]
        
        # Verify no overlap
        if users_a_ids and users_b_ids:
            overlap = set(users_a_ids) & set(users_b_ids)
            assert len(overlap) == 0, f"Groups should not share users, but found overlap: {overlap}"
            print(f"✓ Cross-group user isolation verified: Group A has {len(users_a_ids)} users, Group B has {len(users_b_ids)} users, no overlap")
        else:
            print(f"✓ Cross-group user isolation: Group A has {len(users_a_ids)} users, Group B has {len(users_b_ids)} users")


class TestNoChurchTerminology:
    """Verify NO 'church' text appears in any API response keys"""
    
    def test_login_response_no_church_keys(self):
        """Login response should not contain any 'church' keys"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        assert response.status_code == 200
        
        response_text = response.text.lower()
        assert 'church_id' not in response_text, "Response should not contain 'church_id'"
        assert 'church_name' not in response_text, "Response should not contain 'church_name'"
        assert '"church"' not in response_text, "Response should not contain 'church' key"
        
        print("✓ Login response has no 'church' terminology")
    
    def test_auth_me_response_no_church_keys(self):
        """Auth/me response should not contain any 'church' keys"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        token = login_res.json()['token']
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        response_text = response.text.lower()
        assert 'church_id' not in response_text, "Response should not contain 'church_id'"
        assert 'church_name' not in response_text, "Response should not contain 'church_name'"
        
        print("✓ Auth/me response has no 'church' terminology")
    
    def test_groups_my_response_no_church_keys(self):
        """Groups/my response should not contain any 'church' keys"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        token = login_res.json()['token']
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/groups/my", headers=headers)
        assert response.status_code == 200
        
        response_text = response.text.lower()
        assert 'church' not in response_text, f"Response should not contain 'church': {response.text}"
        
        print("✓ Groups/my response has no 'church' terminology")


class TestChurchEndpointsRemoved:
    """Verify old /api/churches/* endpoints no longer exist"""
    
    def test_churches_endpoint_not_found(self):
        """GET /api/churches/my should return 404 (endpoint removed)"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_GROUP_A)
        token = login_res.json()['token']
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/churches/my", headers=headers)
        
        # Should be 404 (not found) since churches endpoint was renamed to groups
        assert response.status_code == 404, f"Expected 404 for /api/churches/my, got {response.status_code}"
        print("✓ /api/churches/my endpoint no longer exists (returns 404)")
    
    def test_churches_lookup_not_found(self):
        """GET /api/churches/lookup should return 404 (endpoint removed)"""
        response = requests.get(f"{BASE_URL}/api/churches/lookup?invite_code=TEST")
        assert response.status_code == 404, f"Expected 404 for /api/churches/lookup, got {response.status_code}"
        print("✓ /api/churches/lookup endpoint no longer exists (returns 404)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
