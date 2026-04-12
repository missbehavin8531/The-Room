"""
Test iteration 37 features:
1. Bug fix: Marking 'I Attended' should unlock next lesson (creates lesson_completions)
2. Bug fix: Recording URL should be optional when creating a lesson
3. P2 - Chat Reactions: POST /api/chat/{id}/react?emoji=👍 toggles reactions
4. P2 - Chat Read Receipts: POST /api/chat/mark-read and GET /api/chat/read-receipts
5. First lesson (order 0 or 1) should always be unlocked
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"


class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get admin headers"""
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Admin login successful: {data['user']['name']}")


class TestLessonUnlockBugFix:
    """Test that marking 'I Attended' unlocks the next lesson"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_first_lesson_always_unlocked(self, admin_headers):
        """First lesson (order 0 or 1) should always be unlocked"""
        # Get courses
        response = requests.get(f"{BASE_URL}/api/courses", headers=admin_headers)
        assert response.status_code == 200
        courses = response.json()
        
        if not courses:
            pytest.skip("No courses available")
        
        # Get lessons for first course
        course_id = courses[0]["id"]
        response = requests.get(f"{BASE_URL}/api/courses/{course_id}/lessons", headers=admin_headers)
        assert response.status_code == 200
        lessons = response.json()
        
        if not lessons:
            pytest.skip("No lessons available")
        
        # First lesson should be unlocked
        first_lesson = lessons[0]
        assert first_lesson.get("is_unlocked", True) == True, "First lesson should be unlocked"
        print(f"✓ First lesson '{first_lesson['title']}' is unlocked (order: {first_lesson.get('order', 0)})")
    
    def test_attendance_marked_attended_creates_completion(self, admin_headers):
        """Marking 'marked_attended' should create a lesson_completion record"""
        # Get courses and lessons
        response = requests.get(f"{BASE_URL}/api/courses", headers=admin_headers)
        assert response.status_code == 200
        courses = response.json()
        
        if not courses:
            pytest.skip("No courses available")
        
        course_id = courses[0]["id"]
        response = requests.get(f"{BASE_URL}/api/courses/{course_id}/lessons", headers=admin_headers)
        assert response.status_code == 200
        lessons = response.json()
        
        if not lessons:
            pytest.skip("No lessons available")
        
        # Get first lesson
        first_lesson = lessons[0]
        lesson_id = first_lesson["id"]
        
        # Record attendance with 'marked_attended' action
        response = requests.post(f"{BASE_URL}/api/attendance", 
            headers=admin_headers,
            json={"lesson_id": lesson_id, "action": "marked_attended"}
        )
        assert response.status_code == 200, f"Failed to record attendance: {response.text}"
        
        # Verify the lesson is now marked as completed
        response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=admin_headers)
        assert response.status_code == 200
        lesson_data = response.json()
        
        # The lesson should now be completed
        assert lesson_data.get("is_completed") == True, "Lesson should be marked as completed after 'marked_attended'"
        print(f"✓ Lesson '{first_lesson['title']}' marked as completed after 'marked_attended' action")


class TestRecordingURLOptional:
    """Test that recording URL is optional when creating a lesson"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_create_lesson_without_recording_url(self, admin_headers):
        """Should be able to create a lesson without recording_url"""
        # Get a course
        response = requests.get(f"{BASE_URL}/api/courses", headers=admin_headers)
        assert response.status_code == 200
        courses = response.json()
        
        if not courses:
            pytest.skip("No courses available")
        
        course_id = courses[0]["id"]
        
        # Create lesson without recording_url
        lesson_data = {
            "course_id": course_id,
            "title": "TEST_Lesson_No_Recording_URL",
            "description": "Test lesson created without recording URL",
            "recording_source": "youtube",  # Set source but no URL
            "is_published": False
        }
        
        response = requests.post(f"{BASE_URL}/api/lessons", headers=admin_headers, json=lesson_data)
        assert response.status_code == 200, f"Failed to create lesson without recording URL: {response.text}"
        
        created_lesson = response.json()
        assert created_lesson["title"] == "TEST_Lesson_No_Recording_URL"
        assert created_lesson.get("recording_url") is None or created_lesson.get("recording_url") == ""
        
        print(f"✓ Lesson created successfully without recording URL")
        
        # Cleanup - delete the test lesson
        lesson_id = created_lesson["id"]
        requests.delete(f"{BASE_URL}/api/lessons/{lesson_id}", headers=admin_headers)
    
    def test_create_lesson_with_recording_url(self, admin_headers):
        """Should be able to create a lesson with recording_url"""
        # Get a course
        response = requests.get(f"{BASE_URL}/api/courses", headers=admin_headers)
        assert response.status_code == 200
        courses = response.json()
        
        if not courses:
            pytest.skip("No courses available")
        
        course_id = courses[0]["id"]
        
        # Create lesson with recording_url
        lesson_data = {
            "course_id": course_id,
            "title": "TEST_Lesson_With_Recording_URL",
            "description": "Test lesson created with recording URL",
            "recording_source": "youtube",
            "recording_url": "https://youtube.com/watch?v=test123",
            "is_published": False
        }
        
        response = requests.post(f"{BASE_URL}/api/lessons", headers=admin_headers, json=lesson_data)
        assert response.status_code == 200, f"Failed to create lesson with recording URL: {response.text}"
        
        created_lesson = response.json()
        assert created_lesson["title"] == "TEST_Lesson_With_Recording_URL"
        assert created_lesson.get("recording_url") == "https://youtube.com/watch?v=test123"
        
        print(f"✓ Lesson created successfully with recording URL")
        
        # Cleanup
        lesson_id = created_lesson["id"]
        requests.delete(f"{BASE_URL}/api/lessons/{lesson_id}", headers=admin_headers)


