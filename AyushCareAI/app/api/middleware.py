"""Custom middleware for rate limiting and audit logging."""

from __future__ import annotations

import time
from typing import Callable

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import get_settings
from app.infrastructure import redis_client

logger = structlog.get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Token-bucket rate limiter using Redis counters."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        settings = get_settings()

        # Skip rate limiting for health checks
        if request.url.path in ("/api/v1/health", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        # Rate limit by client IP
        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{client_ip}:{int(time.time()) // 60}"

        try:
            count = await redis_client.increment(key, ttl_seconds=60)
            if count > settings.rate_limit_per_minute:
                logger.warning("rate_limit_exceeded", client_ip=client_ip, count=count)
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "detail": f"Maximum {settings.rate_limit_per_minute} requests per minute.",
                    },
                )
        except Exception:
            # If Redis is down, allow the request
            pass

        response = await call_next(request)
        return response


class AuditMiddleware(BaseHTTPMiddleware):
    """Logs every API request for audit trail."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()

        # Extract session ID from path if present
        session_id = None
        path_parts = request.url.path.strip("/").split("/")
        if "sessions" in path_parts:
            idx = path_parts.index("sessions")
            if idx + 1 < len(path_parts):
                session_id = path_parts[idx + 1]

        response = await call_next(request)

        duration_ms = (time.time() - start_time) * 1000

        logger.info(
            "api_request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(duration_ms, 1),
            session_id=session_id,
            client_ip=request.client.host if request.client else "unknown",
        )

        return response
