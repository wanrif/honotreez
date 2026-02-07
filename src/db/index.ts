import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { getEnv } from '@/env'

const pool = new Pool({
  connectionString: getEnv().DATABASE_URL,
})

const db = drizzle({ client: pool })

export default db
