"""
Tests for Course unlock_type field, CourseEditor, and cover upload functionality
Tests the new features:
- Course creation with unlock_type (sequential/scheduled)
- Course editing with unlock_type toggle
- Course cover upload
- Scheduled lesson unlock based on date
"""
import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCourseUnlockType:
    """Test course unlock_type functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get teacher authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teacher@theroom.com",
            "password": "teacher123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def member_token(self):
        """Get member authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "member@theroom.com",
            "password": "member123"
        })
        assert response.status_code == 200, f"Member login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Auth headers for teacher"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def member_headers(self, member_token):
        """Auth headers for member"""
        return {"Authorization": f"Bearer {member_token}", "Content-Type": "application/json"}
    
    # ========== Course Creation with unlock_type ==========
    
    def test_create_course_sequential_default(self, auth_headers):
        """Test course creation defaults to sequential unlock_type"""
        response = requests.post(f"{BASE_URL}/api/courses", 
            headers=auth_headers,
            json={
                "title": "TEST_Sequential Default Course",
                "description": "Testing default sequential unlock",
                "is_published": True
            }
        )
        assert response.status_code == 200, f"Course creation failed: {response.text}"
        data = response.json()
        assert data["unlock_type"] == "sequential", "Default unlock_type should be sequential"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{data['id']}", headers=auth_headers)
    
    def test_create_course_with_sequential(self, auth_headers):
        """Test course creation with explicit sequential unlock_type"""
        response = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Sequential Course",
                "description": "Testing sequential unlock",
                "unlock_type": "sequential",
                "is_published": True
            }
        )
        assert response.status_code == 200, f"Course creation failed: {response.text}"
        data = response.json()
        assert data["unlock_type"] == "sequential"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{data['id']}", headers=auth_headers)
    
    def test_create_course_with_scheduled(self, auth_headers):
        """Test course creation with scheduled unlock_type"""
        response = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Scheduled Course",
                "description": "Testing scheduled unlock",
                "unlock_type": "scheduled",
                "is_published": True
            }
        )
        assert response.status_code == 200, f"Course creation failed: {response.text}"
        data = response.json()
        assert data["unlock_type"] == "scheduled"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{data['id']}", headers=auth_headers)
    
    # ========== Course Update with unlock_type ==========
    
    def test_update_course_unlock_type(self, auth_headers):
        """Test updating course unlock_type from sequential to scheduled"""
        # Create course
        create_res = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Update Unlock Course",
                "description": "Testing unlock type update",
                "unlock_type": "sequential",
                "is_published": True
            }
        )
        assert create_res.status_code == 200
        course_id = create_res.json()["id"]
        
        # Update to scheduled
        update_res = requests.put(f"{BASE_URL}/api/courses/{course_id}",
            headers=auth_headers,
            json={"unlock_type": "scheduled"}
        )
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        
        # Verify update
        get_res = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers=auth_headers)
        assert get_res.status_code == 200
        assert get_res.json()["unlock_type"] == "scheduled"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=auth_headers)
    
    def test_update_course_title_and_description(self, auth_headers):
        """Test updating course title and description via CourseEditor"""
        # Create course
        create_res = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Original Title",
                "description": "Original description",
                "is_published": False
            }
        )
        assert create_res.status_code == 200
        course_id = create_res.json()["id"]
        
        # Update course
        update_res = requests.put(f"{BASE_URL}/api/courses/{course_id}",
            headers=auth_headers,
            json={
                "title": "TEST_Updated Title",
                "description": "Updated description",
                "is_published": True
            }
        )
        assert update_res.status_code == 200
        
        # Verify update
        get_res = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers=auth_headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["title"] == "TEST_Updated Title"
        assert data["description"] == "Updated description"
        assert data["is_published"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=auth_headers)


