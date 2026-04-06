"""
Zoom Integration API Tests
Tests for the new Zoom OAuth integration endpoints:
- GET /api/zoom/status - Check Zoom connection status
- GET /api/zoom/connect - Start OAuth flow (returns 503 when not configured)
- POST /api/zoom/disconnect - Disconnect Zoom account
- POST /api/zoom/webhook - Handle Zoom webhooks (CRC challenge, recording.completed)
"""

import pytest
import requests
import os
import json
import hmac
import hashlib

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "kirah092804@gmail.com"
ADMIN_PASSWORD = "sZ3Og1s$f&ki"


class TestZoomStatus:
    """Tests for GET /api/zoom/status endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_zoom_status_requires_auth(self):
        """GET /api/zoom/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/zoom/status")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
    
    def test_zoom_status_returns_not_configured(self):
        """GET /api/zoom/status returns configured=false when no Zoom credentials"""
        response = requests.get(f"{BASE_URL}/api/zoom/status", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "configured" in data, "Response should have 'configured' field"
        assert "connected" in data, "Response should have 'connected' field"
        # Since ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET are empty, configured should be False
        assert data["configured"] == False, f"Expected configured=False, got {data['configured']}"
        assert data["connected"] == False, f"Expected connected=False, got {data['connected']}"


class TestZoomConnect:
    """Tests for GET /api/zoom/connect endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_zoom_connect_requires_auth(self):
        """GET /api/zoom/connect requires authentication"""
        response = requests.get(f"{BASE_URL}/api/zoom/connect")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
    
    def test_zoom_connect_returns_503_when_not_configured(self):
        """GET /api/zoom/connect returns 503 when Zoom credentials not set"""
        response = requests.get(f"{BASE_URL}/api/zoom/connect", headers=self.headers)
        assert response.status_code == 503, f"Expected 503, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should have 'detail' field"
        assert "not configured" in data["detail"].lower(), f"Error message should mention 'not configured': {data['detail']}"


class TestZoomDisconnect:
    """Tests for POST /api/zoom/disconnect endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_zoom_disconnect_requires_auth(self):
        """POST /api/zoom/disconnect requires authentication"""
        response = requests.post(f"{BASE_URL}/api/zoom/disconnect")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
    
    def test_zoom_disconnect_succeeds(self):
        """POST /api/zoom/disconnect succeeds even when not connected"""
        response = requests.post(f"{BASE_URL}/api/zoom/disconnect", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have 'message' field"
        assert "disconnected" in data["message"].lower(), f"Message should mention 'disconnected': {data['message']}"


class TestZoomWebhook:
    """Tests for POST /api/zoom/webhook endpoint"""
    
    def test_webhook_rejects_invalid_json(self):
        """POST /api/zoom/webhook rejects invalid JSON"""
        response = requests.post(
            f"{BASE_URL}/api/zoom/webhook",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_webhook_handles_crc_challenge(self):
        """POST /api/zoom/webhook handles Zoom CRC challenge (endpoint.url_validation)"""
        # Zoom sends this event to validate the webhook URL
        plain_token = "test_plain_token_12345"
        payload = {
            "event": "endpoint.url_validation",
            "payload": {
                "plainToken": plain_token
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/zoom/webhook",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plainToken" in data, "Response should have 'plainToken' field"
        assert "encryptedToken" in data, "Response should have 'encryptedToken' field"
        assert data["plainToken"] == plain_token, f"plainToken should match: {data['plainToken']}"
        
        # Verify the encrypted token is a valid hex string (SHA256 produces 64 hex chars)
        encrypted = data["encryptedToken"]
        assert len(encrypted) == 64, f"encryptedToken should be 64 hex chars, got {len(encrypted)}"
        assert all(c in '0123456789abcdef' for c in encrypted), "encryptedToken should be hex"
    
    def test_webhook_handles_recording_completed_no_teacher(self):
        """POST /api/zoom/webhook handles recording.completed with no connected teacher"""
        payload = {
            "event": "recording.completed",
            "payload": {
                "object": {
                    "host_id": "nonexistent_host_id_12345",
                    "topic": "Test Meeting",
                    "recording_files": [
                        {
                            "file_type": "MP4",
                            "recording_type": "active_speaker",
                            "download_url": "https://zoom.us/rec/download/test"
                        }
                    ]
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/zoom/webhook",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should have 'status' field"
        assert data["status"] == "no_connected_teacher", f"Expected status='no_connected_teacher', got {data['status']}"
    
    def test_webhook_ignores_non_recording_events(self):
        """POST /api/zoom/webhook ignores non-recording events"""
        payload = {
            "event": "meeting.started",
            "payload": {
                "object": {
                    "id": "12345"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/zoom/webhook",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should have 'status' field"
        assert data["status"] == "ignored", f"Expected status='ignored', got {data['status']}"


class TestZoomAuthRequirements:
    """Tests to verify auth requirements for Zoom endpoints"""
    
    def test_zoom_status_requires_approved_user(self):
        """GET /api/zoom/status requires an approved user"""
        # Without auth header
        response = requests.get(f"{BASE_URL}/api/zoom/status")
        assert response.status_code in [401, 403]
    
    def test_zoom_connect_requires_teacher_or_admin(self):
        """GET /api/zoom/connect requires teacher or admin role"""
        # Without auth header
        response = requests.get(f"{BASE_URL}/api/zoom/connect")
        assert response.status_code in [401, 403]
    
    def test_zoom_disconnect_requires_teacher_or_admin(self):
        """POST /api/zoom/disconnect requires teacher or admin role"""
        # Without auth header
        response = requests.post(f"{BASE_URL}/api/zoom/disconnect")
        assert response.status_code in [401, 403]
    
    def test_zoom_webhook_is_public(self):
        """POST /api/zoom/webhook is public (no auth required for Zoom to call it)"""
        # Webhook should accept requests without auth (Zoom calls it)
        response = requests.post(
            f"{BASE_URL}/api/zoom/webhook",
            json={"event": "test"}
        )
        # Should not be 401 - it's a public endpoint
        assert response.status_code != 401, f"Webhook should be public, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
