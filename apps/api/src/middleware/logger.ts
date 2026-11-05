import type { Context, Next } from 'hono';
import { randomUUID } from 'crypto';

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const requestId = randomUUID();
  c.header('x-request-id', requestId);

  await next();

  const ms = Date.now() - start;
  const status = c.res.status;
  const method = c.req.method;
  const path = c.req.path;
  console.log(`[${new Date().toISOString()}] ${method} ${path} - ${status} (${ms}ms) [req:${requestId.slice(0, 8)}]`);
}

