import { createRouter } from '@/lib/create-app'

const dashboard = createRouter()

dashboard.get('/', (c) =>
  c.json({
    message: 'OK',
  })
)

export default dashboard
