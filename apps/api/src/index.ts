import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { config } from './config.js';
import { db, type UserAccount } from './db/store.js';

const app = new Hono();

// Global CORS Middleware
app.use(
  '*',
  cors({
    origin: (origin) => (origin ? origin : 'http://localhost:5173'),
    allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);

// Auth helper
function getAuthenticatedUser(c: any): UserAccount {
  const authHeader = c.req.header('Authorization');
  const userIdHeader = c.req.header('x-user-id');

  let userId: string | null = null;
  if (userIdHeader) {
    userId = userIdHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.substring(7);
  }

  if (userId) {
    const user = db.getUserById(userId);
    if (user) return user;
  }

  // Default to Super Admin for local development
  return db.users[0];
}

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'webbarracks-project-management-api',
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
  db.addAuditLog('AUTH.LOGIN', user.email, `User ${user.email} authenticated`);

  return c.json({
    token: user.id,
    user
  });
});

api.get('/auth/me', (c) => {
  const user = getAuthenticatedUser(c);
  return c.json({ user });
});

// ==================== DASHBOARD METRICS ====================
api.get('/dashboard/stats', (c) => {
  const activeClients = db.getClients().filter((cl) => cl.status === 'active').length;
  const totalClients = db.getClients().length;
  const activeProjects = db.projects.filter((p) => p.status === 'active').length;
  const openTasks = db.tasks.filter((t) => t.status !== 'done').length;
  const activeSessionsCount = db.activeSessions.filter((s) => s.status === 'active').length;
  const totalAuditRecords = db.auditLogs.length + 162;

  // Total tracked hours across hour-budgeted projects
  const totalTrackedHours = db.projects
    .filter((p) => p.budget_type === 'hours')
    .reduce((acc, p) => acc + (p.budget_spent || 0), 0);

  return c.json({
    activeClients,
    totalClients,
    activeProjects,
    openTasks,
    totalTrackedHours: Math.round(totalTrackedHours * 10) / 10,
    activeSessionsCount,
    totalAuditRecords,
    activeMembers: db.users.filter((u) => u.is_active).length
  });
});

// ==================== CLIENTS ====================
api.get('/clients', (c) => {
  return c.json(db.getClients());
});

api.get('/clients/:id', (c) => {
  const client = db.getClientById(c.req.param('id'));
  if (!client) return c.json({ error: 'Client not found' }, 404);
  return c.json(client);
});

api.post('/clients', async (c) => {
  const user = getAuthenticatedUser(c);
  const body = await c.req.json();
  if (!body.name || !body.name.trim()) {
    return c.json({ error: 'Client name is required.' }, 400);
  }
  const client = db.createClient(body);
  return c.json(client, 201);
});

api.put('/clients/:id', async (c) => {
  const user = getAuthenticatedUser(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const updated = db.updateClient(id, body);
  if (!updated) return c.json({ error: 'Client not found' }, 404);
  return c.json(updated);
});

api.delete('/clients/:id', (c) => {
  const user = getAuthenticatedUser(c);
  const id = c.req.param('id');
  const success = db.deleteClient(id);
  if (!success) return c.json({ error: 'Client not found' }, 404);
  return c.json({ success: true, message: 'Client deleted successfully.' });
});

// ==================== PROJECTS ====================
api.get('/projects', (c) => {
  return c.json(db.getProjects());
});

api.post('/projects', async (c) => {
  const user = getAuthenticatedUser(c);
  if (user.role !== 'admin' && user.role !== 'manager') {
    return c.json({ error: 'Forbidden: Insufficient privileges.' }, 403);
  }
  const body = await c.req.json();
  const project = db.createProject(body);
  return c.json(project, 201);
});

// ==================== TASKS ====================
api.get('/tasks', (c) => {
  const projectId = c.req.query('projectId');
  return c.json(db.getTasks(projectId));
});

api.post('/tasks', async (c) => {
  const body = await c.req.json();
  const task = db.createTask(body);
  return c.json(task, 201);
});

api.get('/tasks/:id', (c) => {
  const id = c.req.param('id');
  const task = db.getTaskById(id);
  if (!task) return c.json({ error: 'Task not found' }, 404);
  return c.json({ task });
});

api.put('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const task = db.getTaskById(id);
  if (!task) return c.json({ error: 'Task not found' }, 404);
  if (body.status) task.status = body.status;
  if (body.title) task.title = body.title;
  if (body.description !== undefined) task.description = body.description;
  if (body.priority) task.priority = body.priority;
  if (body.assignee_name) task.assignee_name = body.assignee_name;
  task.updated_at = new Date().toISOString();
  return c.json({ task });
});

