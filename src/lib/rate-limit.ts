import type { Context, MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

interface RateLimitStore {
  get: (key: string) => Promise<number | null> | number | null
  set: (key: string, value: number, ttl: number) => Promise<void> | void
  increment: (key: string) => Promise<number> | number
}

interface RateLimitOptions {
  /**
   * Maximum number of requests allowed within the time window
   * @default 100
   */
  limit?: number
  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs?: number
  /**
   * Custom key generator function to identify clients
   * @default Uses IP address
   */
  keyGenerator?: (c: Context) => string
  /**
   * Custom message to return when rate limit is exceeded
   */
  message?: string
  /**
   * Custom handler when rate limit is exceeded
   */
  handler?: (c: Context) => Response | Promise<Response>
  /**
   * Skip rate limiting for certain requests
   */
  skip?: (c: Context) => boolean | Promise<boolean>
  /**
   * Custom store for rate limit data (default is in-memory)
   */
  store?: RateLimitStore
  /**
   * Include rate limit info in response headers
   * @default true
   */
  standardHeaders?: boolean
  /**
   * Include legacy rate limit headers (X-RateLimit-*)
   * @default true
   */
  legacyHeaders?: boolean
}

class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>()

  get(key: string): number | null {
    const data = this.store.get(key)
    if (!data) return null
    if (Date.now() > data.resetTime) {
      this.store.delete(key)
      return null
    }
    return data.count
  }

  set(key: string, value: number, ttl: number): void {
    this.store.set(key, {
      count: value,
      resetTime: Date.now() + ttl,
    })
  }

  increment(key: string): number {
    const data = this.store.get(key)
    if (!data || Date.now() > data.resetTime) {
      return 0
    }
    data.count++
    return data.count
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.store.entries())
    for (const [key, data] of entries) {
      if (now > data.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

const defaultKeyGenerator = (c: Context): string => {
  const forwarded = c.req.header('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : c.req.header('x-real-ip') || 'unknown'
  return `ratelimit:${ip}`
}

/**
 * Create a rate limit middleware for Hono
 *
 * @example
 * ```ts
 * // Basic usage with defaults (100 requests per minute)
 * app.use('*', rateLimit())
 *
 * // Custom configuration
 * app.use('/api/*', rateLimit({
 *   limit: 50,
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   message: 'Too many requests, please try again later'
 * }))
 *
 * // Per-route rate limiting
 * app.post('/login', rateLimit({ limit: 5, windowMs: 60000 }), async (c) => {
 *   // Login handler
 * })
 * ```
 */
export function rateLimit(options: RateLimitOptions = {}): MiddlewareHandler {
  const {
    limit = 100,
    windowMs = 60000, // 1 minute
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later.',
    handler,
    skip,
    store = new MemoryStore(),
    standardHeaders = true,
    legacyHeaders = false,
  } = options

  // Cleanup memory store periodically (every 5 minutes)
  if (store instanceof MemoryStore) {
    setInterval(() => store.cleanup(), 5 * 60 * 1000)
  }

  return async (c, next) => {
    // Skip rate limiting if skip function returns true
    if (skip && (await skip(c))) {
      return next()
    }

    const key = keyGenerator(c)
    const currentCount = (await store.get(key)) || 0
    const resetTime = Date.now() + windowMs

    if (currentCount === 0) {
      await store.set(key, 1, windowMs)
    } else {
      await store.increment(key)
    }

    const remaining = Math.max(
      0,
      limit - (currentCount === 0 ? 1 : currentCount + 1)
    )
    const isLimitExceeded = currentCount >= limit

    // Set rate limit headers
    if (standardHeaders) {
      c.header('RateLimit-Limit', limit.toString())
      c.header('RateLimit-Remaining', remaining.toString())
      c.header('RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
    }

    if (legacyHeaders) {
      c.header('X-RateLimit-Limit', limit.toString())
      c.header('X-RateLimit-Remaining', remaining.toString())
      c.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
    }

    // Handle rate limit exceeded
    if (isLimitExceeded) {
      c.header('Retry-After', Math.ceil(windowMs / 1000).toString())

      if (handler) {
        return handler(c)
      }

      throw new HTTPException(429, {
        message,
        cause: {
          limit,
          remaining: 0,
          reset: Math.ceil(resetTime / 1000),
        },
      })
    }

    await next()
  }
}

/**
 * Preset configurations for common rate limiting scenarios
 */
export const rateLimitPresets = {
  /**
   * Strict rate limit for sensitive endpoints like login
   * 5 requests per 15 minutes
   */
  strict: (): MiddlewareHandler =>
    rateLimit({
      limit: 5,
      windowMs: 15 * 60 * 1000,
      message: 'Too many attempts, please try again after 15 minutes.',
    }),

  /**
   * Moderate rate limit for API endpoints
   * 50 requests per 15 minutes
   */
  moderate: (): MiddlewareHandler =>
    rateLimit({
      limit: 50,
      windowMs: 15 * 60 * 1000,
    }),

  /**
   * Generous rate limit for general endpoints
   * 100 requests per minute
   */
  generous: (): MiddlewareHandler =>
    rateLimit({
      limit: 100,
      windowMs: 60 * 1000,
    }),

  /**
   * Very generous rate limit for public endpoints
   * 1000 requests per hour
   */
  public: (): MiddlewareHandler =>
    rateLimit({
      limit: 1000,
      windowMs: 60 * 60 * 1000,
    }),
}

/**
 * Create a rate limiter that uses user ID instead of IP
 * Useful for authenticated endpoints
 */
export function createUserRateLimit(
  options: Omit<RateLimitOptions, 'keyGenerator'> = {}
): MiddlewareHandler {
  return rateLimit({
    ...options,
    keyGenerator: (c) => {
      const user = c.get('user')
      if (user && typeof user === 'object' && 'id' in user) {
        return `ratelimit:user:${user.id}`
      }
      return defaultKeyGenerator(c)
    },
  })
}

/**
 * Create a rate limiter for specific routes
 */
export function createRouteRateLimit(
  route: string,
  options: RateLimitOptions = {}
): MiddlewareHandler {
  return rateLimit({
    ...options,
    keyGenerator: (c) => {
      const baseKey = options.keyGenerator?.(c) || defaultKeyGenerator(c)
      return `${baseKey}:${route}`
    },
  })
}
