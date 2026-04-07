from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import os
import logging

from database import client, db, UPLOAD_DIR

# Import routers
from auth import router as auth_router
from routes.users import router as users_router
from routes.courses import router as courses_router
from routes.lessons import router as lessons_router
from routes.prompts import router as prompts_router
from routes.social import router as social_router
from routes.attendance import router as attendance_router
from routes.video import router as video_router
from routes.progress import router as progress_router
from routes.notifications import router as notifications_router
from routes.seed import router as seed_router
from routes.groups import router as groups_router
from routes.websocket import router as websocket_router
from routes.zoom import router as zoom_router
from routes.security_log import router as security_log_router

# Create the main app
app = FastAPI(title="The Room API")

# Include all routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(courses_router)
app.include_router(lessons_router)
app.include_router(prompts_router)
app.include_router(social_router)
app.include_router(attendance_router)
app.include_router(video_router)
app.include_router(progress_router)
app.include_router(notifications_router)
app.include_router(seed_router)
app.include_router(groups_router)
app.include_router(websocket_router)
app.include_router(zoom_router)
app.include_router(security_log_router)

# Static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# CORS
frontend_url = os.environ.get('FRONTEND_URL', '')
cors_origins = os.environ.get('CORS_ORIGINS', frontend_url).split(',')
cors_origins = [o.strip() for o in cors_origins if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins if cors_origins else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_migrate_courses():
    """Auto-fix courses with orphaned group_ids on every startup."""
    try:
        # Get all active groups
        all_groups = await db.groups.find({}, {'_id': 0, 'id': 1}).to_list(500)
        valid_group_ids = {g['id'] for g in all_groups}

        if not valid_group_ids:
            logger.info("Migration: No groups found, skipping course fix.")
            return

        # Find courses with missing, null, or orphaned group_ids
        all_courses = await db.courses.find({}, {'_id': 0, 'id': 1, 'group_id': 1, 'title': 1}).to_list(5000)
        orphaned = [c for c in all_courses if not c.get('group_id') or c.get('group_id') not in valid_group_ids]

        if not orphaned:
            logger.info("Migration: All courses have valid group_ids.")
            return

        # Find the most populated group to assign orphaned courses to
        best_group_id = None
        best_count = -1
        for gid in valid_group_ids:
            count = await db.users.count_documents({'$or': [{'group_ids': gid}, {'group_id': gid}]})
            if count > best_count:
                best_count = count
                best_group_id = gid

        if not best_group_id:
            logger.warning("Migration: No group with users found.")
            return

        group_doc = await db.groups.find_one({'id': best_group_id}, {'_id': 0, 'name': 1})
        group_name = group_doc.get('name', 'Unknown') if group_doc else 'Unknown'

        # Reassign orphaned courses
        orphaned_ids = [c['id'] for c in orphaned]
        result = await db.courses.update_many(
            {'id': {'$in': orphaned_ids}},
            {'$set': {'group_id': best_group_id}}
        )
        logger.info(f"Migration: Reassigned {result.modified_count} orphaned courses to '{group_name}' ({best_group_id})")

        # Also fix lessons belonging to these courses
        orphaned_course_ids = [c['id'] for c in orphaned]
        lesson_result = await db.lessons.update_many(
            {'course_id': {'$in': orphaned_course_ids}, '$or': [{'group_id': {'$exists': False}}, {'group_id': None}]},
            {'$set': {'group_id': best_group_id}}
        )
        if lesson_result.modified_count:
            logger.info(f"Migration: Updated group_id on {lesson_result.modified_count} lessons.")

    except Exception as e:
        logger.error(f"Migration error: {e}")


@app.on_event("startup")
async def seed_demo_courses():
    """Ensure introduction courses exist in the database. Finds the best target group automatically."""
    try:
        # Strategy: find target group by priority
        # 1. Group with invite code DEMO2026
        # 2. Group named "The Room Demo Group"  
        # 3. Most populated group
        # 4. Any group at all
        target_group = await db.groups.find_one({'invite_code': 'DEMO2026'}, {'_id': 0})
        if not target_group:
            target_group = await db.groups.find_one({'name': {'$regex': 'demo', '$options': 'i'}}, {'_id': 0})
        if not target_group:
            # Find most populated group
            all_groups = await db.groups.find({}, {'_id': 0}).to_list(100)
            best, best_count = None, -1
            for g in all_groups:
                cnt = await db.users.count_documents({'$or': [{'group_ids': g['id']}, {'group_id': g['id']}]})
                if cnt > best_count:
                    best_count = cnt
                    best = g
            target_group = best
        if not target_group:
            # Last resort: any group
            target_group = await db.groups.find_one({}, {'_id': 0})
        
        if not target_group:
            logger.warning("Demo seed: No groups exist at all. Cannot seed courses.")
            return

        gid = target_group['id']
        logger.info(f"Demo seed: Target group = '{target_group.get('name')}' ({gid})")

        # Check which intro courses already exist ANYWHERE in the database
        existing = await db.courses.find(
            {'title': {'$regex': '^Introduction'}},
            {'_id': 0, 'title': 1, 'group_id': 1}
        ).to_list(50)
        existing_titles = {c['title'] for c in existing}
        
        # Also move any existing intro courses to the target group if they're orphaned
        for c in existing:
            if c.get('group_id') != gid:
                await db.courses.update_one(
                    {'title': c['title']},
                    {'$set': {'group_id': gid}}
                )
                logger.info(f"Demo seed: Moved '{c['title']}' to target group.")

        import uuid
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        
        # Find the admin/teacher for this group
        teacher = await db.users.find_one(
            {'role': {'$in': ['admin', 'teacher']}},
            {'_id': 0, 'id': 1, 'name': 1}
        )
        teacher_id = teacher['id'] if teacher else 'system'
        teacher_name = teacher.get('name', 'Teacher') if teacher else 'Teacher'

        demo_courses = [
            {
                'title': 'Introduction to the Gospel',
                'description': 'A foundational course exploring the core teachings of the Christian Gospel, from creation to redemption.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1566392062329-9935b9a7c950?w=600',
                'lessons': [
                    {
                        'title': 'The Good News',
                        'description': 'Understanding the heart of the Gospel message.',
                        'teacher_notes': '**Key Points:**\n\n1. The Gospel means "good news" — it is the announcement of salvation through Jesus Christ\n2. God created humanity for relationship, but sin separated us\n3. Jesus bridges the gap between God and humanity\n4. The Gospel is an invitation, not a requirement list\n\n*"For God so loved the world that he gave his one and only Son" — John 3:16*\n\n**Discussion Starter:** What does "good news" mean to you personally?',
                        'reading_plan': "**This Week's Reading:**\n\n- Monday: John 3:1-21 — Nicodemus and the New Birth\n- Tuesday: Romans 1:16-17 — The Power of the Gospel\n- Wednesday: 1 Corinthians 15:1-11 — The Resurrection\n- Thursday: Ephesians 2:1-10 — Saved by Grace\n- Friday: Psalm 96 — Sing a New Song",
                    },
                    {
                        'title': 'Faith and Grace',
                        'description': 'How faith and grace work together in the Christian life.',
                        'teacher_notes': '**Key Points:**\n\n1. Grace is God\'s unmerited favor — we cannot earn it\n2. Faith is our response to grace, not the cause of it\n3. "Works" flow from faith, not the other way around\n4. Grace transforms our identity before it changes our behavior\n\n*"For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God" — Ephesians 2:8*\n\n**Reflection:** Where do you struggle with trying to "earn" God\'s approval?',
                        'reading_plan': "**This Week's Reading:**\n\n- Monday: Romans 5:1-11 — Peace with God\n- Tuesday: Galatians 2:15-21 — Justified by Faith\n- Wednesday: Hebrews 11:1-16 — Heroes of Faith\n- Thursday: James 2:14-26 — Faith and Deeds\n- Friday: Titus 3:3-8 — Saved by Grace",
                    },
                    {
                        'title': 'Living in Christ',
                        'description': 'Practical application of Gospel truths in daily life.',
                        'teacher_notes': '**Key Points:**\n\n1. Living in Christ means daily surrender, not perfection\n2. The Holy Spirit empowers us to live differently\n3. Community is essential — we are not meant to walk alone\n4. Spiritual disciplines (prayer, scripture, fellowship) are rhythms, not rules\n\n*"I have been crucified with Christ and I no longer live, but Christ lives in me" — Galatians 2:20*\n\n**Challenge:** Pick one spiritual discipline to practice daily this week.',
                        'reading_plan': "**This Week's Reading:**\n\n- Monday: Colossians 3:1-17 — Life in Christ\n- Tuesday: Romans 12:1-8 — Living Sacrifice\n- Wednesday: Philippians 4:4-13 — Content in Christ\n- Thursday: 1 John 4:7-21 — God is Love\n- Friday: Psalm 1 — The Blessed Life",
                    },
                ]
            },
            {
                'title': 'Introduction to Artificial Intelligence',
                'description': 'Explore the fundamentals of AI — from machine learning and neural networks to real-world applications.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600',
                'lessons': [
                    {
                        'title': 'What Is AI?',
                        'description': 'A beginner-friendly overview of artificial intelligence.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **Artificial Intelligence** — Systems that can perform tasks typically requiring human intelligence\n2. **Narrow AI vs General AI** — Current AI is narrow (specialized), AGI remains theoretical\n3. **Real-World Examples** — Siri, Netflix recommendations, self-driving cars, ChatGPT\n4. **Brief History** — From Turing Test (1950) to modern large language models\n\n**Key Takeaway:** AI is a tool that augments human capability, not a replacement for human judgment.\n\n**Think About It:** What AI tools do you already use daily without realizing it?',
                        'reading_plan': "**This Week's Resources:**\n\n- Watch: \"AI Explained in 5 Minutes\" — YouTube\n- Read: \"What Is Artificial Intelligence?\" — IBM Research\n- Explore: Try asking ChatGPT a creative question\n- Reflect: List 5 ways AI already affects your daily routine",
                    },
                    {
                        'title': 'Machine Learning Basics',
                        'description': 'How machines learn from data.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **Supervised Learning** — Training with labeled data (e.g., classifying emails as spam/not spam)\n2. **Unsupervised Learning** — Finding patterns in unlabeled data (e.g., customer segmentation)\n3. **Neural Networks** — Inspired by the human brain, layers of connected nodes\n4. **Training Process** — Data in → Model learns → Predictions out → Feedback → Improve\n\n**Analogy:** Machine learning is like teaching a child to recognize animals by showing thousands of pictures, not by explaining rules.\n\n**Discussion:** What kinds of decisions should NOT be delegated to machine learning?',
                        'reading_plan': "**This Week's Resources:**\n\n- Watch: \"Machine Learning for Beginners\" — freeCodeCamp\n- Read: Google's ML Crash Course (first 3 modules)\n- Try: Teachable Machine by Google — train your own image classifier\n- Reflect: What data would you need to solve a problem you care about?",
                    },
                    {
                        'title': 'AI Ethics & the Future',
                        'description': 'Navigating the ethical landscape of AI.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **Bias in AI** — Models inherit biases from training data. A biased dataset creates a biased AI\n2. **Privacy Concerns** — Facial recognition, data collection, surveillance\n3. **Job Displacement** — AI automates tasks, not entire jobs. Adaptation is key\n4. **Responsible AI** — Transparency, fairness, accountability, and human oversight\n\n**Case Study:** Amazon\'s AI recruiting tool was scrapped because it discriminated against women — trained on 10 years of male-dominated hiring data.\n\n**Big Question:** How do we ensure AI serves humanity equitably?',
                        'reading_plan': "**This Week's Resources:**\n\n- Watch: \"The Social Dilemma\" (Netflix) or \"Coded Bias\" documentary\n- Read: EU AI Act Summary — How Europe is regulating AI\n- Explore: AI Incident Database (incidentdatabase.ai)\n- Reflect: Write 3 principles you think should govern AI development",
                    },
                ]
            },
            {
                'title': 'Introduction to Digital Marketing',
                'description': 'Master the essentials of SEO, social media strategy, and online advertising.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
                'lessons': [
                    {
                        'title': 'SEO Fundamentals',
                        'description': 'How search engines work and how to rank.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **SEO = Search Engine Optimization** — Making your content discoverable on Google\n2. **How Google Works** — Crawl → Index → Rank using 200+ factors\n3. **On-Page SEO** — Keywords in titles, headers, meta descriptions, URL structure\n4. **Off-Page SEO** — Backlinks, domain authority, social signals\n5. **Technical SEO** — Site speed, mobile-friendliness, structured data\n\n**Quick Win:** Every page should have ONE primary keyword, used in the title, first paragraph, and meta description.\n\n**Assignment:** Google your own name or business. What shows up? What would you change?',
                        'reading_plan': "**This Week's Resources:**\n\n- Tool: Install \"MozBar\" Chrome extension and analyze 3 websites\n- Read: Moz Beginner's Guide to SEO (Chapters 1-3)\n- Watch: \"SEO in 2026\" — Ahrefs YouTube\n- Practice: Write a meta description for a page you own",
                    },
                    {
                        'title': 'Social Media Strategy',
                        'description': 'Building an effective social media presence.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **Platform Selection** — Go where your audience is, not everywhere\n   - Instagram/TikTok → Visual, younger demographic\n   - LinkedIn → B2B, professional\n   - Facebook → Community building, older demographic\n2. **Content Pillars** — Define 3-5 themes you consistently post about\n3. **The 80/20 Rule** — 80% value/education, 20% promotion\n4. **Engagement > Followers** — A small engaged audience beats a large passive one\n\n**Framework:** Every post should either Educate, Entertain, or Inspire.\n\n**Challenge:** Plan a week of social media content using only your phone.',
                        'reading_plan': "**This Week's Resources:**\n\n- Read: \"Building a StoryBrand\" by Donald Miller (Chapters 1-4)\n- Watch: Gary Vaynerchuk's \"Content Model\" on YouTube\n- Tool: Try Canva to create 3 social posts\n- Practice: Audit your own social media — what's working?",
                    },
                    {
                        'title': 'Paid Advertising (Google & Meta Ads)',
                        'description': 'Getting started with paid campaigns.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **Google Ads** — Intent-based: people are searching for solutions\n   - Search Ads, Display Ads, YouTube Ads\n   - Start with Search Ads targeting specific keywords\n2. **Meta Ads (Facebook/Instagram)** — Interest-based: interrupt people with relevant offers\n   - Powerful targeting: demographics, interests, behaviors\n   - Start with retargeting your website visitors\n3. **Budget Strategy** — Start with $10-20/day, test for 2 weeks, then scale winners\n4. **Key Metrics** — CPC (Cost Per Click), CTR (Click-Through Rate), ROAS (Return On Ad Spend)\n\n**Golden Rule:** Never run ads to a page that isn\'t optimized for conversion.\n\n**Assignment:** Create a mock ad campaign on paper: audience, message, budget, goal.',
                        'reading_plan': "**This Week's Resources:**\n\n- Watch: Google Skillshop — \"Google Ads Fundamentals\" (free cert)\n- Read: Facebook Blueprint — Module 1\n- Tool: Use Google Keyword Planner to research 10 keywords\n- Reflect: What's one product/service you'd advertise and to whom?",
                    },
                ]
            },
            {
                'title': 'Introduction to Mindfulness & Mental Wellness',
                'description': 'Build a sustainable mindfulness practice for stress management and emotional well-being.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600',
                'lessons': [
                    {
                        'title': 'The Science of Mindfulness',
                        'description': 'Evidence-based benefits of mindfulness.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **What Is Mindfulness?** — Paying attention to the present moment, without judgment\n2. **Neuroscience** — Regular practice physically changes the brain:\n   - Thickens the prefrontal cortex (decision-making)\n   - Shrinks the amygdala (stress/fear center)\n   - Strengthens neural pathways for focus\n3. **Research Results** — 8 weeks of meditation reduces anxiety by 58% (Johns Hopkins)\n4. **It\'s Not About Emptying Your Mind** — It\'s about observing thoughts without reacting\n\n**Practice:** Try the \"5-4-3-2-1\" grounding technique: Name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste.\n\n**Reflection:** When do you feel most "present" in your daily life?',
                        'reading_plan': "**This Week's Practice:**\n\n- Monday: 5 minutes of focused breathing (set a timer)\n- Tuesday: Body scan meditation (YouTube: \"10 min body scan\")\n- Wednesday: Mindful eating — eat one meal with zero distractions\n- Thursday: Walking meditation — 10 minutes outdoors, focus on each step\n- Friday: Gratitude journaling — write 3 things you're grateful for",
                    },
                    {
                        'title': 'Stress Management & Emotional Regulation',
                        'description': 'Practical techniques for managing stress.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **Stress Response** — Fight/flight/freeze is a survival mechanism, not a lifestyle\n2. **Acute vs Chronic Stress** — Short-term stress is normal; chronic stress destroys health\n3. **The STOP Technique:**\n   - **S** — Stop what you\'re doing\n   - **T** — Take a breath\n   - **O** — Observe your thoughts and feelings\n   - **P** — Proceed with awareness\n4. **Emotional Regulation** — Name the emotion to tame it. "I am angry" → "I notice I\'m feeling anger"\n5. **Boundaries** — Saying "no" is a form of self-care, not selfishness\n\n**Exercise:** The next time you feel stressed, pause and rate it 1-10. Just the act of rating reduces intensity.\n\n**Discussion:** What\'s your default stress response — fight, flight, or freeze?',
                        'reading_plan': "**This Week's Practice:**\n\n- Daily: Practice the STOP technique at least once\n- Read: \"The Body Keeps the Score\" by Bessel van der Kolk (Chapters 1-2)\n- Watch: \"How to Make Stress Your Friend\" — Kelly McGonigal TED Talk\n- Journal: Track your stress levels (1-10) morning and evening for 5 days",
                    },
                    {
                        'title': 'Building a Sustainable Wellness Routine',
                        'description': 'Creating lasting healthy habits.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **Habit Stacking** — Attach new habits to existing ones ("After I brush my teeth, I meditate for 2 min")\n2. **Start Embarrassingly Small** — 2 minutes of meditation > 0 minutes. Don\'t aim for perfection\n3. **The 4 Pillars of Wellness:**\n   - Sleep (7-9 hours, consistent schedule)\n   - Movement (30 min daily, any form)\n   - Nutrition (whole foods, hydration)\n   - Connection (meaningful relationships)\n4. **Self-Compassion** — Missing a day doesn\'t reset your progress. Consistency > perfection\n\n**Your Wellness Blueprint:** Pick ONE habit from each pillar. Practice all four for the next 7 days.\n\n**Final Reflection:** What does "wellness" mean to YOU — not what society says it should look like?',
                        'reading_plan': "**This Week's Practice:**\n\n- Read: \"Atomic Habits\" by James Clear (Chapters 1-4)\n- Create: Your personal \"Wellness Blueprint\" — 1 habit per pillar\n- Track: Use a simple checkbox to mark each habit daily\n- Share: Tell someone your plan (accountability doubles success rates)",
                    },
                ]
            },
            {
                'title': 'Introduction to Finance Basics',
                'description': 'Learn budgeting, investing fundamentals, and strategies for building long-term wealth.',
                'thumbnail_url': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600',
                'lessons': [
                    {
                        'title': 'Budgeting That Actually Works',
                        'description': 'Practical budgeting frameworks.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **The 50/30/20 Rule:**\n   - 50% Needs (rent, food, utilities, insurance)\n   - 30% Wants (dining out, entertainment, subscriptions)\n   - 20% Savings & Debt Repayment\n2. **Zero-Based Budgeting** — Every dollar gets a job. Income minus expenses = zero\n3. **Track Before You Budget** — Spend 2 weeks tracking every purchase before creating a budget\n4. **Emergency Fund** — 3-6 months of expenses. Start with $1,000 as a starter emergency fund\n5. **Automate** — Set up automatic transfers on payday. You can\'t spend what you don\'t see\n\n**Exercise:** Calculate your current 50/30/20 split. Most people are shocked by their "wants" percentage.\n\n**Discussion:** What\'s the hardest part of budgeting for you?',
                        'reading_plan': "**This Week's Resources:**\n\n- Tool: Download a free budget template (Google Sheets or Notion)\n- Read: \"The Total Money Makeover\" by Dave Ramsey (Chapters 1-3)\n- Watch: \"How to Budget\" — Two Cents (YouTube)\n- Action: Track EVERY expense for the next 7 days (use your phone's notes app)",
                    },
                    {
                        'title': 'Investing 101',
                        'description': 'Stocks, bonds, and index funds explained.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **Why Invest?** — Inflation erodes cash at ~3%/year. Your savings account is losing value\n2. **Asset Classes:**\n   - **Stocks** — Ownership in a company. Higher risk, higher return (~10%/yr historically)\n   - **Bonds** — Lending money to government/companies. Lower risk, lower return (~5%/yr)\n   - **Index Funds** — A basket of stocks that tracks the market. Best for beginners\n3. **Compound Interest** — $200/month at 8% for 30 years = $298,000 (you only invested $72,000)\n4. **Dollar-Cost Averaging** — Invest the same amount regularly regardless of price\n5. **Time > Timing** — Time in the market beats timing the market, every time\n\n**The #1 Rule:** Never invest money you\'ll need in the next 5 years.\n\n**Assignment:** Open a practice brokerage account and "buy" an index fund.',
                        'reading_plan': "**This Week's Resources:**\n\n- Read: \"The Little Book of Common Sense Investing\" by John Bogle (Chapters 1-3)\n- Watch: \"Stock Market for Beginners\" — Graham Stephan (YouTube)\n- Tool: Use a compound interest calculator — see your future wealth\n- Explore: Look at Vanguard's VTSAX or Fidelity's FZROX index funds",
                    },
                    {
                        'title': 'Building Long-Term Wealth',
                        'description': 'Strategies for financial freedom.',
                        'teacher_notes': '**Key Concepts:**\n\n1. **Financial Freedom** — When your passive income exceeds your expenses\n2. **The Wealth Equation:** Earn more + Spend less + Invest the difference\n3. **Retirement Accounts:**\n   - **401(k)** — Employer match = free money. Always max the match\n   - **Roth IRA** — Tax-free growth. Contribute up to $7,000/year\n   - **HSA** — Triple tax advantage for healthcare expenses\n4. **Multiple Income Streams** — Don\'t rely solely on a paycheck\n   - Side business, rental income, dividends, freelancing\n5. **Protect Your Wealth** — Insurance, estate planning, avoid lifestyle inflation\n\n**The FIRE Framework:** Financial Independence, Retire Early — save 50%+ of income, invest aggressively, retire in 10-15 years.\n\n**Final Challenge:** Write your 5-year financial goal. Be specific: amount, timeline, purpose.',
                        'reading_plan': "**This Week's Resources:**\n\n- Read: \"Rich Dad Poor Dad\" by Robert Kiyosaki (Chapters 1-4)\n- Watch: \"How to Retire Early\" — Ali Abdaal (YouTube)\n- Tool: Calculate your FIRE number (25x your annual expenses)\n- Action: Set up ONE automated investment this week, even if it's just $25/month",
                    },
                ]
            },
        ]

        seeded = 0
        for course_data in demo_courses:
            if course_data['title'] in existing_titles:
                continue

            course_id = str(uuid.uuid4())
            base_date = now + timedelta(days=seeded * 7)
            course = {
                'id': course_id,
                'title': course_data['title'],
                'description': course_data['description'],
                'thumbnail_url': course_data['thumbnail_url'],
                'is_published': True,
                'unlock_type': 'all',
                'teacher_id': teacher_id,
                'teacher_name': teacher_name,
                'group_id': gid,
                'created_at': now.isoformat()
            }
            await db.courses.insert_one(course)

            for i, lesson in enumerate(course_data['lessons']):
                lesson_date = (base_date + timedelta(days=i * 7)).strftime('%Y-%m-%d')
                await db.lessons.insert_one({
                    'id': str(uuid.uuid4()),
                    'course_id': course_id,
                    'title': lesson['title'],
                    'description': lesson['description'],
                    'teacher_notes': lesson.get('teacher_notes', ''),
                    'reading_plan': lesson.get('reading_plan', ''),
                    'lesson_date': lesson_date,
                    'is_published': True,
                    'discussion_locked': False,
                    'order': i,
                    'created_at': now.isoformat()
                })

            seeded += 1
            logger.info(f"Demo seed: Created '{course_data['title']}' with {len(course_data['lessons'])} lessons")

        if seeded:
            logger.info(f"Demo seed: Total {seeded} new courses created in '{target_group.get('name')}'.")
        else:
            logger.info("Demo seed: All 5 introduction courses already exist.")

        # FINAL SAFETY: Ensure ALL courses in the DB are published and have valid group_id
        await db.courses.update_many(
            {'$or': [{'is_published': {'$exists': False}}, {'is_published': None}]},
            {'$set': {'is_published': True}}
        )
        await db.courses.update_many(
            {'$or': [{'group_id': {'$exists': False}}, {'group_id': None}]},
            {'$set': {'group_id': gid}}
        )

    except Exception as e:
        logger.error(f"Demo seed error: {e}", exc_info=True)


@app.on_event("startup")
async def seed_demo_social_data():
    """Seed rich demo chat, progress, and messages data."""
    try:
        # Find demo group
        target_group = await db.groups.find_one({'invite_code': 'DEMO2026'}, {'_id': 0})
        if not target_group:
            target_group = await db.groups.find_one({'name': {'$regex': 'demo', '$options': 'i'}}, {'_id': 0})
        if not target_group:
            target_group = await db.groups.find_one({}, {'_id': 0})
        if not target_group:
            return

        gid = target_group['id']
        teacher = await db.users.find_one({'role': {'$in': ['admin', 'teacher']}}, {'_id': 0, 'id': 1, 'name': 1})
        teacher_id = teacher['id'] if teacher else 'system'
        teacher_name = teacher.get('name', 'Teacher') if teacher else 'Teacher'

        import uuid
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)

        # --- RICH CHAT MESSAGES ---
        existing_chats = await db.chat_messages.count_documents({'group_id': gid})
        if existing_chats < 10:
            await db.chat_messages.delete_many({'group_id': gid})
            demo_students = [
                ('demo-sarah', 'Sarah M.'),
                ('demo-david', 'David K.'),
                ('demo-priya', 'Priya N.'),
                ('demo-marcus', 'Marcus T.'),
            ]
            chat_messages = [
                (teacher_id, teacher_name, "Welcome to The Room! This is our group chat. Feel free to ask questions, share insights, or just say hi."),
                (demo_students[0][0], demo_students[0][1], "Hey everyone! Excited to be here. Just finished the first lesson on the Gospel — the reading plan was really helpful."),
                (demo_students[1][0], demo_students[1][1], "Same here! The John 3 passage hit different this time around. Anyone else feel that way?"),
                (teacher_id, teacher_name, "Love hearing that David! What specifically stood out to you?"),
                (demo_students[1][0], demo_students[1][1], "Verse 17 — \"God did not send his Son into the world to condemn the world.\" I always focused on verse 16 but 17 really completes the picture."),
                (demo_students[2][0], demo_students[2][1], "That's a great catch. I started the AI course too — the ethics lesson was eye-opening. Didn't realize how much bias can sneak into algorithms."),
                (demo_students[3][0], demo_students[3][1], "The finance course is no joke. I actually made a budget for the first time using the 50/30/20 rule. My \"wants\" category was... embarrassing lol"),
                (demo_students[0][0], demo_students[0][1], "Marcus you're not alone haha. The mindfulness course helped me realize I stress-spend. The STOP technique is simple but it works."),
                (teacher_id, teacher_name, "This is exactly why we have multiple courses — they all connect! Financial stress, mindfulness, faith... it's all part of growing as a whole person."),
                (demo_students[2][0], demo_students[2][1], "Are we meeting on Sunday? I want to discuss the digital marketing lesson with everyone."),
                (teacher_id, teacher_name, "Yes! Sunday at 10am as usual. We'll cover SEO Fundamentals and also do a quick check-in on everyone's reading plans."),
                (demo_students[3][0], demo_students[3][1], "I'll be there. Also just want to say this group has been so encouraging. Thanks Teacher for setting this up."),
                (demo_students[0][0], demo_students[0][1], "Agreed! Best decision I made was joining. See everyone Sunday!"),
                (teacher_id, teacher_name, "You all make it worth it. See you Sunday! Remember to finish your reading plans before then."),
            ]
            for i, (uid, uname, content) in enumerate(chat_messages):
                await db.chat_messages.insert_one({
                    'id': str(uuid.uuid4()),
                    'user_id': uid,
                    'user_name': uname,
                    'content': content,
                    'is_hidden': False,
                    'group_id': gid,
                    'created_at': (now - timedelta(hours=24-i)).isoformat()
                })
            logger.info(f"Demo seed: Created {len(chat_messages)} chat messages")

        # --- DEMO PRIVATE MESSAGES ---
        existing_msgs = await db.private_messages.count_documents({
            'sender_id': {'$in': ['demo-sarah', 'demo-david', teacher_id]}
        })
        if existing_msgs < 3:
            await db.private_messages.delete_many({'sender_id': {'$in': ['demo-sarah', 'demo-david', teacher_id, 'demo-priya']}})
            demo_private = [
                {
                    'id': str(uuid.uuid4()),
                    'sender_id': 'demo-sarah',
                    'sender_name': 'Sarah M.',
                    'teacher_id': teacher_id,
                    'teacher_name': teacher_name,
                    'content': "Hi Teacher! I had a question about this week's reading. In Romans 5:3-4, it talks about suffering producing perseverance. How do you personally apply that when going through a hard season?",
                    'is_read': True,
                    'created_at': (now - timedelta(hours=48)).isoformat()
                },
                {
                    'id': str(uuid.uuid4()),
                    'sender_id': teacher_id,
                    'sender_name': teacher_name,
                    'teacher_id': teacher_id,
                    'teacher_name': teacher_name,
                    'content': "Great question Sarah! For me, it helps to remember that perseverance isn't about ignoring pain — it's about choosing to grow through it. I journal during hard seasons and look back to see how God was working even when I couldn't see it. Would you like to chat about this more on Sunday?",
                    'is_read': True,
                    'created_at': (now - timedelta(hours=46)).isoformat()
                },
                {
                    'id': str(uuid.uuid4()),
                    'sender_id': 'demo-sarah',
                    'sender_name': 'Sarah M.',
                    'teacher_id': teacher_id,
                    'teacher_name': teacher_name,
                    'content': "That really helps, thank you! Yes, I'd love to discuss it more. See you Sunday!",
                    'is_read': True,
                    'created_at': (now - timedelta(hours=45)).isoformat()
                },
                {
                    'id': str(uuid.uuid4()),
                    'sender_id': 'demo-david',
                    'sender_name': 'David K.',
                    'teacher_id': teacher_id,
                    'teacher_name': teacher_name,
                    'content': "Hey Teacher, I missed last Sunday's session. Is there a recording I can watch? Also wanted to ask about joining the finance study group.",
                    'is_read': False,
                    'created_at': (now - timedelta(hours=12)).isoformat()
                },
                {
                    'id': str(uuid.uuid4()),
                    'sender_id': teacher_id,
                    'sender_name': teacher_name,
                    'teacher_id': teacher_id,
                    'teacher_name': teacher_name,
                    'content': "Hi David! Yes, the recording is on the lesson page under 'Watch Replay.' And absolutely — the finance group meets Wednesdays. I'll add you!",
                    'is_read': False,
                    'created_at': (now - timedelta(hours=10)).isoformat()
                },
            ]
            for msg in demo_private:
                await db.private_messages.insert_one(msg)
            logger.info(f"Demo seed: Created {len(demo_private)} private messages")

        # --- UPDATE EXISTING LESSONS WITH RICH CONTENT ---
        lessons_without_notes = await db.lessons.count_documents({
            '$or': [{'teacher_notes': {'$exists': False}}, {'teacher_notes': None}, {'teacher_notes': ''}]
        })
        if lessons_without_notes > 0:
            all_courses = await db.courses.find({'title': {'$regex': '^Introduction'}}, {'_id': 0, 'id': 1, 'title': 1}).to_list(10)
            for course in all_courses:
                lessons = await db.lessons.find({'course_id': course['id']}, {'_id': 0, 'id': 1, 'title': 1, 'teacher_notes': 1}).to_list(10)
                for lesson in lessons:
                    if not lesson.get('teacher_notes'):
                        generic_notes = f"**Lesson: {lesson['title']}**\n\nDetailed content for this lesson is being prepared. Check back soon for teacher notes, reading plans, and discussion questions."
                        await db.lessons.update_one(
                            {'id': lesson['id']},
                            {'$set': {'teacher_notes': generic_notes, 'discussion_locked': False}}
                        )
            logger.info(f"Demo seed: Updated {lessons_without_notes} lessons with content.")

    except Exception as e:
        logger.error(f"Demo social seed error: {e}", exc_info=True)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
