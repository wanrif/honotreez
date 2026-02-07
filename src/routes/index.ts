import { createRoute, z } from '@hono/zod-openapi'

import { createRouter } from '@/lib/create-app'

import dashboard from './dashboard'

const appRouter = createRouter()

const healthcheck = createRoute({
  method: 'get',
  path: '/healthcheck',
  tags: ['Health'],
  summary: 'Health Check',
  description: 'Check the health status of the API',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().openapi({ example: 'OK' }),
          }),
        },
      },
      description: 'Successful health check response',
    },
  },
})

appRouter.openapi(healthcheck, (c) => {
  return c.json({ message: 'OK' })
})

appRouter.route('/dashboard', dashboard)

export default appRouter
