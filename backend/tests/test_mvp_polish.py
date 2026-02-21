"""
Test Suite for MVP Polish Features of 'The Room' App

Tests:
1. hosting_method: single choice only (in_app OR zoom, no 'both')
2. recording_source: (daily, youtube, external, none)
3. is_published toggle for lessons
4. is_published toggle for courses
5. Members only see published courses/lessons
6. Sequential lesson unlock
7. POST /api/lessons/{id}/complete endpoint
8. GET /api/courses/{id}/progress returns correct progress
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEACHER_EMAIL = "teacher@sundayschool.com"
TEACHER_PASSWORD = "teacher123"
MEMBER_EMAIL = "member@sundayschool.com"
MEMBER_PASSWORD = "member123"


@pytest.fixture(scope="module")
def teacher_token():
    """Get teacher auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEACHER_EMAIL,
        "password": TEACHER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Teacher login failed: {response.text}")


@pytest.fixture(scope="module")
def member_token():
    """Get member auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MEMBER_EMAIL,
        "password": MEMBER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Member login failed: {response.text}")


@pytest.fixture(scope="module")
def teacher_headers(teacher_token):
    return {"Authorization": f"Bearer {teacher_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def member_headers(member_token):
    return {"Authorization": f"Bearer {member_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def test_course(teacher_headers):
    """Create a test course for publishing tests"""
    response = requests.post(f"{BASE_URL}/api/courses", json={
        "title": "TEST_MVP_Polish_Course",
        "description": "Course for testing MVP polish features",
        "is_published": False
    }, headers=teacher_headers)
    if response.status_code in [200, 201]:
        course = response.json()
        yield course
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course['id']}", headers=teacher_headers)
    else:
        pytest.skip(f"Failed to create test course: {response.text}")


@pytest.fixture(scope="module")
def test_lessons(teacher_headers, test_course):
    """Create test lessons in sequential order"""
    lessons = []
    for i in range(1, 4):
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": f"TEST_Lesson_{i}",
            "description": f"Lesson {i} for sequential unlock testing",
            "hosting_method": "in_app",
            "recording_source": "none",
            "is_published": True,
            "order": i
        }, headers=teacher_headers)
        if response.status_code in [200, 201]:
            lessons.append(response.json())
    yield lessons
    # Cleanup handled by course deletion


class TestHostingMethod:
    """Tests for hosting_method field: only 'in_app' or 'zoom' allowed"""

    def test_lesson_creation_with_in_app(self, teacher_headers, test_course):
        """Verify lesson can be created with hosting_method='in_app'"""
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Lesson_InApp",
            "description": "Test lesson with in_app hosting",
            "hosting_method": "in_app",
            "is_published": False
        }, headers=teacher_headers)
        
        assert response.status_code in [200, 201], f"Failed to create lesson: {response.text}"
        data = response.json()
        assert data['hosting_method'] == 'in_app', "hosting_method should be 'in_app'"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/lessons/{data['id']}", headers=teacher_headers)

    def test_lesson_creation_with_zoom(self, teacher_headers, test_course):
        """Verify lesson can be created with hosting_method='zoom'"""
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Lesson_Zoom",
            "description": "Test lesson with zoom hosting",
            "hosting_method": "zoom",
            "zoom_link": "https://zoom.us/j/123456789",
            "is_published": False
        }, headers=teacher_headers)
        
        assert response.status_code in [200, 201], f"Failed to create lesson: {response.text}"
        data = response.json()
        assert data['hosting_method'] == 'zoom', "hosting_method should be 'zoom'"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/lessons/{data['id']}", headers=teacher_headers)

    def test_lesson_update_hosting_method(self, teacher_headers, test_course):
        """Verify teacher can update hosting_method"""
        # Create lesson
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Lesson_Update_Hosting",
            "description": "Test lesson for hosting update",
            "hosting_method": "in_app",
            "is_published": False
        }, headers=teacher_headers)
        lesson_id = response.json()['id']
        
        # Update to zoom
        update_response = requests.put(f"{BASE_URL}/api/lessons/{lesson_id}", json={
            "title": "TEST_Lesson_Update_Hosting",
            "description": "Test lesson for hosting update",
            "hosting_method": "zoom",
            "zoom_link": "https://zoom.us/j/987654321"
        }, headers=teacher_headers)
        
        assert update_response.status_code == 200, f"Failed to update lesson: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=teacher_headers)
        data = get_response.json()
        assert data['hosting_method'] == 'zoom', "hosting_method should be updated to 'zoom'"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/lessons/{lesson_id}", headers=teacher_headers)


class TestRecordingSource:
    """Tests for recording_source field: daily, youtube, external, none"""

    def test_recording_source_none(self, teacher_headers, test_course):
        """Verify lesson can be created with recording_source='none'"""
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Recording_None",
            "description": "Test lesson with no recording",
            "recording_source": "none",
            "is_published": False
        }, headers=teacher_headers)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data['recording_source'] == 'none'
        
        requests.delete(f"{BASE_URL}/api/lessons/{data['id']}", headers=teacher_headers)

    def test_recording_source_daily(self, teacher_headers, test_course):
        """Verify lesson can be created with recording_source='daily'"""
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Recording_Daily",
            "description": "Test lesson with daily recording",
            "recording_source": "daily",
            "is_published": False
        }, headers=teacher_headers)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data['recording_source'] == 'daily'
        
        requests.delete(f"{BASE_URL}/api/lessons/{data['id']}", headers=teacher_headers)

    def test_recording_source_youtube(self, teacher_headers, test_course):
        """Verify lesson can be created with recording_source='youtube'"""
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Recording_YouTube",
            "description": "Test lesson with youtube recording",
            "recording_source": "youtube",
            "recording_url": "https://www.youtube.com/watch?v=test123",
            "is_published": False
        }, headers=teacher_headers)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data['recording_source'] == 'youtube'
        assert data['recording_url'] == "https://www.youtube.com/watch?v=test123"
        
        requests.delete(f"{BASE_URL}/api/lessons/{data['id']}", headers=teacher_headers)

    def test_recording_source_external(self, teacher_headers, test_course):
        """Verify lesson can be created with recording_source='external'"""
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Recording_External",
            "description": "Test lesson with external recording",
            "recording_source": "external",
            "recording_url": "https://vimeo.com/test123",
            "is_published": False
        }, headers=teacher_headers)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data['recording_source'] == 'external'
        assert data['recording_url'] == "https://vimeo.com/test123"
        
        requests.delete(f"{BASE_URL}/api/lessons/{data['id']}", headers=teacher_headers)


class TestPublishing:
    """Tests for is_published toggle on lessons and courses"""

    def test_create_draft_lesson(self, teacher_headers, test_course):
        """Verify lesson can be created as draft (is_published=False)"""
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Draft_Lesson",
            "description": "Draft lesson",
            "is_published": False
        }, headers=teacher_headers)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data['is_published'] == False
        
        requests.delete(f"{BASE_URL}/api/lessons/{data['id']}", headers=teacher_headers)

    def test_create_published_lesson(self, teacher_headers, test_course):
        """Verify lesson can be created as published (is_published=True)"""
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Published_Lesson",
            "description": "Published lesson",
            "is_published": True
        }, headers=teacher_headers)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data['is_published'] == True
        
        requests.delete(f"{BASE_URL}/api/lessons/{data['id']}", headers=teacher_headers)

    def test_toggle_lesson_published(self, teacher_headers, test_course):
        """Verify lesson is_published can be toggled"""
        # Create draft
        response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": test_course['id'],
            "title": "TEST_Toggle_Lesson",
            "description": "Toggleable lesson",
            "is_published": False
        }, headers=teacher_headers)
        lesson_id = response.json()['id']
        
        # Toggle to published
        update_response = requests.put(f"{BASE_URL}/api/lessons/{lesson_id}", json={
            "title": "TEST_Toggle_Lesson",
            "description": "Toggleable lesson",
            "is_published": True
        }, headers=teacher_headers)
        assert update_response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=teacher_headers)
        assert get_response.json()['is_published'] == True
        
        requests.delete(f"{BASE_URL}/api/lessons/{lesson_id}", headers=teacher_headers)

    def test_create_draft_course(self, teacher_headers):
        """Verify course can be created as draft (is_published=False)"""
        response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Draft_Course",
            "description": "Draft course",
            "is_published": False
        }, headers=teacher_headers)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data['is_published'] == False
        
        requests.delete(f"{BASE_URL}/api/courses/{data['id']}", headers=teacher_headers)

    def test_publish_course_endpoint(self, teacher_headers):
        """Verify POST /courses/{id}/publish publishes course and lessons"""
        # Create draft course with draft lesson
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Publish_Course",
            "description": "Course to publish",
            "is_published": False
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        # Create draft lesson
        lesson_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Lesson_To_Publish",
            "description": "Lesson to publish",
            "is_published": False
        }, headers=teacher_headers)
        lesson_id = lesson_response.json()['id']
        
        # Publish course
        publish_response = requests.post(f"{BASE_URL}/api/courses/{course_id}/publish", headers=teacher_headers)
        assert publish_response.status_code == 200
        
        # Verify course is published
        course_get = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)
        assert course_get.json()['is_published'] == True
        
        # Verify lesson is published
        lesson_get = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=teacher_headers)
        assert lesson_get.json()['is_published'] == True
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)

    def test_unpublish_course_endpoint(self, teacher_headers):
        """Verify POST /courses/{id}/unpublish unpublishes course"""
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Unpublish_Course",
            "description": "Course to unpublish",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        # Unpublish
        unpublish_response = requests.post(f"{BASE_URL}/api/courses/{course_id}/unpublish", headers=teacher_headers)
        assert unpublish_response.status_code == 200
        
        # Verify
        course_get = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)
        assert course_get.json()['is_published'] == False
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)


class TestVisibilityForMembers:
    """Tests that members only see published courses/lessons"""

    def test_member_cannot_see_draft_course(self, teacher_headers, member_headers):
        """Verify members cannot see unpublished courses"""
        # Create draft course
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Hidden_Course",
            "description": "Should be hidden from members",
            "is_published": False
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        # Member tries to access
        member_response = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers=member_headers)
        assert member_response.status_code == 404, "Member should not see unpublished course"
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)

    def test_member_can_see_published_course(self, teacher_headers, member_headers):
        """Verify members can see published courses"""
        # Create published course
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Visible_Course",
            "description": "Should be visible to members",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        # Member can access
        member_response = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers=member_headers)
        assert member_response.status_code == 200, "Member should see published course"
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)

    def test_member_cannot_see_draft_lesson(self, teacher_headers, member_headers):
        """Verify members cannot see unpublished lessons"""
        # Create published course with draft lesson
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Course_With_Draft_Lesson",
            "description": "Course with draft lesson",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        lesson_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Draft_Lesson_Hidden",
            "description": "Should be hidden",
            "is_published": False
        }, headers=teacher_headers)
        lesson_id = lesson_response.json()['id']
        
        # Member tries to access
        member_response = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=member_headers)
        assert member_response.status_code == 404, "Member should not see unpublished lesson"
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)


class TestLessonCompletion:
    """Tests for POST /api/lessons/{id}/complete endpoint"""

    def test_mark_lesson_complete(self, teacher_headers, member_headers):
        """Verify member can mark lesson as complete"""
        # Create course and published lesson
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Completion_Course",
            "description": "Course for completion testing",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        lesson_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Complete_Lesson",
            "description": "Lesson to complete",
            "is_published": True,
            "order": 1
        }, headers=teacher_headers)
        lesson_id = lesson_response.json()['id']
        
        # Member marks complete
        complete_response = requests.post(f"{BASE_URL}/api/lessons/{lesson_id}/complete", headers=member_headers)
        assert complete_response.status_code == 200, f"Failed to complete lesson: {complete_response.text}"
        assert "completed_at" in complete_response.json()
        
        # Verify is_completed in lesson response
        lesson_get = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=member_headers)
        assert lesson_get.json()['is_completed'] == True
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)

    def test_already_completed_lesson(self, teacher_headers, member_headers):
        """Verify marking already completed lesson returns appropriate response"""
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Double_Complete_Course",
            "description": "Course for double completion test",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        lesson_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Double_Complete_Lesson",
            "description": "Lesson to complete twice",
            "is_published": True,
            "order": 1
        }, headers=teacher_headers)
        lesson_id = lesson_response.json()['id']
        
        # First completion
        requests.post(f"{BASE_URL}/api/lessons/{lesson_id}/complete", headers=member_headers)
        
        # Second completion attempt
        second_response = requests.post(f"{BASE_URL}/api/lessons/{lesson_id}/complete", headers=member_headers)
        assert second_response.status_code == 200
        assert "already" in second_response.json().get('message', '').lower()
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)

    def test_unmark_lesson_complete(self, teacher_headers, member_headers):
        """Verify DELETE /api/lessons/{id}/complete removes completion"""
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Unmark_Course",
            "description": "Course for unmark test",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        lesson_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Unmark_Lesson",
            "description": "Lesson to unmark",
            "is_published": True,
            "order": 1
        }, headers=teacher_headers)
        lesson_id = lesson_response.json()['id']
        
        # Complete
        requests.post(f"{BASE_URL}/api/lessons/{lesson_id}/complete", headers=member_headers)
        
        # Unmark
        unmark_response = requests.delete(f"{BASE_URL}/api/lessons/{lesson_id}/complete", headers=member_headers)
        assert unmark_response.status_code == 200
        
        # Verify
        lesson_get = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=member_headers)
        assert lesson_get.json()['is_completed'] == False
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)


class TestCourseProgress:
    """Tests for GET /api/courses/{id}/progress endpoint"""

    def test_course_progress_empty(self, teacher_headers, member_headers):
        """Verify progress shows 0% when no lessons completed"""
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Progress_Course",
            "description": "Course for progress testing",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        # Create lessons
        for i in range(3):
            requests.post(f"{BASE_URL}/api/lessons", json={
                "course_id": course_id,
                "title": f"TEST_Progress_Lesson_{i}",
                "description": f"Progress test lesson {i}",
                "is_published": True,
                "order": i + 1
            }, headers=teacher_headers)
        
        # Get progress
        progress_response = requests.get(f"{BASE_URL}/api/courses/{course_id}/progress", headers=member_headers)
        assert progress_response.status_code == 200
        
        data = progress_response.json()
        assert data['total_lessons'] == 3
        assert data['completed_lessons'] == 0
        assert data['progress_percent'] == 0
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)

    def test_course_progress_partial(self, teacher_headers, member_headers):
        """Verify progress shows correct percentage when some lessons completed"""
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Partial_Progress_Course",
            "description": "Course for partial progress testing",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        lessons = []
        for i in range(3):
            resp = requests.post(f"{BASE_URL}/api/lessons", json={
                "course_id": course_id,
                "title": f"TEST_Partial_Progress_Lesson_{i}",
                "description": f"Partial progress test lesson {i}",
                "is_published": True,
                "order": i + 1
            }, headers=teacher_headers)
            lessons.append(resp.json())
        
        # Complete first lesson
        requests.post(f"{BASE_URL}/api/lessons/{lessons[0]['id']}/complete", headers=member_headers)
        
        # Get progress
        progress_response = requests.get(f"{BASE_URL}/api/courses/{course_id}/progress", headers=member_headers)
        data = progress_response.json()
        
        assert data['total_lessons'] == 3
        assert data['completed_lessons'] == 1
        assert data['progress_percent'] == pytest.approx(33.3, abs=0.1)
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)


class TestSequentialUnlock:
    """Tests for sequential lesson unlock based on previous completion"""

    def test_first_lesson_always_unlocked(self, teacher_headers, member_headers):
        """Verify first lesson is always unlocked"""
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Sequential_Course",
            "description": "Course for sequential testing",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        lesson_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_First_Lesson",
            "description": "First lesson",
            "is_published": True,
            "order": 1
        }, headers=teacher_headers)
        lesson_id = lesson_response.json()['id']
        
        # Check unlock status
        lesson_get = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=member_headers)
        assert lesson_get.json()['is_unlocked'] == True
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)

    def test_second_lesson_locked_until_first_complete(self, teacher_headers, member_headers):
        """Verify second lesson is locked until first is completed"""
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Lock_Course",
            "description": "Course for lock testing",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        lesson1_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Lock_Lesson_1",
            "description": "First lesson",
            "is_published": True,
            "order": 1
        }, headers=teacher_headers)
        lesson1_id = lesson1_response.json()['id']
        
        lesson2_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Lock_Lesson_2",
            "description": "Second lesson",
            "is_published": True,
            "order": 2
        }, headers=teacher_headers)
        lesson2_id = lesson2_response.json()['id']
        
        # Check second lesson is locked
        lesson2_get = requests.get(f"{BASE_URL}/api/lessons/{lesson2_id}", headers=member_headers)
        assert lesson2_get.json()['is_unlocked'] == False, "Second lesson should be locked"
        
        # Complete first lesson
        requests.post(f"{BASE_URL}/api/lessons/{lesson1_id}/complete", headers=member_headers)
        
        # Check second lesson is now unlocked
        lesson2_get_after = requests.get(f"{BASE_URL}/api/lessons/{lesson2_id}", headers=member_headers)
        assert lesson2_get_after.json()['is_unlocked'] == True, "Second lesson should be unlocked after completing first"
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)

    def test_cannot_complete_locked_lesson(self, teacher_headers, member_headers):
        """Verify cannot complete a locked lesson"""
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Cannot_Complete_Course",
            "description": "Course for complete restriction testing",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Cannot_Complete_Lesson_1",
            "description": "First lesson",
            "is_published": True,
            "order": 1
        }, headers=teacher_headers)
        
        lesson2_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Cannot_Complete_Lesson_2",
            "description": "Second lesson",
            "is_published": True,
            "order": 2
        }, headers=teacher_headers)
        lesson2_id = lesson2_response.json()['id']
        
        # Try to complete second lesson without completing first
        complete_response = requests.post(f"{BASE_URL}/api/lessons/{lesson2_id}/complete", headers=member_headers)
        assert complete_response.status_code == 403, f"Should not allow completing locked lesson: {complete_response.text}"
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)

    def test_teacher_can_see_all_lessons_unlocked(self, teacher_headers):
        """Verify teacher can see all lessons as unlocked (bypass sequential lock)"""
        course_response = requests.post(f"{BASE_URL}/api/courses", json={
            "title": "TEST_Teacher_Bypass_Course",
            "description": "Course for teacher bypass testing",
            "is_published": True
        }, headers=teacher_headers)
        course_id = course_response.json()['id']
        
        requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Teacher_Bypass_Lesson_1",
            "description": "First lesson",
            "is_published": True,
            "order": 1
        }, headers=teacher_headers)
        
        lesson2_response = requests.post(f"{BASE_URL}/api/lessons", json={
            "course_id": course_id,
            "title": "TEST_Teacher_Bypass_Lesson_2",
            "description": "Second lesson",
            "is_published": True,
            "order": 2
        }, headers=teacher_headers)
        lesson2_id = lesson2_response.json()['id']
        
        # Teacher should see lesson as unlocked
        lesson2_get = requests.get(f"{BASE_URL}/api/lessons/{lesson2_id}", headers=teacher_headers)
        assert lesson2_get.json()['is_unlocked'] == True, "Teacher should always see lessons as unlocked"
        
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=teacher_headers)


class TestOnboardingEndpoints:
    """Tests for onboarding related endpoints"""

    def test_onboarding_status(self, teacher_headers):
        """Verify GET /api/auth/onboarding-status returns status"""
        response = requests.get(f"{BASE_URL}/api/auth/onboarding-status", headers=teacher_headers)
        assert response.status_code == 200
        data = response.json()
        assert 'completed' in data
        assert 'role' in data

    def test_complete_onboarding(self, member_headers):
        """Verify POST /api/auth/onboarding-complete works"""
        response = requests.post(f"{BASE_URL}/api/auth/onboarding-complete", headers=member_headers)
        assert response.status_code == 200

    def test_complete_onboarding_step(self, member_headers):
        """Verify POST /api/auth/onboarding-step works"""
        response = requests.post(f"{BASE_URL}/api/auth/onboarding-step?step=welcome", headers=member_headers)
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
