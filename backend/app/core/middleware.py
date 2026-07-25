import time
import uuid
import logging
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.config import settings
from app.core.redis import get_redis_client

logger = logging.getLogger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Middleware to append unique X-Request-Id header to requests and responses."""
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


class TimingMiddleware(BaseHTTPMiddleware):
    """Middleware to measure execution time of requests."""
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = (time.perf_counter() - start_time) * 1000
        
        response.headers["X-Response-Time"] = f"{process_time:.2f}ms"
        
        # Log slow requests
        if process_time > 500:
            request_id = getattr(request.state, "request_id", "unknown")
            logger.warning(
                f"Slow Request: {request.method} {request.url.path} took {process_time:.2f}ms [Request ID: {request_id}]"
            )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiting using Redis sorted sets."""
    async def dispatch(self, request: Request, call_next) -> Response:
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Retrieve client IP as rate limit key identifier
        ip = request.client.host if request.client else "unknown"
        path = request.url.path
        
        # Exempt health checks
        if path.startswith("/api/health"):
            return await call_next(request)

        # Default rules
        limit, window, group = 120, 60, "default"

        # Match endpoints to rate limit rules
        if path.startswith("/api/auth/register"):
            limit, window, group = 5, 60, "register"
        elif path.startswith("/api/auth/login"):
            limit, window, group = 10, 60, "login"
        elif path.startswith("/api/regime/detect") or path.startswith("/api/liquidity/analyze"):
            limit, window, group = 10, 60, "ml_compute"
        elif path.startswith("/api/options/price") or path.startswith("/api/sentiment/score"):
            limit, window, group = 30, 60, "heavy_read"

        key = f"rate:{ip}:{group}"
        now = time.time()
        cutoff = now - window

        try:
            redis = get_redis_client()
            
            # Pipeline executions for atomic sliding window evaluation
            pipe = redis.pipeline()
            pipe.zremrangebyscore(key, 0, cutoff)
            pipe.zcard(key)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, window)
            results = await pipe.execute()
            
            # Index 1 corresponds to zcard output before current request insert
            current_requests = results[1]

            if current_requests >= limit:
                retry_after = int(window - (now - cutoff))
                request_id = getattr(request.state, "request_id", "unknown")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": {
                            "code": "RATE_LIMITED",
                            "message": "Too many requests. Please try again later.",
                        }
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-Request-Id": request_id
                    }
                )
        except Exception as e:
            # Fallback gracefully if Redis fails to verify limits
            logger.error(f"Rate limiting failure (allowing request): {e}")

        return await call_next(request)
