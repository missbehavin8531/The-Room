"""
Test suite for verifying all 15 demo lessons have:
- YouTube video URLs (no 'No Replay Available')
- Discussion prompts (3 per lesson)
- Teacher notes
- Reading plan content
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Expected 15 lessons across 5 courses
EXPECTED_LESSONS = {
    'Introduction to the Gospel': ['The Good News', 'Faith and Grace', 'Living in Christ'],
    'Introduction to Artificial Intelligence': ['What Is AI?', 'Machine Learning Basics', 'AI Ethics & the Future'],
    'Introduction to Digital Marketing': ['SEO Fundamentals', 'Social Media Strategy', 'Paid Advertising (Google & Meta Ads)'],
    'Introduction to Mindfulness & Mental Wellness': ['The Science of Mindfulness', 'Stress Management & Emotional Regulation', 'Building a Sustainable Wellness Routine'],
    'Introduction to Finance Basics': ['Budgeting That Actually Works', 'Investing 101', 'Building Long-Term Wealth'],
}

# Expected YouTube URLs for each lesson
EXPECTED_YOUTUBE_URLS = {
    'The Good News': 'https://www.youtube.com/watch?v=ZEjjOnDck2U',
    'Faith and Grace': 'https://www.youtube.com/watch?v=A-zK3Uy-QcY',
    'Living in Christ': 'https://www.youtube.com/watch?v=u7pkTGIaoOo',
    'What Is AI?': 'https://www.youtube.com/watch?v=hKVNdNAIvD4',
    'Machine Learning Basics': 'https://www.youtube.com/watch?v=VZjLtRwsMGY',
    'AI Ethics & the Future': 'https://www.youtube.com/watch?v=wL_WvcQV19k',
    'SEO Fundamentals': 'https://www.youtube.com/watch?v=6IB4H4_teZA',
    'Social Media Strategy': 'https://www.youtube.com/watch?v=ljIjS9Kd9Ek',
    'Paid Advertising (Google & Meta Ads)': 'https://www.youtube.com/watch?v=6RXnGvkyjVw',
    'The Science of Mindfulness': 'https://www.youtube.com/watch?v=z6X5oEIg6Ak',
    'Stress Management & Emotional Regulation': 'https://www.youtube.com/watch?v=MIr3RsUWrdo',
    'Building a Sustainable Wellness Routine': 'https://www.youtube.com/watch?v=H_uc-uQ3Nkc',
    'Budgeting That Actually Works': 'https://www.youtube.com/watch?v=Ycf9DqLuDpY',
    'Investing 101': 'https://www.youtube.com/watch?v=-LpnYwt3seg',
    'Building Long-Term Wealth': 'https://www.youtube.com/watch?v=lT_gKGGpx6k',
}


@pytest.fixture(scope='module')
def guest_token():
    """Get guest auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/guest")
    assert response.status_code == 200, f"Guest auth failed: {response.text}"
    return response.json().get('token')


@pytest.fixture(scope='module')
def api_client(guest_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {guest_token}"
    })
    return session


@pytest.fixture(scope='module')
def all_courses(api_client):
    """Fetch all courses"""
    response = api_client.get(f"{BASE_URL}/api/courses")
    assert response.status_code == 200, f"Failed to fetch courses: {response.text}"
    return response.json()


@pytest.fixture(scope='module')
def intro_courses(all_courses):
    """Filter to only Introduction courses"""
    return [c for c in all_courses if c['title'].startswith('Introduction')]


class TestDemoCoursesExist:
    """Verify all 5 demo courses exist"""
    
    def test_five_intro_courses_exist(self, intro_courses):
        """All 5 Introduction courses should exist"""
        course_titles = {c['title'] for c in intro_courses}
        expected_titles = set(EXPECTED_LESSONS.keys())
        
        missing = expected_titles - course_titles
        assert len(missing) == 0, f"Missing courses: {missing}"
        print(f"PASS: All 5 Introduction courses exist: {course_titles}")
    
    def test_courses_are_published(self, intro_courses):
        """All intro courses should be published"""
        unpublished = [c['title'] for c in intro_courses if not c.get('is_published', True)]
        assert len(unpublished) == 0, f"Unpublished courses: {unpublished}"
        print(f"PASS: All {len(intro_courses)} courses are published")


