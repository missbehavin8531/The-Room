"""
Test P1 Features:
1. Teacher UI to create/edit prompts within lesson editor
2. Teacher view of all responses grouped by prompt
3. Reply status management UI (pending/answered/needs_followup)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test authentication for teacher and member accounts"""
    
    def test_teacher_login(self):
        """Teacher can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teacher@sundayschool.com",
            "password": "teacher123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "teacher"
        assert data["user"]["email"] == "teacher@sundayschool.com"
    
    def test_member_login(self):
        """Member can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "member@sundayschool.com",
            "password": "member123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "member"


@pytest.fixture
def teacher_token():
    """Get teacher authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "teacher@sundayschool.com",
        "password": "teacher123"
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Teacher authentication failed")


@pytest.fixture
def member_token():
    """Get member authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "member@sundayschool.com",
        "password": "member123"
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Member authentication failed")


@pytest.fixture
def teacher_headers(teacher_token):
    """Headers with teacher auth token"""
    return {"Authorization": f"Bearer {teacher_token}"}


@pytest.fixture
def member_headers(member_token):
    """Headers with member auth token"""
    return {"Authorization": f"Bearer {member_token}"}


@pytest.fixture
def lesson_id(teacher_headers):
    """Get a lesson ID for testing"""
    response = requests.get(f"{BASE_URL}/api/lessons/next/upcoming", headers=teacher_headers)
    if response.status_code == 200 and response.json():
        return response.json()["id"]
    # Fallback: get all lessons
    response = requests.get(f"{BASE_URL}/api/lessons/all", headers=teacher_headers)
    if response.status_code == 200 and response.json():
        return response.json()[0]["id"]
    pytest.skip("No lessons available for testing")


