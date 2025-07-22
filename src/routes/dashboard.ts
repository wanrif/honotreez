import { Hono } from 'hono';

const dashboard = new Hono();

dashboard.get('/', (c) => c.json('OK'));

export default dashboard;
