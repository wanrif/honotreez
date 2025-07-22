import db from '@/db';
import { account, session, user, verification } from '@/db/schema/auth-schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Context } from 'hono';
import { admin } from 'better-auth/plugins';

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
  },
  plugins: [admin()],
});

export const authMiddleware = async (c: Context, next: () => Promise<void>) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set('user', null);
    c.set('session', null);
    return next();
  }

  c.set('user', session.user);
  c.set('session', session.session);
  return next();
};
