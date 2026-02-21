"""
Tests for hosting_method field in lessons
Tests the rebranding feature from 'Sunday School' to 'The Room'
and hosting method selection for teachers.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MEMBER_EMAIL = "member@sundayschool.com"
MEMBER_PASSWORD = "member123"
TEACHER_EMAIL = "teacher@sundayschool.com"
TEACHER_PASSWORD = "teacher123"


@pytest.fixture(scope="module")
def teacher_token():
    """Get teacher authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEACHER_EMAIL,
        "password": TEACHER_PASSWORD
    })
    assert response.status_code == 200, f"Teacher login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def member_token():
    """Get member authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MEMBER_EMAIL,
        "password": MEMBER_PASSWORD
    })
    assert response.status_code == 200, f"Member login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def existing_lesson_id(teacher_token):
    """Get an existing lesson ID for testing"""
    response = requests.get(
        f"{BASE_URL}/api/lessons/all",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 200
    lessons = response.json()
    assert len(lessons) > 0, "No lessons available for testing"
    return lessons[0]["id"]


class TestHostingMethodBackend:
    """Tests for hosting_method field in lesson model"""
    
    def test_lesson_contains_hosting_method_field(self, teacher_token, existing_lesson_id):
        """Verify lesson response includes hosting_method field"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        lesson = response.json()
        assert "hosting_method" in lesson, "hosting_method field missing from lesson response"
        print(f"SUCCESS: hosting_method found with value: {lesson['hosting_method']}")
    
    def test_hosting_method_valid_values(self, teacher_token, existing_lesson_id):
        """Verify hosting_method is one of the valid values: 'in_app', 'zoom', 'both'"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        lesson = response.json()
        valid_values = ["in_app", "zoom", "both"]
        assert lesson["hosting_method"] in valid_values, \
            f"Invalid hosting_method value: {lesson['hosting_method']}. Must be one of {valid_values}"
        print(f"SUCCESS: hosting_method value '{lesson['hosting_method']}' is valid")
    
    def test_update_hosting_method_to_in_app(self, teacher_token, existing_lesson_id):
        """Teacher can update hosting_method to 'in_app'"""
        # First get current lesson data
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        original_lesson = response.json()
        
        # Update to in_app
        update_data = {
            "title": original_lesson["title"],
            "description": original_lesson["description"],
            "youtube_url": original_lesson.get("youtube_url", ""),
            "zoom_link": original_lesson.get("zoom_link", ""),
            "lesson_date": original_lesson.get("lesson_date", ""),
            "teacher_notes": original_lesson.get("teacher_notes", ""),
            "reading_plan": original_lesson.get("reading_plan", ""),
            "hosting_method": "in_app",
            "order": original_lesson.get("order", 0)
        }
        
        response = requests.put(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200, f"Failed to update lesson: {response.text}"
        
        # Verify the update
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        updated_lesson = response.json()
        assert updated_lesson["hosting_method"] == "in_app", \
            f"Expected hosting_method='in_app', got '{updated_lesson['hosting_method']}'"
        print("SUCCESS: hosting_method updated to 'in_app'")
    
    def test_update_hosting_method_to_zoom(self, teacher_token, existing_lesson_id):
        """Teacher can update hosting_method to 'zoom'"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        original_lesson = response.json()
        
        update_data = {
            "title": original_lesson["title"],
            "description": original_lesson["description"],
            "youtube_url": original_lesson.get("youtube_url", ""),
            "zoom_link": original_lesson.get("zoom_link", ""),
            "lesson_date": original_lesson.get("lesson_date", ""),
            "teacher_notes": original_lesson.get("teacher_notes", ""),
            "reading_plan": original_lesson.get("reading_plan", ""),
            "hosting_method": "zoom",
            "order": original_lesson.get("order", 0)
        }
        
        response = requests.put(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200, f"Failed to update lesson: {response.text}"
        
        # Verify
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        updated_lesson = response.json()
        assert updated_lesson["hosting_method"] == "zoom", \
            f"Expected hosting_method='zoom', got '{updated_lesson['hosting_method']}'"
        print("SUCCESS: hosting_method updated to 'zoom'")
    
    def test_update_hosting_method_to_both(self, teacher_token, existing_lesson_id):
        """Teacher can update hosting_method to 'both'"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        original_lesson = response.json()
        
        update_data = {
            "title": original_lesson["title"],
            "description": original_lesson["description"],
            "youtube_url": original_lesson.get("youtube_url", ""),
            "zoom_link": original_lesson.get("zoom_link", ""),
            "lesson_date": original_lesson.get("lesson_date", ""),
            "teacher_notes": original_lesson.get("teacher_notes", ""),
            "reading_plan": original_lesson.get("reading_plan", ""),
            "hosting_method": "both",
            "order": original_lesson.get("order", 0)
        }
        
        response = requests.put(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200, f"Failed to update lesson: {response.text}"
        
        # Verify
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        updated_lesson = response.json()
        assert updated_lesson["hosting_method"] == "both", \
            f"Expected hosting_method='both', got '{updated_lesson['hosting_method']}'"
        print("SUCCESS: hosting_method updated to 'both'")
    
    def test_member_can_see_hosting_method(self, member_token, existing_lesson_id):
        """Members can view lessons with hosting_method field"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code == 200, f"Member cannot view lesson: {response.text}"
        lesson = response.json()
        assert "hosting_method" in lesson, "hosting_method field missing from lesson for member"
        print(f"SUCCESS: Member can view lesson with hosting_method='{lesson['hosting_method']}'")
    
    def test_member_cannot_update_hosting_method(self, member_token, existing_lesson_id):
        """Members should NOT be able to update lessons"""
        response = requests.put(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            json={
                "title": "Hacked Title",
                "description": "Hacked Description",
                "hosting_method": "in_app"
            },
            headers={"Authorization": f"Bearer {member_token}"}
        )
        # Should get 403 Forbidden
        assert response.status_code == 403, \
            f"Expected 403 Forbidden for member update, got {response.status_code}"
        print("SUCCESS: Member correctly denied permission to update lesson")
    
    def test_all_lessons_have_hosting_method(self, teacher_token):
        """Verify all lessons in the system have hosting_method field"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/all",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        lessons = response.json()
        
        for lesson in lessons:
            assert "hosting_method" in lesson, \
                f"Lesson {lesson['id']} missing hosting_method field"
            assert lesson["hosting_method"] in ["in_app", "zoom", "both"], \
                f"Lesson {lesson['id']} has invalid hosting_method: {lesson['hosting_method']}"
        
        print(f"SUCCESS: All {len(lessons)} lessons have valid hosting_method field")


class TestLessonResponseStructure:
    """Verify complete lesson response structure"""
    
    def test_lesson_response_has_all_required_fields(self, teacher_token, existing_lesson_id):
        """Verify lesson response contains all expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{existing_lesson_id}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
        assert response.status_code == 200
        lesson = response.json()
        
        required_fields = [
            "id", "course_id", "title", "description", 
            "hosting_method", "order", "created_at",
            "resources", "prompts", "user_attendance"
        ]
        
        optional_fields = [
            "youtube_url", "zoom_link", "lesson_date",
            "teacher_notes", "reading_plan"
        ]
        
        for field in required_fields:
            assert field in lesson, f"Required field '{field}' missing from lesson response"
        
        print(f"SUCCESS: Lesson response contains all required fields")
        print(f"hosting_method: {lesson['hosting_method']}")
        print(f"has zoom_link: {'zoom_link' in lesson and lesson.get('zoom_link')}")
        print(f"has youtube_url: {'youtube_url' in lesson and lesson.get('youtube_url')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
