import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { requestId } from 'hono/request-id';
import { csrf } from 'hono/csrf';
import { logger } from 'hono/logger';
import { auth, authMiddleware } from './lib/auth';
import { appRouter } from './routes';

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use(
  '/*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(csrf());
app.use(logger());
app.use(prettyJSON());
app.use('/*', requestId());

const PREFIX = '/api';

app.use('*', async (c, next) => {
  await authMiddleware(c, next);
});

app.on(['POST', 'GET'], `${PREFIX}/auth/**`, (c) => auth.handler(c.req.raw));

app.route(`${PREFIX}`, appRouter);

app.notFound((c) => {
  return c.json({ message: 'Not Found' }, 404);
});

export default {
  port: 3000,
  fetch: app.fetch,
};
