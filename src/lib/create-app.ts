import { OpenAPIHono } from '@hono/zod-openapi'
import type { RequestIdVariables } from 'hono/request-id'

import type { AuthType } from './auth'

interface AppVariables extends AuthType {
  requestId: RequestIdVariables
}

export type AppOpenApi = OpenAPIHono<{ Variables: AppVariables }>

export function createRouter() {
  return new OpenAPIHono<{ Variables: AppVariables }>()
}

export default function createApp() {
  const app = createRouter()

  return app
}
