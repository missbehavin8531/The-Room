import time
from collections import defaultdict


class RateLimiter:
    """Simple in-memory rate limiter using sliding window."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, user_id: str) -> bool:
        now = time.time()
        window_start = now - self.window_seconds
        # Clean old entries
        self.requests[user_id] = [
            t for t in self.requests[user_id] if t > window_start
        ]
        if len(self.requests[user_id]) >= self.max_requests:
            return True
        self.requests[user_id].append(now)
        return False

    def remaining(self, user_id: str) -> int:
        now = time.time()
        window_start = now - self.window_seconds
        self.requests[user_id] = [
            t for t in self.requests[user_id] if t > window_start
        ]
        return max(0, self.max_requests - len(self.requests[user_id]))


# Chat: 10 messages per 30 seconds
chat_rate_limiter = RateLimiter(max_requests=10, window_seconds=30)
