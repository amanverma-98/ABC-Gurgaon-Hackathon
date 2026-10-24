"""Redis client for session state caching and rate limiting.

Provides in-memory fallback when Redis is unavailable (development mode).
"""

from __future__ import annotations

import json
import time
from typing import Any, Optional

import structlog

from app.config import Settings

logger = structlog.get_logger(__name__)

_redis_client = None
_fallback_store: dict[str, Any] = {}
_fallback_ttl: dict[str, float] = {}


async def init_redis(settings: Settings) -> None:
    """Initialize Redis connection."""
    global _redis_client
    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
        )
        # Test connection
        await _redis_client.ping()
        logger.info("redis_connected", url=settings.redis_url)
    except Exception as e:
        logger.warning(
            "redis_unavailable_using_fallback",
            error=str(e),
        )
        _redis_client = None


async def close_redis() -> None:
    """Close Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
        logger.info("redis_closed")


async def is_connected() -> bool:
    """Check if Redis is connected."""
    if _redis_client is None:
        return False
    try:
        await _redis_client.ping()
        return True
    except Exception:
        return False


async def set_value(key: str, value: Any, ttl_seconds: int = 1800) -> None:
    """Store a value with TTL."""
    serialized = json.dumps(value) if not isinstance(value, str) else value

    if _redis_client:
        await _redis_client.set(key, serialized, ex=ttl_seconds)
    else:
        _fallback_store[key] = serialized
        _fallback_ttl[key] = time.time() + ttl_seconds


async def get_value(key: str) -> Optional[str]:
    """Retrieve a value by key."""
    if _redis_client:
        return await _redis_client.get(key)
    else:
        if key in _fallback_store:
            if time.time() < _fallback_ttl.get(key, 0):
                return _fallback_store[key]
            else:
                del _fallback_store[key]
                _fallback_ttl.pop(key, None)
        return None


async def get_json(key: str) -> Optional[Any]:
    """Retrieve and parse a JSON value."""
    raw = await get_value(key)
    if raw:
        return json.loads(raw)
    return None


async def delete_key(key: str) -> None:
    """Delete a key."""
    if _redis_client:
        await _redis_client.delete(key)
    else:
        _fallback_store.pop(key, None)
        _fallback_ttl.pop(key, None)


async def increment(key: str, ttl_seconds: int = 60) -> int:
    """Increment a counter (for rate limiting)."""
    if _redis_client:
        pipe = _redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, ttl_seconds)
        results = await pipe.execute()
        return results[0]
    else:
        current = int(_fallback_store.get(key, 0))
        current += 1
        _fallback_store[key] = str(current)
        _fallback_ttl[key] = time.time() + ttl_seconds
        return current
