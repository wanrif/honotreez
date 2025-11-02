import { createRouter } from '@/lib/create-app'

import dashboard from './dashboard'

const appRouter = createRouter()

appRouter.get('/healthcheck', (c) =>
  c.json({
    message: 'OK',
  })
)
appRouter.route('/dashboard', dashboard)

export default appRouter
