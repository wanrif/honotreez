import { createRoute, z } from '@hono/zod-openapi'

import { authGuard } from '@/auth/auth-guard'
import { createRouter } from '@/lib/create-app'

const dashboard = createRouter()

const dashboardRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Dashboard'],
  summary: 'Get Dashboard Data',
  description: 'Retrieve data for the dashboard',
  middleware: [authGuard()],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({ example: 'OK' }),
          }),
        },
      },
      description: 'Successful dashboard data response',
    },
  },
})

dashboard.openapi(dashboardRoute, (c) =>
  c.json({
    message: 'OK',
  })
)

export default dashboard
