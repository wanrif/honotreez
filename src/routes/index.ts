import { Hono } from 'hono';
import dashboard from './dashboard';

const appRouter = new Hono();

appRouter.get('/healthcheck', (c) => c.json('OK'));
appRouter.route('/dashboard', dashboard);

type AppRouter = typeof appRouter;
export { appRouter, AppRouter };
