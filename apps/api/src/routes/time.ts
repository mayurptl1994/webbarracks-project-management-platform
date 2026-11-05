import { Hono } from 'hono';
import { db } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { StartTimerSchema, CreateManualTimeEntrySchema, UpdateTimeEntrySchema } from '@webbarracks/shared';
import { wsManager } from '../ws/server.js';

export const timeRouter = new Hono();

// Get active timer for the current user
timeRouter.get('/active', async (c) => {
  const auth = c.get('auth');
  const active = db.getActiveTimer(auth.userId);
  if (!active) {
    return c.json({ active: null });
  }

  const now = Date.now();
  const elapsed = Math.floor((now - new Date(active.started_at).getTime()) / 1000);
  const task = db.getTaskById(active.task_id);
  const project = db.getProjectById(active.project_id);

  return c.json({
    active: {
      ...active,
      elapsed_seconds: Math.max(0, elapsed),
      task,
      project
    }
  });
});

// Live team presence: who is tracking what right now
timeRouter.get('/presence', async (c) => {
  const auth = c.get('auth');
  const now = Date.now();
  const activeEntries = db.timeEntries.filter(
    (e) => e.workspace_id === auth.workspaceId && e.ended_at === null
  );

  const presence = activeEntries.map((entry) => {
    const user = db.getUserById(entry.user_id);
    const task = db.getTaskById(entry.task_id);
    const project = db.getProjectById(entry.project_id);
    const elapsed = Math.floor((now - new Date(entry.started_at).getTime()) / 1000);

    return {
      userId: entry.user_id,
      fullName: user?.full_name || 'Team Member',
      avatarUrl: user?.avatar_url,
      taskId: entry.task_id,
      taskTitle: task?.title || 'Unknown Task',
      taskKey: task?.key || '',
      projectId: entry.project_id,
      projectName: project?.name || 'Unknown Project',
      projectColor: project?.color || '#2563eb',
      startedAt: entry.started_at,
      elapsedSeconds: Math.max(0, elapsed)
    };
  });

  return c.json(presence);
});

// Start timer on a task
timeRouter.post('/start', requirePermission('time:track_own'), async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const parsed = StartTimerSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  const task = db.getTaskById(parsed.data.task_id);
  if (!task) return c.json({ error: 'Task not found' }, 404);

  try {
    const { entry, stoppedPrevious } = db.startTimer({
      workspace_id: auth.workspaceId,
      project_id: task.project_id,
      task_id: task.id,
      user_id: auth.userId,
      billable: parsed.data.billable ?? task.billable,
      note: parsed.data.note,
      switch_active: parsed.data.switch_active
    });

    // Broadcast presence update via WebSocket
    wsManager.broadcast('timer.started', { entry, stoppedPrevious }, auth.workspaceId);
    wsManager.sendPresence();

    return c.json({ entry, stoppedPrevious }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Timer error';
    return c.json({ error: message, requiresSwitchPrompt: true }, 409);
  }
});

// Stop active timer
timeRouter.post('/stop', requirePermission('time:track_own'), async (c) => {
  const auth = c.get('auth');
  const stopped = db.stopTimer(auth.userId);

  if (!stopped) {
    return c.json({ error: 'No running timer found' }, 404);
  }

  wsManager.broadcast('timer.stopped', { entry: stopped }, auth.workspaceId);
  wsManager.sendPresence();

  return c.json(stopped);
});

// List time entries with permission filters
timeRouter.get('/entries', async (c) => {
  const auth = c.get('auth');
  const projectId = c.req.query('projectId');
  const userId = c.req.query('userId');
  const isClient = auth.workspaceRole === 'client';

  // If member (and not manager/admin), they can only see own entries
  const canViewOthers = auth.permissions.has('time:view_others');
  const effectiveUserId = canViewOthers ? userId : auth.userId;

  let entries = db.getTimeEntries(auth.workspaceId, {
    projectId,
    userId: effectiveUserId
  });

  // Client view restriction: hide cost rates, unapproved draft entries, and internal details
  if (isClient) {
    entries = entries
      .filter((e) => e.billable && ['approved', 'submitted'].includes(e.status))
      .map((e) => ({
        ...e,
        cost_rate_snapshot: 0 // strip cost rate
      }));
  }

  return c.json(entries);
});

// Add manual time entry
timeRouter.post('/entries/manual', requirePermission('time:add_manual_own'), async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const parsed = CreateManualTimeEntrySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  const entry = db.addManualTimeEntry({
    workspace_id: auth.workspaceId,
    project_id: parsed.data.project_id,
    task_id: parsed.data.task_id,
    user_id: auth.userId,
    started_at: parsed.data.started_at,
    ended_at: parsed.data.ended_at,
    duration_seconds: parsed.data.duration_seconds,
    billable: parsed.data.billable,
    note: parsed.data.note,
    tags: parsed.data.tags
  });

  db.logAudit({
    workspace_id: auth.workspaceId,
    user_id: auth.userId,
    action: 'time_entry.manual_create',
    entity_type: 'time_entry',
    entity_id: entry.id,
    details: { duration_seconds: entry.duration_seconds, task_id: entry.task_id }
  });

  return c.json(entry, 201);
});

// Edit time entry with mandatory reason and audit logging
timeRouter.put('/entries/:id', requirePermission('time:edit_own'), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateTimeEntrySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  const entry = db.timeEntries.find((e) => e.id === id);
  if (!entry) return c.json({ error: 'Time entry not found' }, 404);

  // If editing someone else's entry, require time:edit_others permission
  if (entry.user_id !== auth.userId && !auth.permissions.has('time:edit_others')) {
    return c.json({ error: 'Forbidden: Cannot edit another user time entry' }, 403);
  }

  const oldDuration = entry.duration_seconds;
  if (parsed.data.duration_seconds !== undefined) entry.duration_seconds = parsed.data.duration_seconds;
  if (parsed.data.billable !== undefined) entry.billable = parsed.data.billable;
  if (parsed.data.note !== undefined) entry.note = parsed.data.note;
  if (parsed.data.edit_reason) {
    entry.edited_by = auth.userId;
    entry.edit_reason = parsed.data.edit_reason;
  }
  entry.updated_at = new Date().toISOString();

  db.logAudit({
    workspace_id: auth.workspaceId,
    user_id: auth.userId,
    action: 'time_entry.edited',
    entity_type: 'time_entry',
    entity_id: entry.id,
    details: {
      old_duration: oldDuration,
      new_duration: entry.duration_seconds,
      reason: parsed.data.edit_reason || 'Updated duration/note'
    }
  });

  return c.json(entry);
});
