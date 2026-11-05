import type { Context, Next } from 'hono';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 120; // 120 requests per minute

export async function rateLimiter(c: Context, next: Next) {
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const now = Date.now();

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    record.count++;
    if (record.count > MAX_REQUESTS) {
      c.header('Retry-After', '60');
      return c.json({ error: 'Too many requests. Please slow down.' }, 429);
    }
  }

  await next();
}