class TestLessonsHaveYouTubeVideos:
    """Verify all 15 lessons have YouTube URLs"""
    
    def test_all_lessons_have_youtube_url(self, api_client, intro_courses):
        """Each lesson should have a youtube_url field"""
        lessons_without_youtube = []
        lessons_with_youtube = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            assert response.status_code == 200, f"Failed to fetch lessons for {course['title']}"
            lessons = response.json()
            
            for lesson in lessons:
                if not lesson.get('youtube_url'):
                    lessons_without_youtube.append(f"{course['title']} -> {lesson['title']}")
                else:
                    lessons_with_youtube.append(lesson['title'])
        
        assert len(lessons_without_youtube) == 0, f"Lessons missing youtube_url: {lessons_without_youtube}"
        print(f"PASS: All {len(lessons_with_youtube)} lessons have youtube_url")
    
    def test_youtube_urls_are_correct(self, api_client, intro_courses):
        """Each lesson's YouTube URL should match expected"""
        mismatched = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            for lesson in lessons:
                expected_url = EXPECTED_YOUTUBE_URLS.get(lesson['title'])
                actual_url = lesson.get('youtube_url')
                
                if expected_url and actual_url != expected_url:
                    mismatched.append(f"{lesson['title']}: expected {expected_url}, got {actual_url}")
        
        assert len(mismatched) == 0, f"YouTube URL mismatches: {mismatched}"
        print(f"PASS: All YouTube URLs match expected values")
    
    def test_recording_source_is_youtube(self, api_client, intro_courses):
        """Each lesson should have recording_source='youtube'"""
        wrong_source = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            for lesson in lessons:
                source = lesson.get('recording_source')
                if source != 'youtube':
                    wrong_source.append(f"{lesson['title']}: recording_source={source}")
        
        assert len(wrong_source) == 0, f"Lessons with wrong recording_source: {wrong_source}"
        print(f"PASS: All lessons have recording_source='youtube'")


class TestLessonsHaveDiscussionPrompts:
    """Verify all 15 lessons have 3 discussion prompts each"""
    
    def test_all_lessons_have_prompts(self, api_client, intro_courses):
        """Each lesson should have at least 3 discussion prompts"""
        lessons_without_prompts = []
        lessons_with_prompts = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            for lesson in lessons:
                prompts_response = api_client.get(f"{BASE_URL}/api/lessons/{lesson['id']}/prompts")
                if prompts_response.status_code != 200:
                    lessons_without_prompts.append(f"{lesson['title']}: API error {prompts_response.status_code}")
                    continue
                
                prompts = prompts_response.json()
                if len(prompts) < 3:
                    lessons_without_prompts.append(f"{lesson['title']}: only {len(prompts)} prompts (expected 3)")
                else:
                    lessons_with_prompts.append(f"{lesson['title']}: {len(prompts)} prompts")
        
        assert len(lessons_without_prompts) == 0, f"Lessons with insufficient prompts: {lessons_without_prompts}"
        print(f"PASS: All lessons have 3+ discussion prompts")
        for lp in lessons_with_prompts:
            print(f"  - {lp}")


class TestLessonsHaveTeacherNotes:
    """Verify all 15 lessons have teacher notes"""
    
    def test_all_lessons_have_teacher_notes(self, api_client, intro_courses):
        """Each lesson should have non-empty teacher_notes"""
        lessons_without_notes = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            for lesson in lessons:
                notes = lesson.get('teacher_notes', '')
                if not notes or len(notes) < 50:  # Should have substantial content
                    lessons_without_notes.append(f"{lesson['title']}: notes length={len(notes) if notes else 0}")
        
        assert len(lessons_without_notes) == 0, f"Lessons missing teacher_notes: {lessons_without_notes}"
        print(f"PASS: All lessons have teacher_notes with substantial content")
    
    def test_teacher_notes_have_key_points(self, api_client, intro_courses):
        """Teacher notes should contain 'Key' (Key Points/Key Concepts)"""
        lessons_without_key_points = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            for lesson in lessons:
                notes = lesson.get('teacher_notes', '')
                if 'Key' not in notes:
                    lessons_without_key_points.append(lesson['title'])
        
        assert len(lessons_without_key_points) == 0, f"Lessons without 'Key Points/Concepts': {lessons_without_key_points}"
        print(f"PASS: All teacher notes contain key points/concepts")


