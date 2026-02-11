import { hash, verify } from '@node-rs/argon2'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin as adminPlugin } from 'better-auth/plugins'

import { ac, admin, user as userPermissions } from '@/auth/permissions'
import db from '@/db'
import { account, session, user, verification } from '@/db/schema/auth-schema'
import { getEnv } from '@/env'

export const hashPassword = async (password: string) => {
  const hashedPassword = await hash(password, {
    algorithm: 2, // Argon2id
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  })
  return hashedPassword
}

export const verifyPassword = async (
  password: string,
  hashedPassword: string
) => {
  const isValid = await verify(hashedPassword, password, {
    algorithm: 2, // Argon2id
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  })
  return isValid
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg', // or "mysql", "sqlite"
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash(password) {
        return hashPassword(password)
      },
      verify(data) {
        return verifyPassword(data.password, data.hash)
      },
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin,
        user: userPermissions,
      },
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
  ],
  rateLimit: {
    storage: 'database',
    modelName: 'rateLimit',
    window: 60, // time window in seconds
    max: 100, // max requests in the window
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
    freshAge: 60 * 60 * 24, // 1 day (the session is fresh if created within the last 24 hours)
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  trustedOrigins: [
    ...(getEnv().CORS_ORIGIN ? [getEnv().CORS_ORIGIN] : []),
    'http://localhost:3001',
  ],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false, // don't allow user to set role
      },
    },
  },
})

export interface AuthType {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}
