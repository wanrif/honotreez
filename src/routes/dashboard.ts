import { createRouter } from '@/lib/create-app'

const dashboard = createRouter()

dashboard.get('/', (c) => c.json('OK'))

export default dashboard