class TestChatReactions:
    """Test P2 - Chat Reactions feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_get_chat_messages_with_reactions(self, admin_headers):
        """GET /api/chat should return messages with reactions array"""
        response = requests.get(f"{BASE_URL}/api/chat", headers=admin_headers)
        assert response.status_code == 200
        messages = response.json()
        
        # Check that messages have reactions field
        if messages:
            first_msg = messages[0]
            assert "reactions" in first_msg, "Messages should have 'reactions' field"
            assert isinstance(first_msg["reactions"], list), "Reactions should be a list"
            print(f"✓ Chat messages include reactions array")
        else:
            print("✓ No messages to check, but endpoint works")
    
    def test_toggle_reaction_on_message(self, admin_headers):
        """POST /api/chat/{id}/react?emoji=👍 should toggle reaction"""
        # First, send a test message
        response = requests.post(f"{BASE_URL}/api/chat", headers=admin_headers, json={
            "content": "TEST_Message_For_Reactions"
        })
        assert response.status_code == 200
        message = response.json()
        message_id = message["id"]
        
        # Add a reaction
        response = requests.post(f"{BASE_URL}/api/chat/{message_id}/react?emoji=👍", headers=admin_headers)
        assert response.status_code == 200
        result = response.json()
        assert result.get("action") == "added", "First reaction should be 'added'"
        assert result.get("emoji") == "👍"
        print(f"✓ Reaction added successfully")
        
        # Toggle (remove) the same reaction
        response = requests.post(f"{BASE_URL}/api/chat/{message_id}/react?emoji=👍", headers=admin_headers)
        assert response.status_code == 200
        result = response.json()
        assert result.get("action") == "removed", "Second reaction should be 'removed'"
        print(f"✓ Reaction toggled (removed) successfully")
        
        # Cleanup - delete the test message
        requests.delete(f"{BASE_URL}/api/chat/{message_id}", headers=admin_headers)
    
    def test_get_message_reactions(self, admin_headers):
        """GET /api/chat/{id}/reactions should return grouped reactions"""
        # Send a test message
        response = requests.post(f"{BASE_URL}/api/chat", headers=admin_headers, json={
            "content": "TEST_Message_For_Reaction_List"
        })
        assert response.status_code == 200
        message = response.json()
        message_id = message["id"]
        
        # Add a reaction
        requests.post(f"{BASE_URL}/api/chat/{message_id}/react?emoji=❤️", headers=admin_headers)
        
        # Get reactions
        response = requests.get(f"{BASE_URL}/api/chat/{message_id}/reactions", headers=admin_headers)
        assert response.status_code == 200
        reactions = response.json()
        
        assert isinstance(reactions, list), "Reactions should be a list"
        if reactions:
            reaction = reactions[0]
            assert "emoji" in reaction
            assert "count" in reaction
            assert "users" in reaction
            assert "user_reacted" in reaction
            print(f"✓ Reactions endpoint returns proper structure: {reactions}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/chat/{message_id}", headers=admin_headers)


class TestChatReadReceipts:
    """Test P2 - Chat Read Receipts feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_mark_chat_as_read(self, admin_headers):
        """POST /api/chat/mark-read should record user's read time"""
        response = requests.post(f"{BASE_URL}/api/chat/mark-read", headers=admin_headers)
        assert response.status_code == 200
        result = response.json()
        assert result.get("message") == "Chat marked as read"
        print(f"✓ Chat marked as read successfully")
    
    def test_get_read_receipts(self, admin_headers):
        """GET /api/chat/read-receipts should return all readers"""
        # First mark as read
        requests.post(f"{BASE_URL}/api/chat/mark-read", headers=admin_headers)
        
        # Get read receipts
        response = requests.get(f"{BASE_URL}/api/chat/read-receipts", headers=admin_headers)
        assert response.status_code == 200
        receipts = response.json()
        
        assert isinstance(receipts, list), "Read receipts should be a list"
        if receipts:
            receipt = receipts[0]
            assert "user_id" in receipt
            assert "user_name" in receipt
            assert "last_read_at" in receipt
            print(f"✓ Read receipts returned: {len(receipts)} users")
        else:
            print("✓ Read receipts endpoint works (no receipts yet)")


class TestGuestRestrictions:
    """Test that guests cannot react or mark read"""
    
    def test_guest_cannot_react(self):
        """Guests should not be able to add reactions"""
        # Create guest session
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200
        guest_token = response.json()["token"]
        guest_headers = {"Authorization": f"Bearer {guest_token}", "Content-Type": "application/json"}
        
        # Get chat messages
        response = requests.get(f"{BASE_URL}/api/chat", headers=guest_headers)
        assert response.status_code == 200
        messages = response.json()
        
        if messages:
            message_id = messages[0]["id"]
            # Try to react - should fail
            response = requests.post(f"{BASE_URL}/api/chat/{message_id}/react?emoji=👍", headers=guest_headers)
            assert response.status_code in [401, 403], f"Guest should not be able to react: {response.status_code}"
            print(f"✓ Guest correctly blocked from reacting")
        else:
            print("✓ No messages to test, but guest restrictions should apply")
    
    def test_guest_cannot_mark_read(self):
        """Guests should not be able to mark chat as read"""
        # Create guest session
        response = requests.post(f"{BASE_URL}/api/auth/guest")
        assert response.status_code == 200
        guest_token = response.json()["token"]
        guest_headers = {"Authorization": f"Bearer {guest_token}", "Content-Type": "application/json"}
        
        # Try to mark read - should fail
        response = requests.post(f"{BASE_URL}/api/chat/mark-read", headers=guest_headers)
        assert response.status_code in [401, 403], f"Guest should not be able to mark read: {response.status_code}"
        print(f"✓ Guest correctly blocked from marking read")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