class TestLessonsHaveReadingPlan:
    """Verify all 15 lessons have reading plan content"""
    
    def test_all_lessons_have_reading_plan(self, api_client, intro_courses):
        """Each lesson should have non-empty reading_plan"""
        lessons_without_plan = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            for lesson in lessons:
                plan = lesson.get('reading_plan', '')
                if not plan or len(plan) < 50:  # Should have substantial content
                    lessons_without_plan.append(f"{lesson['title']}: reading_plan length={len(plan) if plan else 0}")
        
        assert len(lessons_without_plan) == 0, f"Lessons missing reading_plan: {lessons_without_plan}"
        print(f"PASS: All lessons have reading_plan with substantial content")
    
    def test_reading_plan_has_weekly_structure(self, api_client, intro_courses):
        """Reading plan should contain weekly structure (Monday, Tuesday, etc. or Week)"""
        lessons_without_structure = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            for lesson in lessons:
                plan = lesson.get('reading_plan', '')
                has_structure = any(day in plan for day in ['Monday', 'Tuesday', 'Wednesday', 'Week', 'Daily'])
                if not has_structure:
                    lessons_without_structure.append(lesson['title'])
        
        assert len(lessons_without_structure) == 0, f"Lessons without weekly structure in reading_plan: {lessons_without_structure}"
        print(f"PASS: All reading plans have weekly structure")


class TestLessonFlowIsLogical:
    """Verify lesson order within each course is logical (1→2→3)"""
    
    def test_lessons_have_correct_order(self, api_client, intro_courses):
        """Lessons should be ordered 0, 1, 2 within each course"""
        order_issues = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            # Sort by order field
            sorted_lessons = sorted(lessons, key=lambda x: x.get('order', 0))
            
            # Check order is 0, 1, 2
            for i, lesson in enumerate(sorted_lessons):
                if lesson.get('order', i) != i:
                    order_issues.append(f"{course['title']}: {lesson['title']} has order={lesson.get('order')}, expected {i}")
        
        assert len(order_issues) == 0, f"Order issues: {order_issues}"
        print(f"PASS: All lessons have correct order (0, 1, 2)")
    
    def test_lesson_titles_match_expected(self, api_client, intro_courses):
        """Lesson titles should match expected for each course"""
        title_issues = []
        
        for course in intro_courses:
            expected_titles = EXPECTED_LESSONS.get(course['title'], [])
            if not expected_titles:
                continue
            
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            actual_titles = [l['title'] for l in sorted(lessons, key=lambda x: x.get('order', 0))]
            
            if actual_titles != expected_titles:
                title_issues.append(f"{course['title']}: expected {expected_titles}, got {actual_titles}")
        
        assert len(title_issues) == 0, f"Title mismatches: {title_issues}"
        print(f"PASS: All lesson titles match expected order")


class TestGuestCanAccessAllContent:
    """Verify guest users can access all lesson content"""
    
    def test_guest_can_view_lesson_details(self, api_client, intro_courses):
        """Guest should be able to fetch individual lesson details"""
        access_issues = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            for lesson in lessons:
                detail_response = api_client.get(f"{BASE_URL}/api/lessons/{lesson['id']}")
                if detail_response.status_code != 200:
                    access_issues.append(f"{lesson['title']}: {detail_response.status_code}")
                else:
                    detail = detail_response.json()
                    # Verify key fields are present
                    if not detail.get('youtube_url'):
                        access_issues.append(f"{lesson['title']}: youtube_url missing in detail response")
        
        assert len(access_issues) == 0, f"Access issues: {access_issues}"
        print(f"PASS: Guest can access all lesson details with youtube_url")
    
    def test_guest_can_view_prompts(self, api_client, intro_courses):
        """Guest should be able to fetch discussion prompts"""
        access_issues = []
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            
            for lesson in lessons:
                prompts_response = api_client.get(f"{BASE_URL}/api/lessons/{lesson['id']}/prompts")
                if prompts_response.status_code != 200:
                    access_issues.append(f"{lesson['title']}: prompts API returned {prompts_response.status_code}")
        
        assert len(access_issues) == 0, f"Prompt access issues: {access_issues}"
        print(f"PASS: Guest can access all discussion prompts")


class TestTotalLessonCount:
    """Verify we have exactly 15 lessons across 5 courses"""
    
    def test_total_lesson_count(self, api_client, intro_courses):
        """Should have exactly 15 lessons (3 per course × 5 courses)"""
        total_lessons = 0
        
        for course in intro_courses:
            response = api_client.get(f"{BASE_URL}/api/courses/{course['id']}/lessons")
            lessons = response.json()
            total_lessons += len(lessons)
            print(f"  - {course['title']}: {len(lessons)} lessons")
        
        assert total_lessons == 15, f"Expected 15 lessons, got {total_lessons}"
        print(f"PASS: Total lesson count is 15")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
