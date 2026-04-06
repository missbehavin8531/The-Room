"""
Test suite for Video Upload and Link Recording Features
Tests:
- POST /api/lessons/{lesson_id}/recordings/upload — upload a video file (teacher/admin only)
- POST /api/lessons/{lesson_id}/recordings/link — add a Zoom recording link (teacher/admin only)
- GET /api/lessons/{lesson_id}/recordings/uploaded — list all uploaded/linked recordings
- GET /api/recordings/{recording_id}/stream — stream an uploaded video file with JWT auth
- DELETE /api/recordings/uploaded/{recording_id} — delete an uploaded/linked recording
- File size limit of 125MB enforced
- Only allowed video extensions accepted
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://room-preview-5.preview.emergentagent.com').rstrip('/')


class TestVideoUploadLinkAPI:
    """Test video upload and link recording endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get tokens and lesson ID"""
        # Admin login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kirah092804@gmail.com",
            "password": "sZ3Og1s$f&ki"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()['token']
        
        # Get a lesson ID
        response = requests.get(f"{BASE_URL}/api/lessons/all", 
            headers={"Authorization": f"Bearer {self.admin_token}"})
        assert response.status_code == 200, f"Failed to get lessons: {response.text}"
        lessons = response.json()
        assert len(lessons) > 0, "No lessons found in database"
        self.lesson_id = lessons[0]['id']
        print(f"Using lesson ID: {self.lesson_id}")
        
        # Store created recording IDs for cleanup
        self.created_recording_ids = []
        
        yield
        
        # Cleanup: delete any recordings created during tests
        for rec_id in self.created_recording_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/recordings/uploaded/{rec_id}",
                    headers={"Authorization": f"Bearer {self.admin_token}"}
                )
            except:
                pass
    
    # ============ UPLOAD ENDPOINT TESTS ============
    
    def test_upload_requires_auth(self):
        """Upload endpoint requires authentication"""
        # Create a small test video file
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test.mp4', io.BytesIO(video_content), 'video/mp4')}
        
        response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Upload endpoint requires authentication")
    
    def test_upload_video_success(self):
        """Admin can upload a video file"""
        # Create a small test video file (minimal MP4 header)
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test_upload.mp4', io.BytesIO(video_content), 'video/mp4')}
        
        response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'id' in data, "Response missing id"
        assert 'lesson_id' in data, "Response missing lesson_id"
        assert data['lesson_id'] == self.lesson_id, "Lesson ID mismatch"
        assert data['type'] == 'upload', "Type should be 'upload'"
        assert 'stream_url' in data, "Response missing stream_url"
        assert 'created_at' in data, "Response missing created_at"
        
        self.created_recording_ids.append(data['id'])
        print(f"✓ Admin can upload video file (recording_id: {data['id']})")
        return data['id']
    
    def test_upload_rejects_invalid_extension(self):
        """Upload rejects files with invalid extensions"""
        # Create a file with invalid extension
        file_content = b'This is not a video file'
        files = {'file': ('test.txt', io.BytesIO(file_content), 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert 'not allowed' in response.json().get('detail', '').lower(), "Should mention file type not allowed"
        print("✓ Upload rejects invalid file extensions")
    
    def test_upload_accepts_allowed_extensions(self):
        """Upload accepts all allowed video extensions"""
        allowed_extensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv']
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        
        for ext in allowed_extensions:
            files = {'file': (f'test{ext}', io.BytesIO(video_content), 'video/mp4')}
            response = requests.post(
                f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
                files=files,
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            assert response.status_code == 200, f"Expected 200 for {ext}, got {response.status_code}: {response.text}"
            self.created_recording_ids.append(response.json()['id'])
        
        print(f"✓ Upload accepts all allowed extensions: {allowed_extensions}")
    
    def test_upload_nonexistent_lesson_returns_404(self):
        """Upload to non-existent lesson returns 404"""
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test.mp4', io.BytesIO(video_content), 'video/mp4')}
        
        response = requests.post(
            f"{BASE_URL}/api/lessons/non-existent-lesson-id/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Upload to non-existent lesson returns 404")
    
    # ============ LINK ENDPOINT TESTS ============
    
    def test_add_link_requires_auth(self):
        """Add link endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/link",
            params={"url": "https://zoom.us/rec/share/test", "title": "Test Recording"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Add link endpoint requires authentication")
    
    def test_add_link_success(self):
        """Admin can add a recording link"""
        test_url = "https://zoom.us/rec/share/test-recording-link"
        test_title = "Test Zoom Recording"
        
        response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/link",
            params={"url": test_url, "title": test_title},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'id' in data, "Response missing id"
        assert data['lesson_id'] == self.lesson_id, "Lesson ID mismatch"
        assert data['type'] == 'link', "Type should be 'link'"
        assert data['url'] == test_url, "URL mismatch"
        assert data['title'] == test_title, "Title mismatch"
        assert 'created_at' in data, "Response missing created_at"
        
        self.created_recording_ids.append(data['id'])
        print(f"✓ Admin can add recording link (recording_id: {data['id']})")
        return data['id']
    
    def test_add_link_rejects_invalid_url(self):
        """Add link rejects URLs not starting with http"""
        response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/link",
            params={"url": "ftp://invalid.url", "title": "Test"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Add link rejects invalid URLs")
    
    def test_add_link_default_title(self):
        """Add link uses default title if not provided"""
        response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/link",
            params={"url": "https://zoom.us/rec/share/default-title-test"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data['title'] == "Zoom Recording", f"Expected default title, got {data['title']}"
        self.created_recording_ids.append(data['id'])
        print("✓ Add link uses default title when not provided")
    
    # ============ GET UPLOADED RECORDINGS TESTS ============
    
    def test_get_uploaded_recordings_requires_auth(self):
        """Get uploaded recordings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/uploaded")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Get uploaded recordings requires authentication")
    
    def test_get_uploaded_recordings_success(self):
        """Can get list of uploaded recordings"""
        # First add a recording
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test_list.mp4', io.BytesIO(video_content), 'video/mp4')}
        upload_response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert upload_response.status_code == 200
        self.created_recording_ids.append(upload_response.json()['id'])
        
        # Now get the list
        response = requests.get(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/uploaded",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one recording"
        
        # Validate structure
        rec = data[-1]  # Get the last one (most recently added)
        assert 'id' in rec, "Recording missing id"
        assert 'lesson_id' in rec, "Recording missing lesson_id"
        assert 'type' in rec, "Recording missing type"
        assert 'title' in rec, "Recording missing title"
        assert 'created_at' in rec, "Recording missing created_at"
        
        print(f"✓ Can get uploaded recordings list (found {len(data)} recordings)")
    
    def test_get_uploaded_recordings_includes_both_types(self):
        """Get uploaded recordings includes both upload and link types"""
        # Add an upload
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test_both.mp4', io.BytesIO(video_content), 'video/mp4')}
        upload_response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.created_recording_ids.append(upload_response.json()['id'])
        
        # Add a link
        link_response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/link",
            params={"url": "https://zoom.us/rec/share/both-types-test", "title": "Link Recording"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.created_recording_ids.append(link_response.json()['id'])
        
        # Get the list
        response = requests.get(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/uploaded",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        types = [rec['type'] for rec in data]
        assert 'upload' in types, "Should include upload type"
        assert 'link' in types, "Should include link type"
        
        # Validate upload has stream_url
        upload_rec = next((r for r in data if r['type'] == 'upload'), None)
        assert upload_rec is not None
        assert 'stream_url' in upload_rec, "Upload recording should have stream_url"
        
        # Validate link has url
        link_rec = next((r for r in data if r['type'] == 'link'), None)
        assert link_rec is not None
        assert 'url' in link_rec, "Link recording should have url"
        
        print("✓ Get uploaded recordings includes both upload and link types")
    
    # ============ STREAM ENDPOINT TESTS ============
    
    def test_stream_requires_token(self):
        """Stream endpoint requires token query param"""
        # First upload a video
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test_stream.mp4', io.BytesIO(video_content), 'video/mp4')}
        upload_response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        recording_id = upload_response.json()['id']
        self.created_recording_ids.append(recording_id)
        
        # Try to stream without token
        response = requests.get(f"{BASE_URL}/api/recordings/{recording_id}/stream")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Stream endpoint requires token")
    
    def test_stream_rejects_invalid_token(self):
        """Stream endpoint rejects invalid token"""
        # First upload a video
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test_stream_invalid.mp4', io.BytesIO(video_content), 'video/mp4')}
        upload_response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        recording_id = upload_response.json()['id']
        self.created_recording_ids.append(recording_id)
        
        # Try to stream with invalid token
        response = requests.get(f"{BASE_URL}/api/recordings/{recording_id}/stream?token=invalid-token")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Stream endpoint rejects invalid token")
    
    def test_stream_success_with_valid_token(self):
        """Stream endpoint works with valid token"""
        # First upload a video
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test_stream_valid.mp4', io.BytesIO(video_content), 'video/mp4')}
        upload_response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        recording_id = upload_response.json()['id']
        self.created_recording_ids.append(recording_id)
        
        # Stream with valid token
        response = requests.get(
            f"{BASE_URL}/api/recordings/{recording_id}/stream?token={self.admin_token}",
            stream=True
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'video' in response.headers.get('content-type', ''), "Content-Type should be video"
        print("✓ Stream endpoint works with valid token")
    
    def test_stream_nonexistent_recording_returns_404(self):
        """Stream non-existent recording returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/recordings/non-existent-id/stream?token={self.admin_token}"
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Stream non-existent recording returns 404")
    
    # ============ DELETE ENDPOINT TESTS ============
    
    def test_delete_requires_auth(self):
        """Delete endpoint requires authentication"""
        # First upload a video
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test_delete_auth.mp4', io.BytesIO(video_content), 'video/mp4')}
        upload_response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        recording_id = upload_response.json()['id']
        self.created_recording_ids.append(recording_id)
        
        # Try to delete without auth
        response = requests.delete(f"{BASE_URL}/api/recordings/uploaded/{recording_id}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Delete endpoint requires authentication")
    
    def test_delete_upload_success(self):
        """Admin can delete an uploaded recording"""
        # First upload a video
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov'
        files = {'file': ('test_delete.mp4', io.BytesIO(video_content), 'video/mp4')}
        upload_response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        recording_id = upload_response.json()['id']
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/recordings/uploaded/{recording_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.json().get('message') == 'Recording deleted', "Should return success message"
        
        # Verify it's gone
        list_response = requests.get(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/uploaded",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        recordings = list_response.json()
        assert not any(r['id'] == recording_id for r in recordings), "Recording should be deleted"
        
        print("✓ Admin can delete uploaded recording")
    
    def test_delete_link_success(self):
        """Admin can delete a linked recording"""
        # First add a link
        link_response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/link",
            params={"url": "https://zoom.us/rec/share/delete-test", "title": "Delete Test"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        recording_id = link_response.json()['id']
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/recordings/uploaded/{recording_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print("✓ Admin can delete linked recording")
    
    def test_delete_nonexistent_returns_404(self):
        """Delete non-existent recording returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/recordings/uploaded/non-existent-id",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete non-existent recording returns 404")


class TestFileSizeLimit:
    """Test file size limit enforcement (125MB)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "kirah092804@gmail.com",
            "password": "sZ3Og1s$f&ki"
        })
        assert response.status_code == 200
        self.admin_token = response.json()['token']
        
        response = requests.get(f"{BASE_URL}/api/lessons/all", 
            headers={"Authorization": f"Bearer {self.admin_token}"})
        lessons = response.json()
        self.lesson_id = lessons[0]['id']
    
    def test_small_file_accepted(self):
        """Small files are accepted"""
        # 1KB file
        video_content = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08moov' + b'\x00' * 1000
        files = {'file': ('small.mp4', io.BytesIO(video_content), 'video/mp4')}
        
        response = requests.post(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings/upload",
            files=files,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/recordings/uploaded/{response.json()['id']}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print("✓ Small files are accepted")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