api.put('/tasks/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const updated = db.updateTaskStatus(id, body.status);
  if (!updated) return c.json({ error: 'Task not found' }, 404);
  return c.json(updated);
});

// ==================== TIME TRACKING ON TASKS ====================
api.get('/tracking/active', (c) => {
  const user = getAuthenticatedUser(c);
  const session = db.getActiveSession(user.id);
  if (!session) return c.json({ active: null });

  const now = Date.now();
  const segmentElapsed = session.status === 'active' ? Math.floor((now - new Date(session.started_at).getTime()) / 1000) : 0;
  const totalSeconds = session.duration_seconds + segmentElapsed;

  return c.json({
    active: {
      ...session,
      target_name: `${session.task_key} - ${session.task_title}`,
      elapsed_seconds: Math.max(0, totalSeconds)
    }
  });
});

api.post('/tracking/start', async (c) => {
  const user = getAuthenticatedUser(c);
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  let taskId = body.taskId;
  if (!taskId && body.targetName) {
    const targetStr = String(body.targetName).toLowerCase();
    const matched = db.tasks.find(
      (t) => t.id === body.targetName || t.key.toLowerCase() === targetStr || t.title.toLowerCase().includes(targetStr) || targetStr.includes(t.key.toLowerCase())
    );
    taskId = matched ? matched.id : undefined;
  }

  const description = body.description || body.targetName || '';
  const taskName = body.task_name || body.taskName || description || 'General Client Work';
  const taskUrl = body.task_url || body.taskUrl || '';
  const clientId = body.clientId;
  const billable = body.billable !== false;

  try {
    const session = db.startTaskTimer(user.id, {
      taskId,
      taskName,
      taskUrl,
      description,
      clientId,
      billable
    });
    return c.json(
      {
        ...session,
        target_name: `${session.task_key} - ${session.task_title}`
      },
      201
    );
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

api.post('/tracking/pause', (c) => {
  const user = getAuthenticatedUser(c);
  const paused = db.pauseTaskTimer(user.id);
  if (!paused) return c.json({ error: 'No active session to pause' }, 400);
  return c.json({
    ...paused,
    target_name: `${paused.task_key} - ${paused.task_title}`
  });
});

api.post('/tracking/resume', (c) => {
  const user = getAuthenticatedUser(c);
  const resumed = db.resumeTaskTimer(user.id);
  if (!resumed) return c.json({ error: 'No paused session to resume' }, 400);
  return c.json({
    ...resumed,
    target_name: `${resumed.task_key} - ${resumed.task_title}`
  });
});

api.post('/tracking/stop', (c) => {
  const user = getAuthenticatedUser(c);
  const stopped = db.stopTaskTimer(user.id);
  if (!stopped) return c.json({ error: 'No active tracking session to stop' }, 400);

  const duration = Math.max(1, stopped.duration_seconds || 1);
  const hours = Math.round((duration / 3600) * 100) / 100;
  const rate = stopped.hourly_rate_snapshot || 100;
  const amount = stopped.billable ? Math.round(hours * rate * 100) / 100 : 0;

  const now = new Date();
  const startTime = new Date(stopped.started_at);
  const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const taskName = stopped.task_name || stopped.task_title || 'General Client Work';
  const taskUrl = stopped.task_url || '';
  const desc = stopped.description || `<p>${taskName}</p>`;

  const entry = {
    id: `entry-${Date.now()}`,
    user_name: user.full_name || 'WebBarracks Super Admin',
    user_id: user.id,
    task_key: stopped.task_key || 'TRK-1',
    task_name: taskName,
    task_title: taskName,
    task_url: taskUrl,
    description: desc,
    client_id: stopped.client_id,
    client_name: stopped.client_name || 'Stripe Global Enterprise',
    client_currency: stopped.client_currency || 'USD',
    client_rate: rate,
    date: new Date().toISOString().slice(0, 10),
    start_time: fmtTime(startTime),
    end_time: fmtTime(now),
    hours: hours || 0.1,
    duration_seconds: duration,
    billable: stopped.billable,
    billable_amount: amount,
    status: 'approved',
    created_at: new Date().toISOString()
  };
  timeEntriesList.unshift(entry);

  return c.json({
    ...stopped,
    entry,
    target_name: `${stopped.task_key} - ${stopped.task_title}`
  });
});

api.get('/tracking/history', (c) => {
  const user = getAuthenticatedUser(c);
  const userSessions = db.activeSessions
    .filter((s) => s.user_id === user.id)
    .map((s) => ({
      ...s,
      target_name: `${s.task_key} - ${s.task_title}`
    }));
  return c.json(userSessions);
});

api.get('/tracking/live', (c) => {
  const now = Date.now();
  const live = db.activeSessions
    .filter((s) => s.status === 'active' || s.status === 'paused')
    .map((s) => {
      const segment = s.status === 'active' ? Math.floor((now - new Date(s.started_at).getTime()) / 1000) : 0;
      return {
        ...s,
        target_name: `${s.task_key} - ${s.task_title}`,
        duration_seconds: (s.duration_seconds || 0) + segment
      };
    });
  return c.json(live);
});

// ==================== SCREENSHOTS ====================
api.post('/tracking/screenshots', async (c) => {
  const user = getAuthenticatedUser(c);
  const body = await c.req.json();
  const session = db.getActiveSession(user.id);

  const record = db.addScreenshot({
    session_id: session?.id || 'adhoc',
    user_id: user.id,
    user_name: user.full_name,
    project_id: session?.project_id || body.project_id || 'proj-1',
    project_name: session?.project_name || body.project_name || 'General Project',
    task_key: session?.task_key || body.task_key || 'TASK',
    task_title: session?.task_title || body.task_title || 'Work Session',
    taken_at: new Date().toISOString(),
    storage_path: body.image_base64 || 'screenshots/frame.webp',
    activity_percent: body.activity_percent || 88,
    app_name: body.app_name || 'VS Code',
    window_title: body.window_title || 'Active Session'
  });

  return c.json(record, 201);
});

api.get('/tracking/screenshots', (c) => {
  const user = getAuthenticatedUser(c);
  if (user.role === 'admin' || user.role === 'manager') {
    return c.json(db.screenshots);
  }
  return c.json(db.screenshots.filter((s) => s.user_id === user.id));
});

// ==================== AUDIT LOGS & USERS ====================
api.get('/audit-logs', (c) => {
  return c.json(db.auditLogs);
});

api.get('/users', (c) => {
  return c.json(db.users);
});

// ==================== TIMESHEETS ====================
let timesheetStatus = 'draft';
api.get('/timesheets/grid', (c) => {
  return c.json({
    status: timesheetStatus,
    rows: [
      {
        task: { key: 'CLOUD-1', title: 'Setup Terraform infrastructure modules for VPC and Kubernetes' },
        project: { name: 'Platform Cloud Migration' },
        days: [7.5, 8.0, 6.5, 8.0, 7.5, 0, 0],
        total: 37.5
      },
      {
        task: { key: 'PORTAL-1', title: 'Build responsive customer metrics dashboard' },
        project: { name: 'NextGen Client Portal' },
        days: [4.0, 4.5, 5.0, 4.0, 6.0, 0, 0],
        total: 23.5
      },
      {
        task: { key: 'MOBILE-1', title: 'Electron tray background process and powerMonitor idle detection' },
        project: { name: 'Mobile Companion' },
        days: [3.0, 2.5, 4.0, 3.5, 4.0, 0, 0],
        total: 17.0
      }
    ]
  });
});

api.post('/timesheets/submit', (c) => {
  timesheetStatus = 'submitted';
  db.addAuditLog('TIMESHEET.SUBMIT', 'webbarracks@gmail.com', 'Submitted weekly timesheet for approval');
  return c.json({ success: true, status: 'submitted' });
});

api.post('/timesheets/approve', (c) => {
  timesheetStatus = 'approved';
  db.addAuditLog('TIMESHEET.APPROVED', 'webbarracks@gmail.com', 'Approved weekly timesheet');
  return c.json({ success: true, status: 'approved' });
});

// ==================== TIME ENTRIES ====================
const timeEntriesList: any[] = [
  {
    id: 'entry-1',
    user_name: 'WebBarracks Super Admin',
    task_key: 'STRIPE-1',
    task_name: 'Setup multi-region database replication & failover',
    task_title: 'Setup multi-region database replication & failover',
    task_url: 'https://github.com/webbarracks/core/issues/84',
    description: '<p>Implemented zero-downtime PostgreSQL migrations with <strong>composite B-tree indexes</strong> on workspace partition keys.</p><ul><li>Added concurrent index creation scripts</li><li>Verified query plan under 100k records</li></ul>',
    client_id: 'client-1',
    client_name: 'Stripe Global Enterprise',
    client_currency: 'USD',
    client_rate: 120.0,
    date: '2026-11-05',
    start_time: '09:00 AM',
    end_time: '11:30 AM',
    hours: 2.5,
    duration_seconds: 9000,
    billable: true,
    billable_amount: 300.0,
    status: 'approved',
    created_at: '2026-11-05T11:30:00.000Z'
  },
  {
    id: 'entry-2',
    user_name: 'WebBarracks Super Admin',
    task_key: 'ACME-1',
    task_name: 'Client dashboard responsive token architecture',
    task_title: 'Client dashboard responsive token architecture',
    task_url: 'https://jira.company.com/browse/ACME-102',
    description: '<p>Refactored CSS design system tokens and <strong>optimized layout responsiveness</strong> for mobile viewports.</p>',
    client_id: 'client-2',
    client_name: 'Acme Digital Labs',
    client_currency: 'EUR',
    client_rate: 95.0,
    date: '2026-11-05',
    start_time: '01:15 PM',
    end_time: '02:45 PM',
    hours: 1.5,
    duration_seconds: 5400,
    billable: true,
    billable_amount: 142.5,
    status: 'approved',
    created_at: '2026-11-05T14:45:00.000Z'
  },
  {
    id: 'entry-3',
    user_name: 'Elena Rostova',
    task_key: 'APEX-1',
    task_name: 'Native Electron tray daemon with auto-updater',
    task_title: 'Native Electron tray daemon with auto-updater',
    task_url: 'https://jira.atlassian.net/browse/APEX-142',
    description: '<p>Configured <code>autoUpdater</code> with differential delta packages. Verified memory consumption stays under <strong>45MB</strong> when idling.</p>',
    client_id: 'client-3',
    client_name: 'Apex Mobility Group',
    client_currency: 'GBP',
    client_rate: 85.0,
    date: '2026-11-04',
    start_time: '10:00 AM',
    end_time: '01:30 PM',
    hours: 3.5,
    duration_seconds: 12600,
    billable: true,
    billable_amount: 297.5,
    status: 'approved',
    created_at: '2026-11-04T13:30:00.000Z'
  },
  {
    id: 'entry-4',
    user_name: 'Alex Mercer',
    task_key: 'STRIPE-2',
    task_name: 'Terraform VPC peering and security group automation',
    task_title: 'Terraform VPC peering and security group automation',
    task_url: 'https://linear.app/webbarracks/issue/STRIPE-89',
    description: '<p>Provisioned isolated database subnets with <strong>strict egress NACLs</strong> and automated route table associations.</p>',
    client_id: 'client-1',
    client_name: 'Stripe Global Enterprise',
    client_currency: 'USD',
    client_rate: 120.0,
    date: '2026-11-04',
    start_time: '02:00 PM',
    end_time: '04:15 PM',
    hours: 2.25,
    duration_seconds: 8100,
    billable: true,
    billable_amount: 270.0,
    status: 'approved',
    created_at: '2026-11-04T16:15:00.000Z'
  }
];

api.get('/time-entries', (c) => {
  return c.json(timeEntriesList);
});

api.post('/time-entries', async (c) => {
  const user = getAuthenticatedUser(c);
  const body = await c.req.json();

  let client = body.client_id ? db.getClientById(body.client_id) : null;
  if (!client && body.client_name) {
    client = db.getClients().find((cl) => cl.name.toLowerCase() === body.client_name.toLowerCase()) || null;
  }
  if (!client) {
    client = db.getClients()[0] || null;
  }

  const duration = body.duration_seconds || (Number(body.hours) || 1.0) * 3600;
  const hours = Math.round((duration / 3600) * 100) / 100;
  const rate = client ? client.hourly_rate : (user.hourly_bill_rate || 100);
  const billable = body.billable !== false;
  const amount = billable ? Math.round(hours * rate * 100) / 100 : 0;

  const taskName = body.task_name || body.task_title || body.description || 'General Client Work';
  const taskUrl = body.task_url || '';
  const desc = body.description || `<p>${taskName}</p>`;
  const taskKey = body.task_key || (client ? client.name.slice(0, 4).toUpperCase() + '-1' : 'TRK-1');

  const entry = {
    id: `entry-${Date.now()}`,
    user_name: user.full_name || 'WebBarracks Super Admin',
    user_id: user.id,
    task_key: taskKey,
    task_name: taskName,
    task_title: taskName,
    task_url: taskUrl,
    description: desc,
    client_id: client ? client.id : undefined,
    client_name: client ? client.name : 'Stripe Global Enterprise',
    client_currency: client ? client.currency : 'USD',
    client_rate: rate,
    date: body.date || new Date().toISOString().slice(0, 10),
    start_time: body.start_time || '09:00 AM',
    end_time: body.end_time || '10:00 AM',
    hours,
    duration_seconds: duration,
    billable,
    billable_amount: amount,
    status: 'approved',
    created_at: new Date().toISOString()
  };

  timeEntriesList.unshift(entry);
  db.addAuditLog('TIME.ADD', user.email, `Logged ${entry.hours}h on ${entry.task_name}`);
  return c.json(entry, 201);
});

api.put('/time-entries/:id', async (c) => {
  const user = getAuthenticatedUser(c);
  const id = c.req.param('id');
  const index = timeEntriesList.findIndex((e) => e.id === id);
  if (index === -1) return c.json({ error: 'Entry not found' }, 404);

  const body = await c.req.json();
  const existing = timeEntriesList[index];

  let client = existing.client_id ? db.getClientById(existing.client_id) : null;
  if (body.client_id) {
    const found = db.getClientById(body.client_id);
    if (found) client = found;
  }

  const rate = client ? client.hourly_rate : (existing.client_rate || user.hourly_bill_rate || 100);

  let duration = existing.duration_seconds;
  if (body.duration_seconds !== undefined) {
    duration = Math.max(0, Number(body.duration_seconds));
  } else if (body.hours !== undefined) {
    duration = Math.max(0, Number(body.hours) * 3600);
  }

  const hours = Math.round((duration / 3600) * 100) / 100;
  const billable = body.billable !== undefined ? Boolean(body.billable) : existing.billable;
  const amount = billable ? Math.round(hours * rate * 100) / 100 : 0;

  const taskName = body.task_name || body.task_title || existing.task_name || existing.task_title || 'General Client Work';
  const taskUrl = body.task_url !== undefined ? body.task_url : (existing.task_url || '');
  const desc = body.description !== undefined ? body.description : (existing.description || existing.task_title);

  const updated = {
    ...existing,
    ...body,
    task_name: taskName,
    task_title: taskName,
    task_url: taskUrl,
    description: desc,
    hours,
    duration_seconds: duration,
    billable,
    billable_amount: amount,
    client_id: client ? client.id : existing.client_id,
    client_name: client ? client.name : existing.client_name,
    client_currency: client ? client.currency : existing.client_currency,
    client_rate: rate,
    date: body.date || existing.date,
    start_time: body.start_time !== undefined ? body.start_time : existing.start_time,
    end_time: body.end_time !== undefined ? body.end_time : existing.end_time,
    updated_at: new Date().toISOString()
  };

  timeEntriesList[index] = updated;
  db.addAuditLog('TIME.UPDATE', user.email, `Updated time entry ${updated.task_name} (${updated.date} ${updated.start_time}-${updated.end_time}, ${updated.hours}h)`);
  return c.json(updated);
});

api.patch('/time-entries/:id', async (c) => {
  const user = getAuthenticatedUser(c);
  const id = c.req.param('id');
  const index = timeEntriesList.findIndex((e) => e.id === id);
  if (index === -1) return c.json({ error: 'Entry not found' }, 404);

  const body = await c.req.json();
  const existing = timeEntriesList[index];

  let client = existing.client_id ? db.getClientById(existing.client_id) : null;
  if (body.client_id) {
    const found = db.getClientById(body.client_id);
    if (found) client = found;
  }

  const rate = client ? client.hourly_rate : (existing.client_rate || user.hourly_bill_rate || 100);

  let duration = existing.duration_seconds;
  if (body.duration_seconds !== undefined) {
    duration = Math.max(0, Number(body.duration_seconds));
  } else if (body.hours !== undefined) {
    duration = Math.max(0, Number(body.hours) * 3600);
  }

  const hours = Math.round((duration / 3600) * 100) / 100;
  const billable = body.billable !== undefined ? Boolean(body.billable) : existing.billable;
  const amount = billable ? Math.round(hours * rate * 100) / 100 : 0;

  const taskName = body.task_name || body.task_title || existing.task_name || existing.task_title || 'General Client Work';
  const taskUrl = body.task_url !== undefined ? body.task_url : (existing.task_url || '');
  const desc = body.description !== undefined ? body.description : (existing.description || existing.task_title);

  const updated = {
    ...existing,
    ...body,
    task_name: taskName,
    task_title: taskName,
    task_url: taskUrl,
    description: desc,
    hours,
    duration_seconds: duration,
    billable,
    billable_amount: amount,
    client_id: client ? client.id : existing.client_id,
    client_name: client ? client.name : existing.client_name,
    client_currency: client ? client.currency : existing.client_currency,
    client_rate: rate,
    date: body.date || existing.date,
    start_time: body.start_time !== undefined ? body.start_time : existing.start_time,
    end_time: body.end_time !== undefined ? body.end_time : existing.end_time,
    updated_at: new Date().toISOString()
  };

  timeEntriesList[index] = updated;
  db.addAuditLog('TIME.UPDATE', user.email, `Updated time entry ${updated.task_name} (${updated.date} ${updated.start_time}-${updated.end_time}, ${updated.hours}h)`);
  return c.json(updated);
});

api.delete('/time-entries/:id', (c) => {
  const user = getAuthenticatedUser(c);
  const id = c.req.param('id');
  const index = timeEntriesList.findIndex((e) => e.id === id);
  if (index === -1) return c.json({ error: 'Entry not found' }, 404);

  const [removed] = timeEntriesList.splice(index, 1);
  db.addAuditLog('TIME.DELETE', user.email, `Deleted time entry ${removed.task_title}`);
  return c.json({ success: true, message: 'Time entry deleted' });
});

// ==================== REPORTS ====================
api.get('/reports/summary', (c) => {
  const clients = db.getClients();
  return c.json({
    totalTrackedHours: 214.5,
    billableHours: 168.0,
    billableEfficiency: 78,
    totalBillableAmount: 18480,
    clientBreakdown: [
      { id: 'client-1', name: 'Stripe Global Enterprise', currency: 'USD', hourlyRate: 120, hours: 172.5, billable: 145.0, amount: 17400 },
      { id: 'client-2', name: 'Acme Digital Labs', currency: 'EUR', hourlyRate: 95, hours: 28.0, billable: 20.0, amount: 1900 },
      { id: 'client-3', name: 'Apex Mobility Group', currency: 'GBP', hourlyRate: 85, hours: 14.0, billable: 3.0, amount: 255 }
    ],
    projectBreakdown: [
      { name: 'Stripe Enterprise Infrastructure', hours: 172.5, billable: 145.0, amount: 15950 },
      { name: 'Apex Mobility Agent', hours: 42.0, billable: 23.0, amount: 2530 }
    ]
  });
});

api.get('/reports/export/csv', (c) => {
  const csv = [
    'Date,User,Project,Task,Hours,Billable,Status',
    '2025-02-18,Elena Rostova,Platform Cloud Migration,CLOUD-1,4.5,true,approved',
    '2025-02-18,WebBarracks Super Admin,NextGen Client Portal,PORTAL-1,3.0,true,approved',
    '2025-02-17,Alex Mercer,Mobile Companion,MOBILE-1,5.0,true,approved'
  ].join('\n');

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', 'attachment; filename="webbarracks-report.csv"');
  return c.text(csv);
});

// ==================== TEAM ====================
api.get('/team', (c) => {
  return c.json(db.users);
});

app.route('/api', api);

// Start server
serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: config.host
  },
  (info) => {
    console.log(`[API] Project Management Server running on http://${config.host}:${info.port}`);
  }
);
