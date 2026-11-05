import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { config } from './config.js';
import { db, type UserAccount } from './db/store.js';
import { wsManager } from './ws/server.js';

const app = new Hono();

// Global middleware
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (origin) return origin;
      return 'http://localhost:5173';
    },
    allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);

// Auth helper
function getAuthenticatedUser(c: any): UserAccount | null {
  const authHeader = c.req.header('Authorization');
  const userIdHeader = c.req.header('x-user-id');

  let userId: string | null = null;
  if (userIdHeader) {
    userId = userIdHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.substring(7);
  }

  if (!userId) {
    // Default to admin for initial local load if not set
    return db.users[0];
  }

  return db.getUserById(userId) || null;
}

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'webbarracks-api',
    timestamp: new Date().toISOString()
  });
});

const api = new Hono();

// ==================== AUTHENTICATION ====================
api.post('/auth/login', async (c) => {
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    try {
      body = await c.req.parseBody();
    } catch {
      body = {};
    }
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = (body.password || '').trim();

  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user || user.passwordHash !== password) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  if (!user.is_active) {
    return c.json({ error: 'This user account is currently deactivated. Contact your administrator.' }, 403);
  }

  user.last_login_at = new Date().toISOString();
  db.addAuditLog('ADMIN.LOGIN', user.email, `Successful login from ${user.role}`);

  return c.json({
    token: user.id,
    user
  });
});

api.get('/auth/me', (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ user });
});

api.post('/auth/logout', (c) => {
  const user = getAuthenticatedUser(c);
  if (user) {
    db.addAuditLog('AUTH.LOGOUT', user.email, 'User logged out');
  }
  return c.json({ success: true });
});

// ==================== USER MANAGEMENT (ADMIN ONLY) ====================
api.get('/users', (c) => {
  const currentUser = getAuthenticatedUser(c);
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Forbidden: Administrator privileges required.' }, 403);
  }
  return c.json(db.users);
});

