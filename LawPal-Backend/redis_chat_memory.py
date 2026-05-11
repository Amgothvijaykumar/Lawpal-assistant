import os
import json
from datetime import datetime, timezone
from typing import List, Dict, Optional

try:
    import redis
except Exception:  # Defer import errors to runtime paths where used
    redis = None  # type: ignore


class RedisChatMemory:
    """
    Simple Redis-backed short-term chat memory per user.

    - Key per user: chat:<userId>
    - Each message stored as a JSON string: {sender, text, timestamp}
    - Append with rpush, fetch with lrange, trim with ltrim
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        *,
        max_messages: int = 20,
        context_messages: int = 12,
        decode_responses: bool = True,
        socket_timeout: int = 3,
    ) -> None:
        if redis is None:
            raise RuntimeError("redis package is not installed. Add 'redis' to requirements.txt")

        self.redis_url = redis_url or os.environ.get("REDIS_URL", "")
        if not self.redis_url:
            raise ValueError("REDIS_URL is not set")

        self.max_messages = max(1, max_messages)
        self.context_messages = max(1, context_messages)
        self._r = redis.from_url(
            self.redis_url,
            decode_responses=decode_responses,
            socket_timeout=socket_timeout,
        )

    @staticmethod
    def _key(user_id: str) -> str:
        return f"chat:{user_id}"

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    def get_recent_messages(self, user_id: str, limit: Optional[int] = None) -> List[Dict]:
        """Return the last N messages in chronological order."""
        n = limit or self.context_messages
        # lrange supports negative indices; -n to -1 gets last n items in order
        rows = self._r.lrange(self._key(user_id), -n, -1)
        out: List[Dict] = []
        for row in rows:
            try:
                msg = json.loads(row)
                if isinstance(msg, dict) and {"sender", "text", "timestamp"}.issubset(msg.keys()):
                    out.append(msg)
            except Exception:
                # Skip malformed entries
                continue
        return out

    def append_message(self, user_id: str, sender: str, text: str, *, timestamp: Optional[str] = None) -> None:
        """Append a single message and trim to max_messages."""
        msg = {
            "sender": sender,
            "text": text,
            "timestamp": timestamp or self._now_iso(),
        }
        self._r.rpush(self._key(user_id), json.dumps(msg, ensure_ascii=False))
        # Keep only the last max_messages
        self._r.ltrim(self._key(user_id), -self.max_messages, -1)

    def append_user_and_bot(self, user_id: str, user_text: str, bot_text: str) -> None:
        """Append user message, then bot reply, trimming after each to preserve order and bounds."""
        self.append_message(user_id, "user", user_text)
        self.append_message(user_id, "bot", bot_text)

    @staticmethod
    def format_history_for_prompt(history: List[Dict]) -> str:
        """Format history into a compact, readable transcript for the model."""
        lines: List[str] = []
        for h in history:
            sender = h.get("sender", "user")
            text = (h.get("text") or "").strip()
            if not text:
                continue
            # Keep it compact; timestamps omitted in prompt to save tokens
            lines.append(f"{sender}: {text}")
        return "\n".join(lines)
