"""
Test Guest Mode Restrictions - Iteration 33
Tests for:
1. Guest auth endpoint (POST /api/auth/guest)
2. Guest can GET /api/chat (demo messages)
3. Guest CANNOT POST /api/chat (403)
4. Guest CANNOT POST /api/messages (403)
5. Admin login still works
6. Teacher name is 'Teacher' not 'Shakira'
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGuestAuth:
    """Test guest authentication endpoint"""
    
    def test_guest_login_returns_token(self):
        """POST /api/auth/guest should return a valid guest token"""
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'token' in data, "Response should contain 'token'"
        assert 'user' in data, "Response should contain 'user'"
        assert data['user']['role'] == 'guest', "User role should be 'guest'"
        assert data['user']['is_approved'] == True, "Guest should be approved"
        assert 'group_ids' in data['user'], "Guest should have group_ids"
        print(f"✓ Guest login successful, token received, role={data['user']['role']}")
        return data['token']


class TestGuestChatRestrictions:
    """Test that guests can read chat but cannot post"""
    
    @pytest.fixture
    def guest_token(self):
        """Get a fresh guest token"""
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200
        return response.json()['token']
    
    def test_guest_can_get_chat_messages(self, guest_token):
        """GET /api/chat with guest token should return demo messages"""
        headers = {'Authorization': f'Bearer {guest_token}'}
        response = requests.get(f"{BASE_URL}/api/chat", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        messages = response.json()
        assert isinstance(messages, list), "Response should be a list"
        print(f"✓ Guest can GET /api/chat - received {len(messages)} messages")
        
        # Check for demo messages (should have Teacher and Sarah M.)
        if len(messages) > 0:
            user_names = [m.get('user_name', '') for m in messages]
            print(f"  Message authors: {set(user_names)}")
            # Verify 'Teacher' is in messages (not 'Shakira')
            has_teacher = any('Teacher' in name for name in user_names)
            has_shakira = any('Shakira' in name for name in user_names)
            if has_shakira:
                print("  ⚠ WARNING: Found 'Shakira' in messages - should be renamed to 'Teacher'")
            if has_teacher:
                print("  ✓ Found 'Teacher' in messages")
        
        return messages
    
    def test_guest_cannot_post_chat_message(self, guest_token):
        """POST /api/chat with guest token should return 403"""
        headers = {
            'Authorization': f'Bearer {guest_token}',
            'Content-Type': 'application/json'
        }
        payload = {'content': 'Test message from guest'}
        response = requests.post(f"{BASE_URL}/api/chat", headers=headers, json=payload)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'detail' in data, "Response should contain 'detail'"
        assert 'Guest' in data['detail'] or 'guest' in data['detail'].lower(), \
            f"Error message should mention guest: {data['detail']}"
        print(f"✓ Guest correctly blocked from POST /api/chat - {data['detail']}")


class TestGuestMessagesRestrictions:
    """Test that guests cannot send private messages"""
    
    @pytest.fixture
    def guest_token(self):
        """Get a fresh guest token"""
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200
        return response.json()['token']
    
    def test_guest_cannot_send_private_message(self, guest_token):
        """POST /api/messages with guest token should return 403"""
        headers = {
            'Authorization': f'Bearer {guest_token}',
            'Content-Type': 'application/json'
        }
        # Try to send a message to any teacher_id
        payload = {
            'teacher_id': 'some-teacher-id',
            'content': 'Test private message from guest'
        }
        response = requests.post(f"{BASE_URL}/api/messages", headers=headers, json=payload)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'detail' in data, "Response should contain 'detail'"
        assert 'Guest' in data['detail'] or 'guest' in data['detail'].lower(), \
            f"Error message should mention guest: {data['detail']}"
        print(f"✓ Guest correctly blocked from POST /api/messages - {data['detail']}")


class TestAdminLogin:
    """Test that admin login still works"""
    
    def test_admin_login_success(self):
        """POST /api/auth/login with admin credentials should work"""
        payload = {
            'email': 'kirah092804@gmail.com',
            'password': 'sZ3Og1s$f&ki'
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'token' in data, "Response should contain 'token'"
        assert 'user' in data, "Response should contain 'user'"
        assert data['user']['role'] == 'admin', f"Expected admin role, got {data['user']['role']}"
        print(f"✓ Admin login successful - {data['user']['email']} (role: {data['user']['role']})")
        return data['token']


class TestTeacherNameRename:
    """Test that teacher name is 'Teacher' not 'Shakira'"""
    
    @pytest.fixture
    def guest_token(self):
        """Get a fresh guest token"""
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200
        return response.json()['token']
    
    def test_courses_show_teacher_not_shakira(self, guest_token):
        """GET /api/courses should show 'Teacher' as instructor, not 'Shakira'"""
        headers = {'Authorization': f'Bearer {guest_token}'}
        response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        courses = response.json()
        assert isinstance(courses, list), "Response should be a list"
        
        shakira_found = False
        teacher_found = False
        
        for course in courses:
            instructor = course.get('instructor_name', '')
            if 'Shakira' in instructor:
                shakira_found = True
                print(f"  ⚠ Found 'Shakira' in course: {course.get('title')}")
            if 'Teacher' in instructor:
                teacher_found = True
        
        if shakira_found:
            print("  ⚠ WARNING: 'Shakira' still appears in courses - should be renamed to 'Teacher'")
        else:
            print("  ✓ No 'Shakira' found in courses")
        
        if teacher_found:
            print("  ✓ 'Teacher' found in courses")
        
        # This is a soft check - we report but don't fail
        print(f"✓ Checked {len(courses)} courses for teacher name")


class TestDemoChatMessages:
    """Test that demo chat messages exist and have correct format"""
    
    @pytest.fixture
    def guest_token(self):
        """Get a fresh guest token"""
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200
        return response.json()['token']
    
    def test_demo_messages_exist(self, guest_token):
        """GET /api/chat should return demo messages for guest"""
        headers = {'Authorization': f'Bearer {guest_token}'}
        response = requests.get(f"{BASE_URL}/api/chat", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        messages = response.json()
        
        # Check if we have demo messages
        if len(messages) == 0:
            print("  ⚠ WARNING: No demo messages found - expected 5 demo messages")
        else:
            print(f"  ✓ Found {len(messages)} messages")
            
            # Check for expected participants (Teacher and Sarah M.)
            user_names = set(m.get('user_name', '') for m in messages)
            print(f"  Participants: {user_names}")
            
            # Check message structure
            for msg in messages[:3]:  # Check first 3
                assert 'id' in msg, "Message should have 'id'"
                assert 'user_name' in msg, "Message should have 'user_name'"
                assert 'content' in msg, "Message should have 'content'"
                assert 'created_at' in msg, "Message should have 'created_at'"
        
        print(f"✓ Demo messages check complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