api.post('/users', async (c) => {
  const currentUser = getAuthenticatedUser(c);
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Forbidden: Administrator privileges required.' }, 403);
  }

  try {
    const body = await c.req.json();
    const result = db.createUser(body);
    return c.json(result, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

api.put('/users/:id', async (c) => {
  const currentUser = getAuthenticatedUser(c);
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Forbidden: Administrator privileges required.' }, 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json();

  try {
    const updated = db.updateUser(id, body);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

api.delete('/users/:id', (c) => {
  const currentUser = getAuthenticatedUser(c);
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Forbidden: Administrator privileges required.' }, 403);
  }

  const id = c.req.param('id');
  try {
    db.deleteUser(id);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

api.post('/users/:id/reset-password', (c) => {
  const currentUser = getAuthenticatedUser(c);
  if (!currentUser || currentUser.role !== 'admin') {
    return c.json({ error: 'Forbidden: Administrator privileges required.' }, 403);
  }

  const id = c.req.param('id');
  try {
    const newPassword = db.resetPassword(id);
    return c.json({ newPassword });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// ==================== TRACKING SESSIONS ====================
api.get('/tracking/active', (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json({ active: null });

  const session = db.getActiveSession(user.id);
  if (!session) return c.json({ active: null });

  const now = Date.now();
  const segmentElapsed = session.status === 'active' ? Math.floor((now - new Date(session.started_at).getTime()) / 1000) : 0;
  const totalSeconds = session.duration_seconds + segmentElapsed;

  return c.json({
    active: {
      ...session,
      elapsed_seconds: Math.max(0, totalSeconds)
    }
  });
});

api.post('/tracking/start', async (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  if (!user.tracking_permissions.can_track) {
    return c.json({ error: 'You are not authorized to track time. Contact your administrator.' }, 403);
  }

  const body = await c.req.json();
  const { targetName, category } = body;

  const session = db.startSession(user.id, targetName || 'General Project Task', category || 'Client Deliverable');
  return c.json(session, 201);
});

api.post('/tracking/pause', (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const paused = db.pauseSession(user.id);
  if (!paused) return c.json({ error: 'No active session to pause' }, 400);
  return c.json(paused);
});

api.post('/tracking/resume', (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const resumed = db.resumeSession(user.id);
  if (!resumed) return c.json({ error: 'No paused session to resume' }, 400);
  return c.json(resumed);
});

api.post('/tracking/stop', (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const stopped = db.stopSession(user.id);
  if (!stopped) return c.json({ error: 'No running session' }, 400);
  return c.json(stopped);
});

api.get('/tracking/history', (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json([]);

  const userIdParam = c.req.query('userId');
  if (user.role === 'admin' && userIdParam) {
    return c.json(db.trackingSessions.filter((s) => s.user_id === userIdParam));
  } else if (user.role === 'admin') {
    return c.json(db.trackingSessions);
  }

  return c.json(db.trackingSessions.filter((s) => s.user_id === user.id));
});

api.get('/tracking/live-telemetry', (c) => {
  const now = Date.now();
  const activeList = db.trackingSessions
    .filter((s) => s.status === 'active' || s.status === 'paused')
    .map((s) => {
      const u = db.getUserById(s.user_id);
      const segment = s.status === 'active' ? Math.floor((now - new Date(s.started_at).getTime()) / 1000) : 0;
      const totalSec = s.duration_seconds + segment;

      return {
        sessionId: s.id,
        userId: s.user_id,
        userName: u?.full_name || 'User',
        userEmail: u?.email,
        targetName: s.target_name,
        targetCategory: s.target_category,
        startedAt: s.started_at,
        status: s.status,
        elapsedSeconds: Math.max(0, totalSec)
      };
    });

  return c.json(activeList);
});

// ==================== SCREENSHOTS ====================
api.post('/tracking/screenshots', async (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const session = db.getActiveSession(user.id);

  const record = db.addScreenshot({
    session_id: session?.id || 'manual',
    user_id: user.id,
    user_name: user.full_name,
    target_name: session?.target_name || body.target_name || 'Active Session',
    taken_at: new Date().toISOString(),
    storage_path: body.image_base64 || 'screenshots/captured.webp',
    activity_percent: body.activity_percent || 90,
    app_name: body.app_name || 'Desktop Workspace',
    window_title: body.window_title || 'Active Window'
  });

  return c.json(record, 201);
});

api.get('/tracking/screenshots', (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json([]);

  if (user.role === 'admin') {
    return c.json(db.screenshots);
  }

  // Regular users see only their own authorized session screenshots
  return c.json(db.screenshots.filter((s) => s.user_id === user.id));
});

api.delete('/tracking/screenshots/:id', (c) => {
  const user = getAuthenticatedUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const shot = db.screenshots.find((s) => s.id === id);
  if (!shot) return c.json({ error: 'Screenshot not found' }, 404);

  if (user.role !== 'admin' && shot.user_id !== user.id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  db.deleteScreenshot(id);
  return c.json({ success: true });
});

// ==================== AUDIT LOGS & CATALOG & STATS ====================
api.get('/audit-logs', (c) => {
  const user = getAuthenticatedUser(c);
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  return c.json(db.auditLogs);
});

api.get('/catalog', (c) => {
  return c.json(db.catalog);
});

api.post('/catalog', async (c) => {
  const user = getAuthenticatedUser(c);
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const body = await c.req.json();
  const item = {
    id: 'cat-' + (db.catalog.length + 1),
    title: body.title || 'New Package',
    version: body.version || 'v1.0.0',
    status: 'PUBLISHED',
    price_range: body.price_range || '$0 - $0'
  };
  db.catalog.unshift(item);
  db.addAuditLog('PRODUCTS.UPDATE', user.email, `Created product ${item.title}`);
  return c.json(item, 201);
});

api.get('/dashboard/stats', (c) => {
  const activeSessionsCount = db.trackingSessions.filter((s) => s.status === 'active').length;
  const activeUsersCount = db.users.filter((u) => u.is_active).length;
  const adminUsersCount = db.users.filter((u) => u.role === 'admin').length;

  return c.json({
    activeCatalogProducts: db.catalog.length,
    dynamicPages: 16,
    activeAdministrators: adminUsersCount,
    totalAuditRecords: db.auditLogs.length + 159,
    totalRegisteredUsers: db.users.length,
    activeUsersCount,
    activeSessionsCount
  });
});

app.route('/api', api);

// Start server
const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: config.host
  },
  (info) => {
    console.log(`[API] Server running on http://${config.host}:${info.port}`);
  }
);

wsManager.init(server as any);
