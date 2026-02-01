# Custom Logger Documentation

## Overview

This custom logger provides comprehensive logging capabilities for the Hono application, including:

- **Colored console output** for better readability
- **Request/Response logging** with timing information
- **Error tracking** with stack traces
- **Performance monitoring** (slow request detection)
- **Sensitive data redaction** in request bodies
- **Debug mode** for detailed logging

## Features

### 1. HTTP Request/Response Logging

The logger automatically captures:

- HTTP method and path
- Request ID (first 8 characters)
- Response status code
- Response time in milliseconds
- Response size (when available)
- Query parameters
- Request/Response headers (in debug mode)

### 2. Color-Coded Output

- **Green**: Successful responses (2xx)
- **Cyan**: Redirects (3xx)
- **Yellow**: Client errors (4xx)
- **Red**: Server errors (5xx)
- **Methods**: Color-coded by type (GET=green, POST=cyan, DELETE=red, etc.)

### 3. Performance Monitoring

- Automatically warns about slow requests (>1000ms)
- Displays response time for every request

### 4. Error Logging

- Captures and logs all errors with full stack traces
- Logs unhandled errors with context (method, path, requestId)

### 5. Sensitive Data Protection

The `requestBodyLogger` middleware automatically redacts sensitive fields:

- password
- token
- secret
- apiKey
- creditCard

## Usage

### Basic Setup (Already Configured)

The logger is already integrated in `src/index.ts`:

```typescript
import { errorLogger, honoLogger } from './lib/logger'

const app = createApp()

// Logger middleware - must be first to catch all requests
app.use('*', honoLogger())
app.use('*', errorLogger())
```

### Using the Logger Directly

Import the logger instance for custom logging:

```typescript
import { logger } from './lib/logger'

// Info level
logger.info('User logged in', { userId: '123', email: 'user@example.com' })

// Warning level
logger.warn('Rate limit approaching', { attempts: 95, limit: 100 })

// Error level
logger.error('Database connection failed', {
  error: error.message,
  retries: 3,
})

// Debug level (only shows when LOG_LEVEL=debug)
logger.debug('Processing payment', { amount: 100, currency: 'USD' })
```

### Request Body Logging (Optional)

To enable request body logging with sensitive data redaction:

```typescript
import { requestBodyLogger } from './lib/logger'

// Add after honoLogger and errorLogger
app.use('*', requestBodyLogger())
```

**Note**: Use with caution as it may impact performance and log large payloads.

## Environment Variables

### `LOG_LEVEL`

Set to `debug` to enable verbose logging:

```bash
LOG_LEVEL=debug
```

This will:

- Show all debug-level logs
- Display request headers
- Display response headers
- Show query parameters

## Output Examples

### Successful Request

```
[2025-11-01 23:07:23.630] [TRX-P4TpUAPizpmgkUch3Jpnw] [INCOMING] GET /api/users
[2025-11-01 23:07:23.630] [TRX-P4TpUAPizpmgkUch3Jpnw] [COMPLETED] GET /api/users 200 33ms 1.2 KB
```

### Error Request

```
[2025-11-01 23:07:54.444] [TRX-giFrWMzdYxcaT8bcwRW77] [INCOMING] POST /api/users
[2025-11-01 23:07:54.445] [TRX-giFrWMzdYxcaT8bcwRW77] [ERROR] Database connection timeout
Error: Connection timeout after 5000ms
    at Database.connect (db/index.ts:45:12)
    ...
[2025-11-01 23:07:54.790] [TRX-giFrWMzdYxcaT8bcwRW77] [ERROR] POST /api/users 500 334ms
```

### Slow Request Warning

```
[2025-11-01 23:08:29.934] [TRX-giFrWMzdYxcaT8bcwRW77] [INCOMING] POST /api/users
[2025-11-01 23:08:29.935] [WARN] Slow request detected: GET /api/reports took 2333ms
[2025-11-01 23:08:57.464] [TRX-Cy1Y2BT1mEib3e1Hd3tP2] [COMPLETED] GET /api/reports 200 2334ms 45.6 KB
```

### Debug Mode Output

```bash
LOG_LEVEL=debug bun dev
```

```
[2025-11-01 23:08:57.465] [TRX-Lh46N2d7fhmVJBNQCbm28] [INCOMING] POST /api/auth/login?redirect=/dashboard
[2025-11-01 23:08:57.790] [DEBUG] Query Parameters
{
  "redirect": "/dashboard"
}
[2025-11-01 23:08:57.791] [DEBUG] Request Headers
{
  "content-type": "application/json",
  "user-agent": "Mozilla/5.0...",
  "accept": "application/json"
}
[2025-11-01 23:08:57.792] [TRX-Lh46N2d7fhmVJBNQCbm28] Request Body
{
  "email": "user@example.com",
  "password": "***REDACTED***"
}
[2025-11-01 23:08:57.892] [DEBUG] Response Headers
{
  "content-type": "application/json",
  "set-cookie": "session=..."
}
[2025-11-01 23:08:57.893] [TRX-Lh46N2d7fhmVJBNQCbm28] [COMPLETED] POST /api/auth/login 200 104ms
```

## Best Practices

1. **Use appropriate log levels**:
   - `info`: General application flow
   - `warn`: Potentially harmful situations
   - `error`: Error events that might still allow the app to continue
   - `debug`: Detailed diagnostic information

2. **Include context**: Always provide relevant context in log data objects

3. **Avoid logging sensitive data**: The logger automatically redacts common sensitive fields, but be mindful of custom sensitive data

4. **Monitor performance**: Check logs regularly for slow request warnings

5. **Use debug mode sparingly**: Enable only when troubleshooting, as it can be verbose

## Customization

### Adding More Sensitive Fields

Edit `src/lib/logger.ts` and update the `sensitiveFields` array:

```typescript
const sensitiveFields = [
  'password',
  'token',
  'secret',
  'apiKey',
  'creditCard',
  'ssn', // Add custom fields
  'phoneNumber', // Add custom fields
]
```

### Adjusting Slow Request Threshold

Change the threshold in `src/lib/logger.ts`:

```typescript
// Log slow requests (> 2000ms instead of 1000ms)
if (duration > 2000) {
  logger.warn(`Slow request detected: ${method} ${path} took ${duration}ms`)
}
```

### Disabling Colors

When initializing the logger:

```typescript
export const logger = new Logger({ colors: false })
```

## Troubleshooting

### Colors not showing in terminal

Ensure your terminal supports ANSI color codes. Most modern terminals do.

### Too much output

1. Remove `requestBodyLogger()` middleware if enabled
2. Don't set `LOG_LEVEL=debug` in production
3. Consider filtering specific routes if needed

### Missing logs

Ensure the logger middleware is registered before other middleware:

```typescript
// ✓ Correct order
app.use('*', honoLogger())
app.use('*', errorLogger())
app.use('/api/*', cors(...))

// ✗ Incorrect order
app.use('/api/*', cors(...))
app.use('*', honoLogger())  // Will miss some requests
```
