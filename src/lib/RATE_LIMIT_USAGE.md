# Rate Limit Middleware Usage Guide

This guide explains how to use the rate limit middleware in your Hono application.

## Basic Usage

### Global Rate Limiting

Apply rate limiting to all routes:

```typescript
import { rateLimit } from './lib/rate-limit'

// Default: 100 requests per minute
app.use('*', rateLimit())
```

### Custom Configuration

```typescript
app.use(
  '/api/*',
  rateLimit({
    limit: 50, // Max 50 requests
    windowMs: 15 * 60 * 1000, // Per 15 minutes
    message: 'Too many requests, please try again later',
  })
)
```

## Presets

Use predefined configurations for common scenarios:

```typescript
import { rateLimitPresets } from './lib/rate-limit'

// Strict: 5 requests per 15 minutes (for login, signup, etc.)
app.post('/api/auth/login', rateLimitPresets.strict(), async (c) => {
  // Login handler
})

// Moderate: 50 requests per 15 minutes (for API endpoints)
app.use('/api/*', rateLimitPresets.moderate())

// Generous: 100 requests per minute (for general endpoints)
app.use('/api/public/*', rateLimitPresets.generous())

// Public: 1000 requests per hour (for very public endpoints)
app.use('/api/health', rateLimitPresets.public())
```

## User-Based Rate Limiting

Rate limit based on authenticated user ID instead of IP:

```typescript
import { createUserRateLimit } from './lib/rate-limit'

// Rate limit by user ID (requires authentication middleware first)
app.use(
  '/api/user/*',
  createUserRateLimit({
    limit: 100,
    windowMs: 60 * 1000,
  })
)
```

## Route-Specific Rate Limiting

Apply different rate limits to specific routes:

```typescript
import { createRouteRateLimit } from './lib/rate-limit'

// Different limits for different routes
app.post(
  '/api/auth/login',
  createRouteRateLimit('/api/auth/login', {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  })
)

app.post(
  '/api/auth/signup',
  createRouteRateLimit('/api/auth/signup', {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  })
)
```

## Advanced Options

### Custom Key Generator

Create custom logic for identifying clients:

```typescript
app.use(
  '/api/*',
  rateLimit({
    keyGenerator: (c) => {
      // Use API key from header
      const apiKey = c.req.header('x-api-key')
      return `ratelimit:apikey:${apiKey || 'anonymous'}`
    },
  })
)
```

### Skip Function

Skip rate limiting for certain requests:

```typescript
app.use(
  '/api/*',
  rateLimit({
    skip: async (c) => {
      // Skip rate limiting for admin users
      const user = c.get('user')
      return user?.role === 'admin'
    },
  })
)
```

### Custom Handler

Handle rate limit exceeded with custom logic:

```typescript
app.use(
  '/api/*',
  rateLimit({
    handler: async (c) => {
      return c.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'Please upgrade to premium for higher limits',
        },
        429
      )
    },
  })
)
```

### Disable Headers

Control which headers are sent:

```typescript
app.use(
  '/api/*',
  rateLimit({
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false, // X-RateLimit-* headers
  })
)
```

## Response Headers

When rate limiting is active, the following headers are included:

- `RateLimit-Limit`: Maximum number of requests allowed
- `RateLimit-Remaining`: Number of requests remaining
- `RateLimit-Reset`: Unix timestamp when the limit resets
- `X-RateLimit-Limit`: (Legacy) Same as RateLimit-Limit
- `X-RateLimit-Remaining`: (Legacy) Same as RateLimit-Remaining
- `X-RateLimit-Reset`: (Legacy) Same as RateLimit-Reset
- `Retry-After`: (When exceeded) Seconds until the limit resets

## Complete Example

```typescript
import { Hono } from 'hono'

import {
  createUserRateLimit,
  rateLimit,
  rateLimitPresets,
} from './lib/rate-limit'

const app = new Hono()

// Global rate limit: 100 requests per minute
app.use('*', rateLimit())

// Strict rate limit for authentication endpoints
app.post('/api/auth/login', rateLimitPresets.strict(), async (c) => {
  return c.json({ message: 'Login endpoint' })
})

app.post('/api/auth/signup', rateLimitPresets.strict(), async (c) => {
  return c.json({ message: 'Signup endpoint' })
})

// User-based rate limiting for authenticated routes
app.use(
  '/api/user/*',
  createUserRateLimit({
    limit: 50,
    windowMs: 15 * 60 * 1000,
  })
)

// Public endpoints with generous limits
app.get('/api/public/*', rateLimitPresets.public(), async (c) => {
  return c.json({ message: 'Public data' })
})

export default app
```

## Error Response

When rate limit is exceeded, the API returns:

```json
{
  "message": "Too many requests, please try again later.",
  "error": {
    "limit": 100,
    "remaining": 0,
    "reset": 1699999999
  }
}
```

Status code: `429 Too Many Requests`

## Custom Store (Optional)

For production environments with multiple server instances, implement a custom store using Redis:

```typescript
import { Redis } from '@upstash/redis'

class RedisStore implements RateLimitStore {
  private redis: Redis

  constructor(redis: Redis) {
    this.redis = redis
  }

  async get(key: string): Promise<number | null> {
    const value = await this.redis.get(key)
    return value ? Number(value) : null
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    await this.redis.set(key, value, { px: ttl })
  }

  async increment(key: string): Promise<number> {
    return await this.redis.incr(key)
  }
}

// Use Redis store
const redis = new Redis({ url: process.env.REDIS_URL })
app.use(
  '*',
  rateLimit({
    store: new RedisStore(redis),
  })
)
```

## Best Practices

1. **Layer your rate limits**: Use stricter limits for sensitive endpoints and more generous limits for public endpoints
2. **Consider authenticated vs anonymous**: Use user-based rate limiting for authenticated users
3. **Monitor and adjust**: Start with conservative limits and adjust based on actual usage
4. **Use appropriate time windows**: Shorter windows for sensitive operations, longer for general API usage
5. **Implement custom stores for production**: Use Redis or similar for distributed environments
6. **Provide clear error messages**: Help users understand why they're being limited
7. **Add logging**: Track rate limit violations for security monitoring
