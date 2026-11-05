import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { config } from './config.js';
import { requestLogger } from './middleware/logger.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { authMiddleware } from './middleware/auth.js';
import { wsManager } from './ws/server.js';
import { startCronJobs } from './cron/jobs.js';

// Route modules
import { authRouter } from './routes/auth.js';
import { workspaceRouter } from './routes/workspaces.js';
import { projectRouter } from './routes/projects.js';
import { taskRouter } from './routes/tasks.js';
import { timeRouter } from './routes/time.js';
import { timesheetRouter } from './routes/timesheets.js';
import { screenshotRouter } from './routes/screenshots.js';
import { reportRouter } from './routes/reports.js';
import { dashboardRouter } from './routes/dashboard.js';
import { auditRouter } from './routes/audit.js';

const app = new Hono();

// Global middleware
app.use('*', requestLogger);
app.use(
  '*',
  cors({
    origin: (origin) => (origin ? origin : '*'),
    allowHeaders: ['Content-Type', 'Authorization', 'x-demo-user-id', 'x-workspace-id', 'x-project-id'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'x-request-id'],
    maxAge: 600,
    credentials: true
  })
);
app.use('*', rateLimiter);

// Health check endpoint (for Render / Docker / ping monitors)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'webbarracks-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Authenticated API routes
const api = new Hono();
api.use('*', authMiddleware);

api.route('/auth', authRouter);
api.route('/workspaces', workspaceRouter);
api.route('/projects', projectRouter);
api.route('/tasks', taskRouter);
api.route('/time', timeRouter);
api.route('/timesheets', timesheetRouter);
api.route('/screenshots', screenshotRouter);
api.route('/reports', reportRouter);
api.route('/dashboard', dashboardRouter);
api.route('/audit-logs', auditRouter);

app.route('/api', api);

// Central error handler
app.onError((err, c) => {
  console.error('[Central Error Handler]', err);
  return c.json(
    {
      error: err.message || 'Internal Server Error',
      status: 500
    },
    500
  );
});

// Start HTTP server and bind WebSocket
const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: config.host
  },
  (info) => {
    console.log(`====================================================`);
    console.log(` Webbarracks API Server running at http://${config.host}:${info.port}`);
    console.log(` WebSocket Server running at ws://${config.host}:${info.port}/ws`);
    console.log(` Health check available at http://${config.host}:${info.port}/health`);
    console.log(`====================================================`);
  }
);

// Initialize WebSockets on HTTP server
wsManager.init(server as unknown as import('http').Server);

// Start scheduled background jobs
startCronJobs();
