import re
import html


def strip_html_tags(text: str) -> str:
    """Remove all HTML/script tags from text."""
    # Remove script/style blocks entirely
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    # Remove all remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    return text


def sanitize_text(text: str, max_length: int) -> str:
    """Sanitize user input: strip HTML tags, decode entities, enforce max length."""
    if not text:
        return text
    text = strip_html_tags(text)
    text = html.unescape(text)
    text = text.strip()
    if len(text) > max_length:
        text = text[:max_length]
    return text


# Character limits used across the app
LIMITS = {
    'chat_message': 1000,
    'direct_message': 2000,
    'comment': 2000,
    'course_title': 200,
    'course_description': 2000,
    'lesson_title': 200,
    'lesson_description': 2000,
    'user_name': 100,
    'group_name': 100,
    'prompt_reply': 2000,
    'prompt_question': 500,
}
