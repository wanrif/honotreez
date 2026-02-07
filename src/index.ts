import { Scalar } from '@scalar/hono-api-reference'
import 'dotenv/config'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { prettyJSON } from 'hono/pretty-json'

import { authMiddleware } from './auth/auth-guard'
import { getEnv } from './env'
import createApp from './lib/create-app'
import { combinedLogger } from './lib/logger'
import { rateLimit } from './lib/rate-limit'
import appRouter from './routes'
import authRouter from './routes/auth'

const app = createApp()

app.use('*', combinedLogger())

// Global rate limiting: 100 requests per minute
app.use('*', rateLimit())

app.use(
  '/*',
  cors({
    origin: (_origin, c) => {
      return getEnv(c).CORS_ORIGIN || 'http://localhost:3001'
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
)
app.use(prettyJSON())

app.use('*', async (c, next) => {
  try {
    await authMiddleware(c, next)
  } catch (err) {
    c.status(500)
    return c.json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err),
    })
  }
})

const routes = [authRouter, appRouter] as const

routes.forEach((route) => {
  app.route('/api', route)
})

app.doc('/api/docs', (c) => ({
  openapi: '3.1.0',
  info: {
    title: 'Honotreez API',
    version: '1.0.0',
    description: 'API documentation for Honotreez',
  },
  servers: [
    {
      url: new URL(c.req.url).origin,
      description: 'Current server',
    },
  ],
}))

// Scalar API Reference
app.get(
  '/api/reference',
  Scalar({
    pageTitle: 'Honotreez API Reference',
    theme: 'purple',
    sources: [
      {
        url: '/api/docs',
        title: 'Honotreez API',
      },
      {
        url: '/api/auth/open-api/generate-schema',
        title: 'Honotreez Auth API',
      },
    ],
  })
)

app.notFound((c) => {
  return c.json({ message: 'Route Not Found' }, 404)
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        message: err.message,
        error: err.cause || undefined,
      },
      err.status
    )
  }

  c.status(500)
  return c.json({
    error: 'Internal server error',
    details: err instanceof Error ? err.message : err,
  })
})

export default {
  port: 3000,
  fetch: app.fetch,
}
