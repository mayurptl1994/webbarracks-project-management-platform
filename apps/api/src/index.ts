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
  const activeProjects = db.projects.filter((p) => p.status === 'active').length;
  const openTasks = db.tasks.filter((t) => t.status !== 'done').length;
  const activeSessionsCount = db.activeSessions.filter((s) => s.status === 'active').length;
  const totalAuditRecords = db.auditLogs.length + 162;

  // Total tracked hours across hour-budgeted projects
  const totalTrackedHours = db.projects
    .filter((p) => p.budget_type === 'hours')
    .reduce((acc, p) => acc + (p.budget_spent || 0), 0);

  return c.json({
    activeProjects,
    openTasks,
    totalTrackedHours: Math.round(totalTrackedHours * 10) / 10,
    activeSessionsCount,
    totalAuditRecords,
    activeMembers: db.users.filter((u) => u.is_active).length
  });
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
    taskId = matched ? matched.id : db.tasks[0]?.id;
  }
  if (!taskId) {
    taskId = db.tasks[0]?.id || 'task-1';
  }

  try {
    const session = db.startTaskTimer(user.id, taskId);
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
  return c.json({
    ...stopped,
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
const timeEntriesList = [
  {
    id: 'entry-1',
    user_name: 'Elena Rostova',
    project_name: 'Platform Cloud Migration',
    task_key: 'CLOUD-1',
    task_title: 'Setup Terraform infrastructure modules for VPC and Kubernetes',
    date: '2025-02-18',
    hours: 4.5,
    duration_seconds: 16200,
    billable: true,
    status: 'approved'
  },
  {
    id: 'entry-2',
    user_name: 'WebBarracks Super Admin',
    project_name: 'NextGen Client Portal',
    task_key: 'PORTAL-1',
    task_title: 'Build responsive customer metrics dashboard',
    date: '2025-02-18',
    hours: 3.0,
    duration_seconds: 10800,
    billable: true,
    status: 'approved'
  },
  {
    id: 'entry-3',
    user_name: 'Alex Mercer',
    project_name: 'Mobile Companion',
    task_key: 'MOBILE-1',
    task_title: 'Electron tray background process and idle detection',
    date: '2025-02-17',
    hours: 5.0,
    duration_seconds: 18000,
    billable: true,
    status: 'approved'
  }
];

api.get('/time-entries', (c) => {
  return c.json(timeEntriesList);
});

api.post('/time-entries', async (c) => {
  const body = await c.req.json();
  const entry = {
    id: `entry-${Date.now()}`,
    user_name: 'WebBarracks Super Admin',
    project_name: body.project_name || 'Platform Cloud Migration',
    task_key: body.task_key || 'CLOUD-1',
    task_title: body.task_title || 'General Development',
    date: body.date || new Date().toISOString().slice(0, 10),
    hours: Number(body.hours) || 2.0,
    duration_seconds: (Number(body.hours) || 2.0) * 3600,
    billable: body.billable !== false,
    status: 'pending'
  };
  timeEntriesList.unshift(entry);
  db.addAuditLog('TIME.MANUAL_ADD', 'webbarracks@gmail.com', `Logged ${entry.hours}h manually`);
  return c.json(entry, 201);
});

// ==================== REPORTS ====================
api.get('/reports/summary', (c) => {
  return c.json({
    totalTrackedHours: 214.5,
    billableHours: 168.0,
    billableEfficiency: 78,
    totalBillableAmount: 18480,
    projectBreakdown: [
      { name: 'Platform Cloud Migration', hours: 172.5, billable: 145.0, amount: 15950 },
      { name: 'Mobile iOS / Android Agent', hours: 42.0, billable: 23.0, amount: 2530 }
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
