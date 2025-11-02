import dayjs from 'dayjs'
import type { Context, MiddlewareHandler } from 'hono'
import { customAlphabet } from 'nanoid'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogOptions {
  timestamp?: boolean
  colors?: boolean
  requestId?: boolean
}

class Logger {
  private options: Required<LogOptions>

  constructor(options: LogOptions = {}) {
    this.options = {
      timestamp: options.timestamp ?? true,
      colors: options.colors ?? true,
      requestId: options.requestId ?? true,
    }
  }

  private colorize(text: string, color: keyof typeof colors): string {
    if (!this.options.colors) return text
    return `${colors[color]}${text}${colors.reset}`
  }

  private getTimestamp(): string {
    if (!this.options.timestamp) return ''
    return this.colorize(
      `[${dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')}]`,
      'gray'
    )
  }

  private formatLogLevel(level: LogLevel): string {
    const levelColors: Record<LogLevel, keyof typeof colors> = {
      info: 'blue',
      warn: 'yellow',
      error: 'red',
      debug: 'magenta',
    }
    return this.colorize(`[${level.toUpperCase()}]`, levelColors[level])
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const parts = [this.getTimestamp(), this.formatLogLevel(level), message]

    console.log(parts.filter(Boolean).join(' '))

    if (data !== undefined) {
      if (typeof data === 'object') {
        console.log(JSON.stringify(data, null, 2))
      } else {
        console.log(data)
      }
    }
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data)
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data)
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data)
  }
}

// Create singleton instance
export const logger = new Logger()

// HTTP status code color helper
function getStatusColor(status: number): keyof typeof colors {
  if (status >= 500) return 'red'
  if (status >= 400) return 'yellow'
  if (status >= 300) return 'cyan'
  if (status >= 200) return 'green'
  return 'white'
}

// HTTP method color helper
function getMethodColor(method: string): keyof typeof colors {
  const methodColors: Record<string, keyof typeof colors> = {
    GET: 'green',
    POST: 'cyan',
    PUT: 'yellow',
    DELETE: 'red',
    PATCH: 'magenta',
    HEAD: 'gray',
    OPTIONS: 'blue',
  }
  return methodColors[method] || 'white'
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Custom Hono logger middleware
export function honoLogger(): MiddlewareHandler {
  return async (c: Context, next) => {
    const start = Date.now()
    const method = c.req.method
    const path = c.req.path
    const customId = customAlphabet(
      '12346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz'
    )
    const requestId = `LOGX-${customId()}`

    // Store request ID in context
    c.set('requestId', requestId)

    // Log incoming request
    const methodColored = `${colors[getMethodColor(method)]}${colors.bright}${method}${colors.reset}`
    const pathColored = `${colors.cyan}${path}${colors.reset}`
    const requestIdColored = `${colors.gray}[${requestId}]${colors.reset}`

    console.log(
      `${colors.gray}[${dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')}]${colors.reset} ${requestIdColored} ${colors.blue}[INCOMING]${colors.reset} ${methodColored} ${pathColored}`
    )

    // Log query parameters if present
    const url = new URL(c.req.url)
    if (url.search) {
      const params = Object.fromEntries(url.searchParams)
      logger.debug('Query Parameters', params)
    }

    // Log request headers (optional - can be verbose)
    if (process.env.LOG_LEVEL === 'debug') {
      const headers = Object.fromEntries(
        Array.from(c.req.raw.headers.entries()).filter(
          ([key]) => !['authorization', 'cookie'].includes(key.toLowerCase())
        )
      )
      logger.debug('Request Headers', headers)
    }

    let error: Error | undefined

    try {
      await next()

      c.header('X-Request-ID', requestId)
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err))
      // Log error details
      const errorColored = `${colors.red}${colors.bright}[ERROR]${colors.reset}`
      console.error(
        `${colors.gray}[${dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')}]${colors.reset} ${requestIdColored} ${errorColored} ${error.message}`
      )
      console.error(error.stack)
      throw err
    } finally {
      const end = Date.now()
      const duration = end - start
      const status = c.res.status

      // Format response log
      const statusColored = `${colors[getStatusColor(status)]}${colors.bright}${status}${colors.reset}`
      const durationColored = `${colors.gray}${duration}ms${colors.reset}`
      const statusType = error
        ? `${colors.red}[ERROR]${colors.reset}`
        : `${colors.green}[COMPLETED]${colors.reset}`

      // Get response size if available
      const contentLength = c.res.headers.get('content-length')
      const sizeInfo = contentLength
        ? ` ${colors.gray}${formatBytes(parseInt(contentLength))}${colors.reset}`
        : ''

      console.log(
        `${colors.gray}[${dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')}]${colors.reset} ${requestIdColored} ${statusType} ${methodColored} ${pathColored} ${statusColored} ${durationColored}${sizeInfo}`
      )

      // Log slow requests (> 1000ms)
      if (duration > 1000) {
        logger.warn(
          `Slow request detected: ${method} ${path} took ${duration}ms`
        )
      }

      // Log response headers in debug mode
      if (process.env.LOG_LEVEL === 'debug' && !error) {
        const responseHeaders = Object.fromEntries(c.res.headers.entries())
        logger.debug('Response Headers', responseHeaders)
      }
    }
  }
}

// Error logger middleware
export function errorLogger(): MiddlewareHandler {
  return async (c: Context, next) => {
    try {
      await next()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      const requestId = c.get('requestId') || 'unknown'

      logger.error('Unhandled error in request', {
        requestId,
        method: c.req.method,
        path: c.req.path,
        error: error.message,
        stack: error.stack,
        timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
      })

      throw err
    }
  }
}

// Request body logger (use with caution - may log sensitive data)
export function requestBodyLogger(): MiddlewareHandler {
  return async (c: Context, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      try {
        const contentType = c.req.header('content-type')
        if (contentType?.includes('application/json')) {
          const body = await c.req.json()
          const requestId = c.get('requestId') || 'unknown'

          // Sanitize sensitive fields
          const sanitizedBody = JSON.parse(JSON.stringify(body))
          const sensitiveFields = [
            'password',
            'token',
            'secret',
            'apiKey',
            'creditCard',
          ]

          const sanitize = (obj: Record<string, unknown>) => {
            for (const key in obj) {
              if (
                sensitiveFields.some((field) =>
                  key.toLowerCase().includes(field.toLowerCase())
                )
              ) {
                obj[key] = '***REDACTED***'
              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key] as Record<string, unknown>)
              }
            }
          }

          sanitize(sanitizedBody)

          logger.debug(`[${requestId}] Request Body`, sanitizedBody)

          // Restore body for next middleware
          c.req.bodyCache.json = body
        }
      } catch {
        // Silently fail if body parsing fails
      }
    }
    await next()
  }
}

export default logger
