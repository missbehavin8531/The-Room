import asyncio
import logging
import resend

from database import RESEND_API_KEY, SENDER_EMAIL

resend.api_key = RESEND_API_KEY
logger = logging.getLogger(__name__)


class EmailService:
    @staticmethod
    async def send_email(to: str, subject: str, html: str) -> dict:
        if not RESEND_API_KEY:
            logger.warning("RESEND_API_KEY not configured, skipping email")
            return {"status": "skipped", "reason": "API key not configured"}
        
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html
            }
            result = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Email sent to {to}: {subject}")
            return {"status": "sent", "id": result.get("id")}
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    @staticmethod
    def get_base_template(content: str, title: str = "The Room") -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f0; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <tr>
                                <td style="background-color: #4a5d4a; padding: 30px; text-align: center;">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">{title}</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 40px 30px;">
                                    {content}
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color: #f9f9f6; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
                                    <p style="margin: 0; color: #888; font-size: 12px;">
                                        The Room - A weekly discipleship hub
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
    
    @classmethod
    async def send_welcome_email(cls, user_email: str, user_name: str):
        content = f"""
        <h2 style="color: #333; margin-top: 0;">Welcome to The Room, {user_name}!</h2>
        <p style="color: #555; line-height: 1.6;">
            Your account has been approved! You can now access all courses and participate in discussions.
        </p>
        <ul style="color: #555; line-height: 1.8;">
            <li>Browse and enroll in courses</li>
            <li>Join live video sessions</li>
            <li>Watch lesson replays</li>
            <li>Participate in discussions</li>
            <li>Download resources</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Start Learning</a>
        </div>
        """
        return await cls.send_email(user_email, "Welcome to The Room!", cls.get_base_template(content))
    
    @classmethod
    async def send_lesson_reminder(cls, user_email: str, user_name: str, lesson_title: str, course_title: str, lesson_date: str):
        content = f"""
        <h2 style="color: #333; margin-top: 0;">Upcoming Lesson Reminder</h2>
        <p style="color: #555; line-height: 1.6;">Hi {user_name},</p>
        <p style="color: #555; line-height: 1.6;">Don't forget! You have an upcoming lesson:</p>
        <div style="background-color: #f9f9f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #333; font-weight: 600; font-size: 18px;">{lesson_title}</p>
            <p style="margin: 0 0 5px 0; color: #666;">Course: {course_title}</p>
            <p style="margin: 0; color: #666;">Date: {lesson_date}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Lesson</a>
        </div>
        """
        return await cls.send_email(user_email, f"Reminder: {lesson_title}", cls.get_base_template(content))
    
    @classmethod
    async def send_teacher_reply_notification(cls, user_email: str, user_name: str, teacher_name: str, lesson_title: str, is_private: bool = False):
        reply_type = "private feedback" if is_private else "reply"
        content = f"""
        <h2 style="color: #333; margin-top: 0;">New {reply_type.title()} from {teacher_name}</h2>
        <p style="color: #555; line-height: 1.6;">Hi {user_name},</p>
        <p style="color: #555; line-height: 1.6;">{teacher_name} has sent you a {reply_type} on your response in <strong>{lesson_title}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">View {reply_type.title()}</a>
        </div>
        """
        return await cls.send_email(user_email, f"New {reply_type} from {teacher_name}", cls.get_base_template(content))
    
    @classmethod
    async def send_new_course_notification(cls, user_email: str, user_name: str, course_title: str, course_description: str):
        content = f"""
        <h2 style="color: #333; margin-top: 0;">New Course Available!</h2>
        <p style="color: #555; line-height: 1.6;">Hi {user_name},</p>
        <p style="color: #555; line-height: 1.6;">A new course has been published:</p>
        <div style="background-color: #f9f9f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #333; font-weight: 600; font-size: 18px;">{course_title}</p>
            <p style="margin: 0; color: #666;">{course_description[:200]}{'...' if len(course_description) > 200 else ''}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Enroll Now</a>
        </div>
        """
        return await cls.send_email(user_email, f"New Course: {course_title}", cls.get_base_template(content))


email_service = EmailService()
