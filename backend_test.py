#!/usr/bin/env python3
"""
Sunday School Education App - Backend API Testing
Tests all backend endpoints with proper authentication and error handling
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SundaySchoolAPITester:
    def __init__(self, base_url: str = "https://educhurch.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test data storage
        self.course_id = None
        self.lesson_id = None
        self.comment_id = None
        self.chat_message_id = None
        self.private_message_id = None
        self.teacher_id = None

    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                self.log(f"   Response: {response.text[:200]}", "FAIL")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                try:
                    return False, response.json()
                except:
                    return False, {'error': response.text}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_auth_flow(self):
        """Test authentication endpoints"""
        self.log("=== Testing Authentication ===")
        
        # Test registration
        register_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            register_data
        )
        
        # Test login with admin credentials
        login_data = {
            "email": "admin@sundayschool.com",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            self.log(f"✅ Authenticated as {self.user_data['name']} ({self.user_data['role']})")
            
            # Test get current user
            self.run_test(
                "Get Current User",
                "GET",
                "auth/me",
                200
            )
        else:
            self.log("❌ Failed to authenticate - stopping tests", "ERROR")
            return False
            
        return True

    def test_user_management(self):
        """Test user management endpoints"""
        self.log("=== Testing User Management ===")
        
        # Get all users
        success, users_response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200
        )
        
        # Get pending users
        self.run_test(
            "Get Pending Users",
            "GET",
            "users/pending",
            200
        )
        
        # Get teachers
        success, teachers_response = self.run_test(
            "Get Teachers",
            "GET",
            "teachers",
            200
        )
        
        if success and teachers_response:
            teachers = teachers_response if isinstance(teachers_response, list) else []
            if teachers:
                self.teacher_id = teachers[0]['id']
                self.log(f"✅ Found teacher: {teachers[0]['name']}")

    def test_courses_and_lessons(self):
        """Test courses and lessons endpoints"""
        self.log("=== Testing Courses & Lessons ===")
        
        # Create a test course
        course_data = {
            "title": "Test Course",
            "description": "A test course for API testing",
            "zoom_link": "https://zoom.us/j/test123",
            "thumbnail_url": "https://example.com/thumb.jpg"
        }
        
        success, course_response = self.run_test(
            "Create Course",
            "POST",
            "courses",
            200,
            course_data
        )
        
        if success and 'id' in course_response:
            self.course_id = course_response['id']
            self.log(f"✅ Created course with ID: {self.course_id}")
        
        # Get all courses
        self.run_test(
            "Get All Courses",
            "GET",
            "courses",
            200
        )
        
        if self.course_id:
            # Get specific course
            self.run_test(
                "Get Course Details",
                "GET",
                f"courses/{self.course_id}",
                200
            )
            
            # Create a lesson
            lesson_data = {
                "course_id": self.course_id,
                "title": "Test Lesson",
                "description": "A test lesson for API testing",
                "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "lesson_date": "2026-01-15",
                "order": 1
            }
            
            success, lesson_response = self.run_test(
                "Create Lesson",
                "POST",
                "lessons",
                200,
                lesson_data
            )
            
            if success and 'id' in lesson_response:
                self.lesson_id = lesson_response['id']
                self.log(f"✅ Created lesson with ID: {self.lesson_id}")
            
            # Get course lessons
            self.run_test(
                "Get Course Lessons",
                "GET",
                f"courses/{self.course_id}/lessons",
                200
            )
        
        # Get next lesson
        self.run_test(
            "Get Next Lesson",
            "GET",
            "lessons/next/upcoming",
            200
        )
        
        if self.lesson_id:
            # Get lesson details
            self.run_test(
                "Get Lesson Details",
                "GET",
                f"lessons/{self.lesson_id}",
                200
            )

    def test_comments_and_discussions(self):
        """Test comments and discussion endpoints"""
        self.log("=== Testing Comments & Discussions ===")
        
        if not self.lesson_id:
            self.log("⚠️ No lesson ID available, skipping comment tests")
            return
        
        # Create a comment
        comment_data = {
            "content": "This is a test comment for API testing"
        }
        
        success, comment_response = self.run_test(
            "Create Comment",
            "POST",
            f"lessons/{self.lesson_id}/comments",
            200,
            comment_data
        )
        
        if success and 'id' in comment_response:
            self.comment_id = comment_response['id']
            self.log(f"✅ Created comment with ID: {self.comment_id}")
        
        # Get lesson comments
        self.run_test(
            "Get Lesson Comments",
            "GET",
            f"lessons/{self.lesson_id}/comments",
            200
        )

    def test_chat_system(self):
        """Test global chat endpoints"""
        self.log("=== Testing Chat System ===")
        
        # Send a chat message
        chat_data = {
            "content": "Hello from API test! This is a test message."
        }
        
        success, chat_response = self.run_test(
            "Send Chat Message",
            "POST",
            "chat",
            200,
            chat_data
        )
        
        if success and 'id' in chat_response:
            self.chat_message_id = chat_response['id']
            self.log(f"✅ Created chat message with ID: {self.chat_message_id}")
        
        # Get chat messages
        self.run_test(
            "Get Chat Messages",
            "GET",
            "chat?limit=50",
            200
        )

    def test_private_messaging(self):
        """Test private messaging endpoints"""
        self.log("=== Testing Private Messaging ===")
        
        if not self.teacher_id:
            self.log("⚠️ No teacher ID available, skipping private message tests")
            return
        
        # Send private message to teacher
        message_data = {
            "teacher_id": self.teacher_id,
            "content": "This is a test private message from API testing"
        }
        
        success, message_response = self.run_test(
            "Send Private Message",
            "POST",
            "messages",
            200,
            message_data
        )
        
        if success and 'id' in message_response:
            self.private_message_id = message_response['id']
            self.log(f"✅ Created private message with ID: {self.private_message_id}")
        
        # Get inbox
        self.run_test(
            "Get Message Inbox",
            "GET",
            "messages/inbox",
            200
        )

    def test_attendance_system(self):
        """Test attendance recording for narrow-wedge 5-step actions"""
        self.log("=== Testing Attendance System (5-Step Actions) ===")
        
        if not self.lesson_id:
            self.log("⚠️ No lesson ID available, skipping attendance tests")
            return
        
        # Test all 5 core actions
        actions = ["joined_live", "watched_replay", "viewed_slides", "responded", "marked_attended"]
        
        for action in actions:
            attendance_data = {
                "lesson_id": self.lesson_id,
                "action": action
            }
            
            self.run_test(
                f"Record Attendance - {action}",
                "POST",
                "attendance",
                200,
                attendance_data
            )
        
        # Get my attendance for the lesson (to check progress)
        self.run_test(
            "Get My Attendance for Lesson",
            "GET",
            f"attendance/my/{self.lesson_id}",
            200
        )

    def test_enrollment_system(self):
        """Test course enrollment/unenrollment functionality"""
        self.log("=== Testing Enrollment System ===")
        
        if not self.course_id:
            self.log("⚠️ No course ID available, skipping enrollment tests")
            return
        
        # Test enrollment
        success, enroll_response = self.run_test(
            "Enroll in Course",
            "POST",
            f"courses/{self.course_id}/enroll",
            200
        )
        
        if success:
            self.log(f"✅ Successfully enrolled in course {self.course_id}")
        
        # Get my enrollments
        self.run_test(
            "Get My Enrollments",
            "GET",
            "enrollments/my",
            200
        )
        
        # Test unenrollment
        success, unenroll_response = self.run_test(
            "Unenroll from Course",
            "DELETE",
            f"courses/{self.course_id}/enroll",
            200
        )
        
        if success:
            self.log(f"✅ Successfully unenrolled from course {self.course_id}")

    def test_analytics(self):
        """Test analytics endpoints"""
        self.log("=== Testing Analytics ===")
        
        # Get analytics overview
        self.run_test(
            "Get Analytics Overview",
            "GET",
            "analytics",
            200
        )
        
        # Get participation stats
        self.run_test(
            "Get Participation Stats",
            "GET",
            "analytics/participation",
            200
        )

    def test_seed_data(self):
        """Test seed data endpoint"""
        self.log("=== Testing Seed Data ===")
        
        self.run_test(
            "Seed Sample Data",
            "POST",
            "seed",
            200
        )

    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting Sunday School API Tests")
        self.log(f"Testing against: {self.base_url}")
        
        # Test basic connectivity
        success, _ = self.run_test(
            "API Root Endpoint",
            "GET",
            "",
            200
        )
        
        if not success:
            self.log("❌ Cannot connect to API - stopping tests", "ERROR")
            return False
        
        # Run test suites
        if not self.test_auth_flow():
            return False
            
        self.test_seed_data()
        self.test_user_management()
        self.test_courses_and_lessons()
        self.test_enrollment_system()
        self.test_comments_and_discussions()
        self.test_chat_system()
        self.test_private_messaging()
        self.test_attendance_system()
        self.test_analytics()
        
        return True

    def print_summary(self):
        """Print test results summary"""
        self.log("=" * 50)
        self.log("🏁 TEST SUMMARY")
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Tests Failed: {len(self.failed_tests)}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                self.log(f"  - {test['name']}: {error_msg}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = SundaySchoolAPITester()
    
    try:
        success = tester.run_all_tests()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("\n🎉 All tests passed!")
            return 0
        else:
            print(f"\n⚠️ {len(tester.failed_tests)} tests failed")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())