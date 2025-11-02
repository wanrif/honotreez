import { Hono } from 'hono'
import type { RequestIdVariables } from 'hono/request-id'

import type { AuthType } from './auth'

interface AppVariables extends AuthType {
  requestId: RequestIdVariables
}

export function createRouter() {
  return new Hono<{ Variables: AppVariables }>()
}

export default function createApp() {
  const app = createRouter()

  return app
}
