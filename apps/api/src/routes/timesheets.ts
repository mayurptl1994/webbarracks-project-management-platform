import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { db } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { TimesheetSubmitSchema, TimesheetApprovalSchema, type Timesheet } from '@webbarracks/shared';

export const timesheetRouter = new Hono();

// Get weekly timesheet grid data for current user or all (if manager/admin)
timesheetRouter.get('/grid', async (c) => {
  const auth = c.get('auth');
  const targetUserId = c.req.query('userId') || auth.userId;
  const periodStart = c.req.query('periodStart'); // YYYY-MM-DD

  // Fetch entries for this user
  let entries = db.timeEntries.filter((e) => e.workspace_id === auth.workspaceId && e.user_id === targetUserId);
  if (periodStart) {
    const start = new Date(periodStart).getTime();
    const end = start + 7 * 24 * 3600 * 1000;
    entries = entries.filter((e) => {
      const t = new Date(e.started_at).getTime();
      return t >= start && t < end;
    });
  }

  // Group entries by task/project
  const grouped: Record<string, { task: unknown; project: unknown; days: number[]; total: number }> = {};
  for (const e of entries) {
    if (!grouped[e.task_id]) {
      const task = db.getTaskById(e.task_id);
      const project = db.getProjectById(e.project_id);
      grouped[e.task_id] = {
        task,
        project,
        days: [0, 0, 0, 0, 0, 0, 0], // Mon..Sun hours
        total: 0
      };
    }
    const dayOfWeek = (new Date(e.started_at).getDay() + 6) % 7; // 0=Mon, 6=Sun
    const hrs = Math.round((e.duration_seconds / 3600.0) * 10) / 10;
    grouped[e.task_id].days[dayOfWeek] += hrs;
    grouped[e.task_id].total += hrs;
  }

  const existingTimesheet = db.timesheets.find(
    (ts) => ts.workspace_id === auth.workspaceId && ts.user_id === targetUserId && ts.period_start === periodStart
  );

  return c.json({
    userId: targetUserId,
    periodStart,
    rows: Object.values(grouped),
    status: existingTimesheet?.status || 'draft',
    timesheetId: existingTimesheet?.id
  });
});

// Submit timesheet for approval
timesheetRouter.post('/submit', requirePermission('time:track_own'), async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const parsed = TimesheetSubmitSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  let ts = db.timesheets.find(
    (t) => t.workspace_id === auth.workspaceId && t.user_id === auth.userId && t.period_start === parsed.data.period_start
  );

  if (!ts) {
    ts = {
      id: randomUUID(),
      workspace_id: auth.workspaceId,
      user_id: auth.userId,
      period_start: parsed.data.period_start,
      period_end: parsed.data.period_end,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      total_seconds: 0,
      billable_seconds: 0
    };
    db.timesheets.push(ts);
  } else {
    ts.status = 'submitted';
    ts.submitted_at = new Date().toISOString();
  }

  return c.json(ts);
});

// Approve or reject timesheet (Manager/Admin only)
timesheetRouter.post('/:id/approval', requirePermission('time:approve_timesheets'), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = TimesheetApprovalSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  const ts = db.timesheets.find((t) => t.id === id);
  if (!ts) return c.json({ error: 'Timesheet not found' }, 404);

  if (parsed.data.action === 'approve') {
    ts.status = 'approved';
    ts.approved_by = auth.userId;
    ts.approved_at = new Date().toISOString();

    // Lock corresponding time entries
    const start = new Date(ts.period_start).getTime();
    const end = new Date(ts.period_end).getTime() + 86400000;
    for (const e of db.timeEntries) {
      if (e.user_id === ts.user_id && e.workspace_id === ts.workspace_id) {
        const t = new Date(e.started_at).getTime();
        if (t >= start && t <= end) {
          e.status = 'approved';
          e.approved_by = auth.userId;
          e.approved_at = ts.approved_at;
        }
      }
    }
  } else {
    ts.status = 'rejected';
    ts.rejection_reason = parsed.data.rejection_reason || 'Rejected by manager';
  }

  return c.json(ts);
});
