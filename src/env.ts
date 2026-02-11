import { createEnv } from '@t3-oss/env-core'
import { Context } from 'hono'
import { env } from 'hono/adapter'
import { z } from 'zod'

export const getEnv = (c?: Context) =>
  createEnv({
    server: {
      SERVER_PORT: z.coerce.number().default(3000),
      CORS_ORIGIN: z.string().default('http://localhost:3001'),
      LOG_LEVEL: z.string().default('info'),
      BETTER_AUTH_SECRET: z.string(),
      BETTER_AUTH_URL: z.url(),
      DATABASE_URL: z.url(),
    },
    runtimeEnv: c ? env(c) : process.env,
    emptyStringAsUndefined: true,
  })
