"""
Test suite for Daily.co cloud recordings feature
Tests GET /api/lessons/{lesson_id}/recordings endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://room-preview-5.preview.emergentagent.com').rstrip('/')

class TestRecordingsAPI:
    """Test recordings endpoint for Daily.co cloud recordings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get tokens and lesson ID"""
        # Member login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "member@sundayschool.com",
            "password": "member123"
        })
        assert response.status_code == 200, f"Member login failed: {response.text}"
        self.member_token = response.json()['token']
        
        # Teacher login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teacher@sundayschool.com",
            "password": "teacher123"
        })
        assert response.status_code == 200, f"Teacher login failed: {response.text}"
        self.teacher_token = response.json()['token']
        
        # Get a lesson ID
        response = requests.get(f"{BASE_URL}/api/lessons/all", 
            headers={"Authorization": f"Bearer {self.member_token}"})
        assert response.status_code == 200, f"Failed to get lessons: {response.text}"
        lessons = response.json()
        assert len(lessons) > 0, "No lessons found in database"
        self.lesson_id = lessons[0]['id']
        
    def test_recordings_requires_auth(self):
        """Recordings endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings")
        assert response.status_code == 403 or response.status_code == 401, \
            f"Expected 401/403, got {response.status_code}"
        print("✓ Recordings endpoint requires authentication")
    
    def test_member_can_get_recordings(self):
        """Member can access recordings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings",
            headers={"Authorization": f"Bearer {self.member_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'lesson_id' in data, "Response missing lesson_id"
        assert 'recordings' in data, "Response missing recordings array"
        assert 'has_recordings' in data, "Response missing has_recordings boolean"
        assert data['lesson_id'] == self.lesson_id, "Lesson ID mismatch"
        assert isinstance(data['recordings'], list), "Recordings should be a list"
        assert isinstance(data['has_recordings'], bool), "has_recordings should be boolean"
        print(f"✓ Member can get recordings (found {len(data['recordings'])} recordings)")
    
    def test_teacher_can_get_recordings(self):
        """Teacher can access recordings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings",
            headers={"Authorization": f"Bearer {self.teacher_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data['lesson_id'] == self.lesson_id
        print(f"✓ Teacher can get recordings")
    
    def test_recordings_empty_array_when_no_recordings(self):
        """Returns empty array with has_recordings=false when no recordings exist"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings",
            headers={"Authorization": f"Bearer {self.member_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Since no live sessions have been held, recordings should be empty
        # This validates graceful handling of empty state
        assert isinstance(data['recordings'], list), "Recordings should be a list"
        if len(data['recordings']) == 0:
            assert data['has_recordings'] == False, "has_recordings should be False when no recordings"
            print("✓ Returns empty array with has_recordings=false (expected - no live sessions recorded)")
        else:
            assert data['has_recordings'] == True, "has_recordings should be True when recordings exist"
            print(f"✓ Found {len(data['recordings'])} recordings")
    
    def test_recordings_nonexistent_lesson_returns_404(self):
        """Non-existent lesson returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/non-existent-lesson-id/recordings",
            headers={"Authorization": f"Bearer {self.member_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent lesson returns 404")
    
    def test_recordings_response_structure(self):
        """Validate recordings response structure"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/recordings",
            headers={"Authorization": f"Bearer {self.member_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate response model structure
        assert 'lesson_id' in data
        assert 'recordings' in data
        assert 'has_recordings' in data
        
        # If recordings exist, validate each recording structure
        for rec in data['recordings']:
            assert 'id' in rec, "Recording missing id"
            assert 'room_name' in rec, "Recording missing room_name"
            # Optional fields
            if 'download_url' in rec:
                assert isinstance(rec['download_url'], (str, type(None)))
            if 'start_ts' in rec:
                assert isinstance(rec['start_ts'], (int, type(None)))
            if 'duration' in rec:
                assert isinstance(rec['duration'], (int, type(None)))
        
        print(f"✓ Recordings response structure is valid")


class TestVideoRoomCloudRecording:
    """Test that video rooms are created with cloud recording enabled"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get token and lesson ID"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "member@sundayschool.com",
            "password": "member123"
        })
        assert response.status_code == 200
        self.token = response.json()['token']
        
        # Get a lesson
        response = requests.get(f"{BASE_URL}/api/lessons/all", 
            headers={"Authorization": f"Bearer {self.token}"})
        assert response.status_code == 200
        lessons = response.json()
        assert len(lessons) > 0
        self.lesson_id = lessons[0]['id']
    
    def test_video_room_status_endpoint(self):
        """Video room status endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/lessons/{self.lesson_id}/video/status",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'room_exists' in data
        print(f"✓ Video room status endpoint working (room_exists: {data.get('room_exists')})")


class TestAttendanceWithRecording:
    """Test attendance tracking with recording playback"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "member@sundayschool.com",
            "password": "member123"
        })
        assert response.status_code == 200
        self.token = response.json()['token']
        
        response = requests.get(f"{BASE_URL}/api/lessons/all", 
            headers={"Authorization": f"Bearer {self.token}"})
        assert response.status_code == 200
        lessons = response.json()
        self.lesson_id = lessons[0]['id']
    
    def test_watched_replay_attendance(self):
        """Can record watched_replay attendance action"""
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            json={"lesson_id": self.lesson_id, "action": "watched_replay"},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        # Should return 200 (success or already recorded)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('action') == 'watched_replay', "Action should be watched_replay"
        print("✓ watched_replay attendance action recorded successfully")
    
    def test_get_my_attendance_includes_watched_replay(self):
        """Get my attendance includes watched_replay action"""
        # First record attendance
        requests.post(
            f"{BASE_URL}/api/attendance",
            json={"lesson_id": self.lesson_id, "action": "watched_replay"},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        # Then check my attendance
        response = requests.get(
            f"{BASE_URL}/api/attendance/my/{self.lesson_id}",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'actions' in data
        assert 'watched_replay' in data['actions'], "watched_replay should be in my attendance actions"
        print("✓ watched_replay appears in my attendance actions")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
