from fastapi import APIRouter, Depends
import uuid
from datetime import datetime, timezone

from database import db
from auth import hash_password, require_teacher_or_admin

router = APIRouter(prefix="/api")


@router.post("/seed")
async def seed_data():
    existing_teacher = await db.users.find_one({'$or': [
        {'email': 'kirah092804@gmail.com'},
        {'email': 'teacher@theroom.com'},
        {'email': 'teacher@sundayschool.com'}
    ]})
    if existing_teacher:
        return {'message': 'Data already seeded'}
    
    # Create default group
    group_id = str(uuid.uuid4())
    group = {
        'id': group_id,
        'name': 'The Room Group',
        'description': 'Default group for The Room platform',
        'invite_code': 'THEROOM1',
        'created_by': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.groups.insert_one(group)
    
    teacher_id = str(uuid.uuid4())
    teacher = {
        'id': teacher_id,
        'email': 'kirah092804@gmail.com',
        'name': 'Teacher',
        'password': hash_password('sZ3Og1s$f&ki'),
        'role': 'admin',
        'is_approved': True,
        'is_muted': False,
        'group_id': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(teacher)
    
    # Update group created_by
    await db.groups.update_one({'id': group_id}, {'$set': {'created_by': teacher_id}})
    
    member_id = str(uuid.uuid4())
    member = {
        'id': member_id,
        'email': 'member@theroom.com',
        'name': 'John Smith',
        'password': hash_password('n#WCniSK8S$Z'),
        'role': 'member',
        'is_approved': True,
        'is_muted': False,
        'group_id': group_id,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(member)
    
    course_id = str(uuid.uuid4())
    course = {
        'id': course_id,
        'title': 'Introduction to the Gospel',
        'description': 'A foundational course exploring the core teachings of the Gospel, perfect for new believers and those seeking to deepen their understanding.',
        'zoom_link': 'https://zoom.us/j/1234567890',
        'thumbnail_url': 'https://images.unsplash.com/photo-1610070835951-156b6921281d?w=800',
        'teacher_id': teacher_id,
        'teacher_name': 'Teacher',
        'is_published': True,
        'unlock_type': 'sequential',
        'group_id': group_id,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course)
    
    lessons_data = [
        {
            'title': 'The Good News',
            'description': 'Understanding the meaning and significance of the Gospel message.',
            'youtube_url': 'https://www.youtube.com/watch?v=cgn6bjRo1Lg',
            'lesson_date': '2026-02-09',
            'order': 1,
            'teacher_notes': '**Key Points to Remember:**\n\n1. The Gospel is the "good news" of salvation through Jesus Christ\n2. It\'s not about what we do, but what God has done for us\n3. The message is for everyone, regardless of background\n\n*"For God so loved the world that he gave his one and only Son" - John 3:16*',
            'reading_plan': '**This Week\'s Reading:**\n\n- Monday: John 3:1-21\n- Tuesday: Romans 1:16-17\n- Wednesday: 1 Corinthians 15:1-11\n- Thursday: Ephesians 2:1-10\n- Friday: Psalm 96',
            'prompts': [
                {'question': 'What does the Gospel mean to you personally?', 'order': 0},
                {'question': 'Share one way the good news has impacted your life.', 'order': 1},
            ]
        },
        {
            'title': 'Faith and Grace',
            'description': 'Exploring the relationship between faith and grace in salvation.',
            'youtube_url': 'https://www.youtube.com/watch?v=cgn6bjRo1Lg',
            'lesson_date': '2026-02-16',
            'order': 2,
            'teacher_notes': '**Understanding Grace:**\n\nGrace is unmerited favor - a gift we cannot earn.\n\n**Key Scriptures:**\n- Ephesians 2:8-9 - Saved by grace through faith\n- Romans 5:1-2 - Access to grace through faith\n\n**Discussion Focus:** Help members understand the balance between faith and works.',
            'reading_plan': '**This Week\'s Reading:**\n\n- Monday: Ephesians 2:1-10\n- Tuesday: Romans 3:21-31\n- Wednesday: Galatians 2:15-21\n- Thursday: Hebrews 11:1-6\n- Friday: James 2:14-26',
            'prompts': [
                {'question': 'How do you experience God\'s grace in your daily life?', 'order': 0},
                {'question': 'Give a specific example of grace you\'ve witnessed recently.', 'order': 1},
            ]
        },
        {
            'title': 'Living in Christ',
            'description': 'Practical guidance for daily living as followers of Christ.',
            'youtube_url': 'https://www.youtube.com/watch?v=cgn6bjRo1Lg',
            'lesson_date': '2026-02-23',
            'order': 3,
            'teacher_notes': '**Living It Out:**\n\nFaith is not just belief - it transforms how we live.\n\n**Practical Applications:**\n1. Daily prayer and Scripture reading\n2. Serving others in our community\n3. Speaking truth with love\n4. Forgiving as we have been forgiven\n\n*"Whatever you do, work at it with all your heart, as working for the Lord" - Colossians 3:23*',
            'reading_plan': '**This Week\'s Reading:**\n\n- Monday: Colossians 3:1-17\n- Tuesday: Romans 12:1-8\n- Wednesday: Galatians 5:16-26\n- Thursday: Philippians 4:4-9\n- Friday: 1 Peter 2:9-12',
            'prompts': [
                {'question': 'What is one practical way you can live out your faith this week?', 'order': 0},
                {'question': 'Who in your life could benefit from seeing Christ in you?', 'order': 1},
            ]
        }
    ]
    
    for lesson_data in lessons_data:
        lesson_id = str(uuid.uuid4())
        prompts_data = lesson_data.pop('prompts', [])
        
        lesson = {
            'id': lesson_id,
            'course_id': course_id,
            'title': lesson_data['title'],
            'description': lesson_data['description'],
            'youtube_url': lesson_data['youtube_url'],
            'lesson_date': lesson_data['lesson_date'],
            'order': lesson_data['order'],
            'teacher_notes': lesson_data.get('teacher_notes'),
            'reading_plan': lesson_data.get('reading_plan'),
            'zoom_link': 'https://zoom.us/j/1234567890' if lesson_data['order'] == 1 else None,
            'hosting_method': 'both',
            'discussion_locked': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.lessons.insert_one(lesson)
        
        for prompt_data in prompts_data:
            prompt_id = str(uuid.uuid4())
            prompt = {
                'id': prompt_id,
                'lesson_id': lesson_id,
                'question': prompt_data['question'],
                'order': prompt_data['order'],
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.teacher_prompts.insert_one(prompt)
            
            if prompt_data['order'] == 0:
                reply = {
                    'id': str(uuid.uuid4()),
                    'prompt_id': prompt_id,
                    'lesson_id': lesson_id,
                    'user_id': member_id,
                    'user_name': 'John Smith',
                    'content': f'This is a thoughtful response to: {prompt_data["question"]}',
                    'is_pinned': False,
                    'status': 'pending',
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                await db.prompt_replies.insert_one(reply)
        
        comment = {
            'id': str(uuid.uuid4()),
            'lesson_id': lesson_id,
            'user_id': member_id,
            'user_name': 'John Smith',
            'content': f'Great lesson on {lesson_data["title"]}! Really helped me understand better.',
            'is_hidden': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.comments.insert_one(comment)
    
    chat_messages = [
        {'user_id': member_id, 'user_name': 'John Smith', 'content': 'Good morning everyone!'},
        {'user_id': teacher_id, 'user_name': 'Teacher', 'content': 'Welcome to Sunday School chat! Feel free to ask questions.'},
    ]
    for msg in chat_messages:
        await db.chat_messages.insert_one({
            'id': str(uuid.uuid4()),
            **msg,
            'is_hidden': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
    
    return {
        'message': 'Seed data created',
        'credentials': {
            'teacher': {'email': 'kirah092804@gmail.com', 'password': 'sZ3Og1s$f&ki'},
            'member': {'email': 'member@theroom.com', 'password': 'n#WCniSK8S$Z'}
        }
    }

@router.get("/")
async def root():
    return {"message": "The Room API", "version": "1.0.0"}


@router.post("/admin/migrate-to-multi-tenant")
async def migrate_to_multi_tenant(user: dict = Depends(require_teacher_or_admin)):
    """One-time migration: creates a default group and assigns all existing data to it."""
    # Also handle old 'churches' collection rename
    collections = await db.client[db.name].list_collection_names()
    if 'churches' in collections:
        try:
            await db.client[db.name].churches.rename('groups')
        except Exception:
            pass

    # Rename old church_id fields to group_id
    for col_name in ['users', 'courses', 'chat_messages']:
        await db.client[db.name][col_name].update_many(
            {'church_id': {'$exists': True}},
            {'$rename': {'church_id': 'group_id'}}
        )

    existing_group = await db.groups.find_one({'invite_code': 'THEROOM1'})
    if existing_group:
        group_id = existing_group['id']
    else:
        group_id = str(uuid.uuid4())
        group = {
            'id': group_id,
            'name': 'The Room',
            'description': 'Default group',
            'invite_code': 'THEROOM1',
            'created_by': user['id'],
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.groups.insert_one(group)

    # Assign all users without a group_id
    result_users = await db.users.update_many(
        {'group_id': {'$exists': False}},
        {'$set': {'group_id': group_id}}
    )
    result_users2 = await db.users.update_many(
        {'group_id': None},
        {'$set': {'group_id': group_id}}
    )

    # Assign all courses without a group_id
    result_courses = await db.courses.update_many(
        {'group_id': {'$exists': False}},
        {'$set': {'group_id': group_id}}
    )
    result_courses2 = await db.courses.update_many(
        {'group_id': None},
        {'$set': {'group_id': group_id}}
    )

    # Assign chat messages
    await db.chat_messages.update_many(
        {'group_id': {'$exists': False}},
        {'$set': {'group_id': group_id}}
    )

    return {
        'message': 'Migration complete',
        'group_id': group_id,
        'users_updated': result_users.modified_count + result_users2.modified_count,
        'courses_updated': result_courses.modified_count + result_courses2.modified_count
    }


@router.delete("/admin/cleanup-test-data")
async def cleanup_test_data(user: dict = Depends(require_teacher_or_admin)):
    """Delete all non-admin/non-teacher test users and their associated data."""
    current_user_id = user['id']
    group_id = user.get('group_id')
    
    # Find test users to delete (members only, not the current user, same group)
    query = {'role': 'member', 'id': {'$ne': current_user_id}}
    if group_id:
        query['group_id'] = group_id
    
    test_users = await db.users.find(
        query,
        {'_id': 0, 'id': 1, 'name': 1}
    ).to_list(1000)
    
    test_user_ids = [u['id'] for u in test_users]
    deleted_names = [u['name'] for u in test_users]
    
    if not test_user_ids:
        return {'message': 'No test users to delete', 'deleted': []}
    
    # Delete users and all their associated data
    await db.users.delete_many({'id': {'$in': test_user_ids}})
    await db.enrollments.delete_many({'user_id': {'$in': test_user_ids}})
    await db.lesson_completions.delete_many({'user_id': {'$in': test_user_ids}})
    await db.attendance.delete_many({'user_id': {'$in': test_user_ids}})
    await db.comments.delete_many({'user_id': {'$in': test_user_ids}})
    await db.chat_messages.delete_many({'user_id': {'$in': test_user_ids}})
    await db.prompt_replies.delete_many({'user_id': {'$in': test_user_ids}})
    await db.prompt_responses.delete_many({'user_id': {'$in': test_user_ids}})
    await db.private_messages.delete_many({'sender_id': {'$in': test_user_ids}})
    await db.private_feedback.delete_many({'student_id': {'$in': test_user_ids}})
    await db.push_subscriptions.delete_many({'user_id': {'$in': test_user_ids}})
    await db.reading_reminder_settings.delete_many({'user_id': {'$in': test_user_ids}})
    await db.user_onboarding.delete_many({'user_id': {'$in': test_user_ids}})
    await db.password_resets.delete_many({'user_id': {'$in': test_user_ids}})
    
    return {
        'message': f'Deleted {len(test_user_ids)} member accounts and all associated data',
        'deleted': deleted_names
    }