class TestScheduledLessonUnlock:
    """Test scheduled unlock type - lessons unlock based on date"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get teacher authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teacher@theroom.com",
            "password": "teacher123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def member_token(self):
        """Get member authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "member@theroom.com",
            "password": "member123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def member_headers(self, member_token):
        return {"Authorization": f"Bearer {member_token}", "Content-Type": "application/json"}
    
    def test_scheduled_lesson_unlocked_past_date(self, auth_headers, member_headers):
        """Test that lesson with past date is unlocked for members"""
        # Create scheduled course
        course_res = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Scheduled Past Date",
                "description": "Testing scheduled unlock with past date",
                "unlock_type": "scheduled",
                "is_published": True
            }
        )
        assert course_res.status_code == 200
        course_id = course_res.json()["id"]
        
        # Create lesson with past date (unlocked)
        past_date = (date.today() - timedelta(days=7)).isoformat()
        lesson_res = requests.post(f"{BASE_URL}/api/lessons",
            headers=auth_headers,
            json={
                "course_id": course_id,
                "title": "TEST_Past Date Lesson",
                "description": "This lesson should be unlocked",
                "lesson_date": past_date,
                "is_published": True,
                "order": 1
            }
        )
        assert lesson_res.status_code == 200
        lesson_id = lesson_res.json()["id"]
        
        # Member should see lesson as unlocked
        member_lesson_res = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=member_headers)
        assert member_lesson_res.status_code == 200
        assert member_lesson_res.json()["is_unlocked"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=auth_headers)
    
    def test_scheduled_lesson_locked_future_date(self, auth_headers, member_headers):
        """Test that lesson with future date is locked for members"""
        # Create scheduled course
        course_res = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Scheduled Future Date",
                "description": "Testing scheduled unlock with future date",
                "unlock_type": "scheduled",
                "is_published": True
            }
        )
        assert course_res.status_code == 200
        course_id = course_res.json()["id"]
        
        # Create lesson with future date (locked)
        future_date = (date.today() + timedelta(days=7)).isoformat()
        lesson_res = requests.post(f"{BASE_URL}/api/lessons",
            headers=auth_headers,
            json={
                "course_id": course_id,
                "title": "TEST_Future Date Lesson",
                "description": "This lesson should be locked",
                "lesson_date": future_date,
                "is_published": True,
                "order": 1
            }
        )
        assert lesson_res.status_code == 200
        lesson_id = lesson_res.json()["id"]
        
        # Member should see lesson as locked
        member_lesson_res = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=member_headers)
        assert member_lesson_res.status_code == 200
        assert member_lesson_res.json()["is_unlocked"] == False
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=auth_headers)
    
    def test_scheduled_lesson_today_date_unlocked(self, auth_headers, member_headers):
        """Test that lesson with today's date is unlocked"""
        # Create scheduled course
        course_res = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Scheduled Today Date",
                "description": "Testing scheduled unlock with today",
                "unlock_type": "scheduled",
                "is_published": True
            }
        )
        assert course_res.status_code == 200
        course_id = course_res.json()["id"]
        
        # Create lesson with today's date
        today = date.today().isoformat()
        lesson_res = requests.post(f"{BASE_URL}/api/lessons",
            headers=auth_headers,
            json={
                "course_id": course_id,
                "title": "TEST_Today Lesson",
                "description": "This lesson should be unlocked",
                "lesson_date": today,
                "is_published": True,
                "order": 1
            }
        )
        assert lesson_res.status_code == 200
        lesson_id = lesson_res.json()["id"]
        
        # Member should see lesson as unlocked
        member_lesson_res = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=member_headers)
        assert member_lesson_res.status_code == 200
        assert member_lesson_res.json()["is_unlocked"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=auth_headers)
    
    def test_teacher_always_sees_unlocked(self, auth_headers):
        """Test that teachers see all lessons as unlocked regardless of date"""
        # Create scheduled course
        course_res = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Teacher View Scheduled",
                "description": "Testing teacher always sees unlocked",
                "unlock_type": "scheduled",
                "is_published": True
            }
        )
        assert course_res.status_code == 200
        course_id = course_res.json()["id"]
        
        # Create lesson with future date
        future_date = (date.today() + timedelta(days=30)).isoformat()
        lesson_res = requests.post(f"{BASE_URL}/api/lessons",
            headers=auth_headers,
            json={
                "course_id": course_id,
                "title": "TEST_Future Teacher Lesson",
                "description": "Teachers see this unlocked",
                "lesson_date": future_date,
                "is_published": True,
                "order": 1
            }
        )
        assert lesson_res.status_code == 200
        lesson_id = lesson_res.json()["id"]
        
        # Teacher should see lesson as unlocked
        teacher_lesson_res = requests.get(f"{BASE_URL}/api/lessons/{lesson_id}", headers=auth_headers)
        assert teacher_lesson_res.status_code == 200
        assert teacher_lesson_res.json()["is_unlocked"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", headers=auth_headers)


class TestCourseCoverUpload:
    """Test course cover image upload functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get teacher authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teacher@theroom.com",
            "password": "teacher123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_cover_upload_endpoint_exists(self, auth_headers):
        """Test that cover upload endpoint exists"""
        # Create a test course first
        course_res = requests.post(f"{BASE_URL}/api/courses",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "title": "TEST_Cover Upload Course",
                "description": "Testing cover upload",
                "is_published": False
            }
        )
        assert course_res.status_code == 200
        course_id = course_res.json()["id"]
        
        # Try to upload without file - should return 422 (validation error)
        upload_res = requests.post(f"{BASE_URL}/api/courses/{course_id}/cover",
            headers=auth_headers
        )
        # 422 means endpoint exists but requires file
        assert upload_res.status_code == 422
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course_id}", 
            headers={**auth_headers, "Content-Type": "application/json"})
    
    def test_cover_upload_with_image(self, auth_headers):
        """Test uploading a cover image"""
        # Create test course
        course_res = requests.post(f"{BASE_URL}/api/courses",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={
                "title": "TEST_Cover Image Course",
                "description": "Testing image upload",
                "is_published": False
            }
        )
        assert course_res.status_code == 200
        course_id = course_res.json()["id"]
        
        # Create a simple PNG image (1x1 pixel transparent)
        import base64
        # Minimal valid PNG (1x1 transparent pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        # Upload image
        files = {"file": ("test_cover.png", png_data, "image/png")}
        upload_res = requests.post(f"{BASE_URL}/api/courses/{course_id}/cover",
            headers=auth_headers,
            files=files
        )
        assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
        assert "thumbnail_url" in upload_res.json()
        
        # Verify course has thumbnail_url
        get_res = requests.get(f"{BASE_URL}/api/courses/{course_id}",
            headers={**auth_headers, "Content-Type": "application/json"})
        assert get_res.status_code == 200
        assert get_res.json()["thumbnail_url"] is not None
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/courses/{course_id}",
            headers={**auth_headers, "Content-Type": "application/json"})


class TestLoginDemoButtons:
    """Test that login page has correct demo buttons (no Admin)"""
    
    def test_teacher_login_works(self):
        """Test teacher demo credentials work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teacher@theroom.com",
            "password": "teacher123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "teacher"
        assert data["user"]["is_approved"] == True
    
    def test_member_login_works(self):
        """Test member demo credentials work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "member@theroom.com",
            "password": "member123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "member"
        assert data["user"]["is_approved"] == True
    
    def test_admin_login_not_exist(self):
        """Test that admin demo credentials don't exist"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@theroom.com",
            "password": "admin123"
        })
        # Should fail - admin demo user shouldn't exist
        assert response.status_code == 401


class TestCourseWizardSteps:
    """Test Course Wizard 3-step flow with Settings step"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get teacher authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teacher@theroom.com",
            "password": "teacher123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_course_api_accepts_unlock_type(self, auth_headers):
        """Test that course creation API accepts unlock_type in request"""
        # Test with sequential
        response1 = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Wizard Sequential",
                "description": "Created with sequential from wizard",
                "unlock_type": "sequential",
                "is_published": False
            }
        )
        assert response1.status_code == 200
        assert response1.json()["unlock_type"] == "sequential"
        requests.delete(f"{BASE_URL}/api/courses/{response1.json()['id']}", headers=auth_headers)
        
        # Test with scheduled
        response2 = requests.post(f"{BASE_URL}/api/courses",
            headers=auth_headers,
            json={
                "title": "TEST_Wizard Scheduled",
                "description": "Created with scheduled from wizard",
                "unlock_type": "scheduled",
                "is_published": False
            }
        )
        assert response2.status_code == 200
        assert response2.json()["unlock_type"] == "scheduled"
        requests.delete(f"{BASE_URL}/api/courses/{response2.json()['id']}", headers=auth_headers)
