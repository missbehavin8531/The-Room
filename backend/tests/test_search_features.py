"""
Test Search API and related features for iteration 13
Tests: Search endpoint with various queries
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSearchAPI:
    """Search endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        # Login as teacher
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "teacher@theroom.com",
            "password": "teacher123"
        })
        assert response.status_code == 200, "Teacher login failed"
        self.teacher_token = response.json()["token"]
        self.teacher_headers = {"Authorization": f"Bearer {self.teacher_token}"}
        
        # Login as member
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "member@theroom.com",
            "password": "member123"
        })
        assert response.status_code == 200, "Member login failed"
        self.member_token = response.json()["token"]
        self.member_headers = {"Authorization": f"Bearer {self.member_token}"}
    
    def test_search_gospel_returns_results(self):
        """Test search for 'gospel' returns courses, lessons, discussions"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": "gospel"},
            headers=self.teacher_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "courses" in data
        assert "lessons" in data
        assert "discussions" in data
        
        # Verify we get results
        assert len(data["courses"]) > 0, "Expected at least one course result"
        
        # Verify course structure
        course = data["courses"][0]
        assert "id" in course
        assert "title" in course
        assert "description" in course
        assert "type" in course
        assert course["type"] == "course"
    
    def test_search_genesis_returns_results(self):
        """Test search for 'genesis' returns course results"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": "genesis"},
            headers=self.teacher_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "courses" in data
        assert "lessons" in data
        assert "discussions" in data
        
        # Verify we get course results for genesis
        assert len(data["courses"]) > 0, "Expected at least one course result for genesis"
        
        # Verify the course is about Genesis
        course = data["courses"][0]
        assert "genesis" in course["title"].lower() or "genesis" in course.get("description", "").lower()
    
    def test_search_requires_auth(self):
        """Test search endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": "test"}
        )
        # API returns 403 for unauthenticated requests (require_approved dependency)
        assert response.status_code in [401, 403], "Search should require authentication"
    
    def test_search_requires_query(self):
        """Test search endpoint requires query parameter"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            headers=self.teacher_headers
        )
        assert response.status_code == 422, "Search should require query parameter"
    
    def test_search_member_access(self):
        """Test member user can access search"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": "gospel"},
            headers=self.member_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Member should get results too
        assert "courses" in data
        assert "lessons" in data
        assert "discussions" in data
    
    def test_search_empty_query_rejected(self):
        """Test empty query is rejected"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": ""},
            headers=self.teacher_headers
        )
        # Empty query should be rejected (min_length=1)
        assert response.status_code == 422
    
    def test_search_no_results_returns_empty_arrays(self):
        """Test search with no matches returns empty arrays"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": "xyznonexistent123"},
            headers=self.teacher_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return empty arrays, not error
        assert data["courses"] == []
        assert data["lessons"] == []
        assert data["discussions"] == []
    
    def test_search_discussion_includes_user_name(self):
        """Test discussion results include user_name field"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": "gospel"},
            headers=self.teacher_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # If there are discussions, verify user_name is included
        if len(data["discussions"]) > 0:
            discussion = data["discussions"][0]
            assert "user_name" in discussion, "Discussion should include user_name"
            assert "lesson_id" in discussion, "Discussion should include lesson_id"
            assert "content" in discussion, "Discussion should include content"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