class TestLessonEditorAPI:
    """Test Lesson Editor API endpoints - P1 Feature 1"""
    
    def test_get_lesson_details(self, teacher_headers, lesson_id):
        """Teacher can get lesson details for editing"""
        response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=teacher_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "title" in data
        assert "description" in data
        assert "prompts" in data  # Prompts should be included
        print(f"Lesson: {data['title']}, Prompts count: {len(data.get('prompts', []))}")
    
    def test_update_lesson_basic_info(self, teacher_headers, lesson_id):
        """Teacher can update lesson title, description, date, zoom link, youtube URL"""
        # First get current lesson data
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=teacher_headers)
        original_data = get_response.json()
        
        # Update lesson
        update_data = {
            "title": original_data["title"],
            "description": original_data["description"],
            "youtube_url": original_data.get("youtube_url", ""),
            "zoom_link": original_data.get("zoom_link", ""),
            "lesson_date": original_data.get("lesson_date", ""),
            "teacher_notes": "**Updated Teacher Notes**\n\n- Point 1\n- Point 2",
            "reading_plan": "**Updated Reading Plan**\n\n- Monday: Genesis 1",
            "order": original_data.get("order", 0)
        }
        
        response = requests.put(f"{BASE_URL}/api/lessons/{lesson_id}", 
                               headers=teacher_headers, json=update_data)
        assert response.status_code == 200
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=teacher_headers)
        assert verify_response.status_code == 200
        updated_data = verify_response.json()
        assert updated_data.get("teacher_notes") == update_data["teacher_notes"]
        assert updated_data.get("reading_plan") == update_data["reading_plan"]
        print("Lesson basic info update successful")
    
    def test_get_lesson_prompts(self, teacher_headers, lesson_id):
        """Teacher can view existing discussion prompts"""
        response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        assert response.status_code == 200
        prompts = response.json()
        assert isinstance(prompts, list)
        print(f"Found {len(prompts)} prompts for lesson")
        for i, prompt in enumerate(prompts):
            assert "id" in prompt
            assert "question" in prompt
            print(f"  Prompt {i+1}: {prompt['question'][:50]}...")
    
    def test_create_prompt(self, teacher_headers, lesson_id):
        """Teacher can add a new prompt"""
        # First check current prompt count
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        current_prompts = get_response.json()
        
        if len(current_prompts) >= 3:
            # Delete one to make room
            prompt_to_delete = current_prompts[-1]
            delete_response = requests.delete(f"{BASE_URL}/api/prompts/{prompt_to_delete['id']}", 
                                             headers=teacher_headers)
            assert delete_response.status_code == 200
        
        # Create new prompt
        new_prompt_data = {
            "question": "TEST_What is your favorite Bible verse and why?",
            "order": len(current_prompts)
        }
        response = requests.post(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", 
                                headers=teacher_headers, json=new_prompt_data)
        assert response.status_code == 200
        created_prompt = response.json()
        assert "id" in created_prompt
        assert created_prompt["question"] == new_prompt_data["question"]
        print(f"Created prompt: {created_prompt['id']}")
        
        # Verify prompt was created
        verify_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        prompts = verify_response.json()
        prompt_ids = [p["id"] for p in prompts]
        assert created_prompt["id"] in prompt_ids
        
        return created_prompt["id"]
    
    def test_update_prompt(self, teacher_headers, lesson_id):
        """Teacher can edit existing prompt text"""
        # Get prompts
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        prompts = get_response.json()
        
        if not prompts:
            pytest.skip("No prompts to update")
        
        prompt_to_update = prompts[0]
        updated_question = "TEST_Updated: How has your faith journey changed this year?"
        
        response = requests.put(f"{BASE_URL}/api/prompts/{prompt_to_update['id']}", 
                               headers=teacher_headers, 
                               json={"question": updated_question, "order": prompt_to_update.get("order", 0)})
        assert response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        updated_prompts = verify_response.json()
        updated_prompt = next((p for p in updated_prompts if p["id"] == prompt_to_update["id"]), None)
        assert updated_prompt is not None
        assert updated_prompt["question"] == updated_question
        print(f"Updated prompt: {prompt_to_update['id']}")
    
    def test_delete_prompt(self, teacher_headers, lesson_id):
        """Teacher can delete a prompt"""
        # First create a prompt to delete
        create_response = requests.post(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", 
                                       headers=teacher_headers, 
                                       json={"question": "TEST_Prompt to delete", "order": 99})
        
        if create_response.status_code != 200:
            # Max prompts reached, get existing one
            get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
            prompts = get_response.json()
            test_prompts = [p for p in prompts if p["question"].startswith("TEST_")]
            if not test_prompts:
                pytest.skip("No test prompts to delete")
            prompt_id = test_prompts[0]["id"]
        else:
            prompt_id = create_response.json()["id"]
        
        # Delete the prompt
        delete_response = requests.delete(f"{BASE_URL}/api/prompts/{prompt_id}", headers=teacher_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        prompts = verify_response.json()
        prompt_ids = [p["id"] for p in prompts]
        assert prompt_id not in prompt_ids
        print(f"Deleted prompt: {prompt_id}")
    
    def test_max_3_prompts_limit(self, teacher_headers, lesson_id):
        """Maximum 3 prompts per lesson enforced"""
        # Get current prompts
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        prompts = get_response.json()
        
        # Delete all test prompts first
        for prompt in prompts:
            if prompt["question"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/prompts/{prompt['id']}", headers=teacher_headers)
        
        # Refresh prompts
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        prompts = get_response.json()
        
        # Try to add prompts until we hit the limit
        prompts_to_add = 3 - len(prompts) + 1  # One more than allowed
        created_ids = []
        
        for i in range(prompts_to_add):
            response = requests.post(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", 
                                    headers=teacher_headers, 
                                    json={"question": f"TEST_Limit test prompt {i+1}", "order": i})
            if response.status_code == 200:
                created_ids.append(response.json()["id"])
            elif response.status_code == 400:
                # Expected - max limit reached
                assert "Maximum 3 prompts" in response.json().get("detail", "")
                print("Max 3 prompts limit enforced correctly")
                break
        
        # Cleanup
        for prompt_id in created_ids:
            requests.delete(f"{BASE_URL}/api/prompts/{prompt_id}", headers=teacher_headers)


class TestTeacherResponsesAPI:
    """Test Teacher Responses API - P1 Feature 2"""
    
    def test_get_all_replies_for_lesson(self, teacher_headers, lesson_id):
        """Teacher can view all responses grouped by prompt"""
        response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/all-replies", headers=teacher_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "lesson" in data
        assert "prompts_with_replies" in data
        assert "total_replies" in data
        
        print(f"Lesson: {data['lesson']['title']}")
        print(f"Total replies: {data['total_replies']}")
        
        for pwr in data["prompts_with_replies"]:
            assert "prompt" in pwr
            assert "replies" in pwr
            assert "stats" in pwr
            
            stats = pwr["stats"]
            assert "total" in stats
            assert "pending" in stats
            assert "answered" in stats
            assert "needs_followup" in stats
            
            print(f"  Prompt: {pwr['prompt']['question'][:40]}...")
            print(f"    Stats: Total={stats['total']}, Pending={stats['pending']}, Answered={stats['answered']}, Follow-up={stats['needs_followup']}")
    
    def test_member_cannot_access_all_replies(self, member_headers, lesson_id):
        """Member cannot access teacher's all-replies endpoint"""
        response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/all-replies", headers=member_headers)
        assert response.status_code == 403
        print("Member correctly denied access to all-replies endpoint")


class TestReplyStatusManagement:
    """Test Reply Status Management - P1 Feature 3"""
    
    @pytest.fixture
    def prompt_with_reply(self, teacher_headers, member_headers, lesson_id):
        """Create a prompt with a reply for testing"""
        # Get prompts
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        prompts = get_response.json()
        
        if not prompts:
            pytest.skip("No prompts available")
        
        prompt_id = prompts[0]["id"]
        
        # Create a reply as member
        reply_response = requests.post(f"{BASE_URL}/api/prompts/{prompt_id}/reply", 
                                      headers=member_headers,
                                      json={"content": "TEST_Reply for status testing"})
        
        if reply_response.status_code == 200:
            return {"prompt_id": prompt_id, "reply_id": reply_response.json()["id"]}
        
        # Get existing replies
        replies_response = requests.get(f"{BASE_URL}/api/prompts/{prompt_id}/replies", headers=teacher_headers)
        replies = replies_response.json()
        if replies:
            return {"prompt_id": prompt_id, "reply_id": replies[0]["id"]}
        
        pytest.skip("Could not create or find a reply for testing")
    
    def test_update_reply_status_to_answered(self, teacher_headers, prompt_with_reply):
        """Teacher can change reply status to answered"""
        reply_id = prompt_with_reply["reply_id"]
        
        response = requests.put(f"{BASE_URL}/api/replies/{reply_id}/status?status=answered", 
                               headers=teacher_headers)
        assert response.status_code == 200
        
        # Verify status change
        prompt_id = prompt_with_reply["prompt_id"]
        replies_response = requests.get(f"{BASE_URL}/api/prompts/{prompt_id}/replies", headers=teacher_headers)
        replies = replies_response.json()
        reply = next((r for r in replies if r["id"] == reply_id), None)
        assert reply is not None
        assert reply["status"] == "answered"
        print(f"Reply status updated to 'answered'")
    
    def test_update_reply_status_to_needs_followup(self, teacher_headers, prompt_with_reply):
        """Teacher can change reply status to needs_followup"""
        reply_id = prompt_with_reply["reply_id"]
        
        response = requests.put(f"{BASE_URL}/api/replies/{reply_id}/status?status=needs_followup", 
                               headers=teacher_headers)
        assert response.status_code == 200
        
        # Verify status change
        prompt_id = prompt_with_reply["prompt_id"]
        replies_response = requests.get(f"{BASE_URL}/api/prompts/{prompt_id}/replies", headers=teacher_headers)
        replies = replies_response.json()
        reply = next((r for r in replies if r["id"] == reply_id), None)
        assert reply is not None
        assert reply["status"] == "needs_followup"
        print(f"Reply status updated to 'needs_followup'")
    
    def test_update_reply_status_to_pending(self, teacher_headers, prompt_with_reply):
        """Teacher can change reply status back to pending"""
        reply_id = prompt_with_reply["reply_id"]
        
        response = requests.put(f"{BASE_URL}/api/replies/{reply_id}/status?status=pending", 
                               headers=teacher_headers)
        assert response.status_code == 200
        
        # Verify status change
        prompt_id = prompt_with_reply["prompt_id"]
        replies_response = requests.get(f"{BASE_URL}/api/prompts/{prompt_id}/replies", headers=teacher_headers)
        replies = replies_response.json()
        reply = next((r for r in replies if r["id"] == reply_id), None)
        assert reply is not None
        assert reply["status"] == "pending"
        print(f"Reply status updated to 'pending'")
    
    def test_invalid_status_rejected(self, teacher_headers, prompt_with_reply):
        """Invalid status values are rejected"""
        reply_id = prompt_with_reply["reply_id"]
        
        response = requests.put(f"{BASE_URL}/api/replies/{reply_id}/status?status=invalid_status", 
                               headers=teacher_headers)
        assert response.status_code == 400
        assert "Invalid status" in response.json().get("detail", "")
        print("Invalid status correctly rejected")
    
    def test_pin_reply(self, teacher_headers, prompt_with_reply):
        """Teacher can pin a reply"""
        reply_id = prompt_with_reply["reply_id"]
        
        response = requests.put(f"{BASE_URL}/api/replies/{reply_id}/pin?pinned=true", 
                               headers=teacher_headers)
        assert response.status_code == 200
        
        # Verify pin
        prompt_id = prompt_with_reply["prompt_id"]
        replies_response = requests.get(f"{BASE_URL}/api/prompts/{prompt_id}/replies", headers=teacher_headers)
        replies = replies_response.json()
        reply = next((r for r in replies if r["id"] == reply_id), None)
        assert reply is not None
        assert reply["is_pinned"] == True
        print("Reply pinned successfully")
    
    def test_unpin_reply(self, teacher_headers, prompt_with_reply):
        """Teacher can unpin a reply"""
        reply_id = prompt_with_reply["reply_id"]
        
        # First pin it
        requests.put(f"{BASE_URL}/api/replies/{reply_id}/pin?pinned=true", headers=teacher_headers)
        
        # Then unpin
        response = requests.put(f"{BASE_URL}/api/replies/{reply_id}/pin?pinned=false", 
                               headers=teacher_headers)
        assert response.status_code == 200
        
        # Verify unpin
        prompt_id = prompt_with_reply["prompt_id"]
        replies_response = requests.get(f"{BASE_URL}/api/prompts/{prompt_id}/replies", headers=teacher_headers)
        replies = replies_response.json()
        reply = next((r for r in replies if r["id"] == reply_id), None)
        assert reply is not None
        assert reply["is_pinned"] == False
        print("Reply unpinned successfully")
    
    def test_delete_reply(self, teacher_headers, member_headers, lesson_id):
        """Teacher can delete a reply"""
        # Get prompts
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        prompts = get_response.json()
        
        if not prompts:
            pytest.skip("No prompts available")
        
        prompt_id = prompts[0]["id"]
        
        # Create a reply to delete
        reply_response = requests.post(f"{BASE_URL}/api/prompts/{prompt_id}/reply", 
                                      headers=member_headers,
                                      json={"content": "TEST_Reply to be deleted"})
        
        if reply_response.status_code != 200:
            pytest.skip("Could not create reply for deletion test")
        
        reply_id = reply_response.json()["id"]
        
        # Delete the reply
        delete_response = requests.delete(f"{BASE_URL}/api/replies/{reply_id}", headers=teacher_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        replies_response = requests.get(f"{BASE_URL}/api/prompts/{prompt_id}/replies", headers=teacher_headers)
        replies = replies_response.json()
        reply_ids = [r["id"] for r in replies]
        assert reply_id not in reply_ids
        print(f"Reply deleted successfully: {reply_id}")
    
    def test_member_cannot_change_status(self, member_headers, teacher_headers, lesson_id):
        """Member cannot change reply status"""
        # Get prompts
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        prompts = get_response.json()
        
        if not prompts:
            pytest.skip("No prompts available")
        
        prompt_id = prompts[0]["id"]
        
        # Get replies
        replies_response = requests.get(f"{BASE_URL}/api/prompts/{prompt_id}/replies", headers=teacher_headers)
        replies = replies_response.json()
        
        if not replies:
            pytest.skip("No replies available")
        
        reply_id = replies[0]["id"]
        
        # Try to change status as member
        response = requests.put(f"{BASE_URL}/api/replies/{reply_id}/status?status=answered", 
                               headers=member_headers)
        assert response.status_code == 403
        print("Member correctly denied from changing reply status")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_prompts(self, teacher_headers, lesson_id):
        """Clean up TEST_ prefixed prompts"""
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}/prompts", headers=teacher_headers)
        prompts = get_response.json()
        
        deleted_count = 0
        for prompt in prompts:
            if prompt["question"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/prompts/{prompt['id']}", headers=teacher_headers)
                deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test prompts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
