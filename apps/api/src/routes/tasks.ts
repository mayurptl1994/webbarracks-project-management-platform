import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { db } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { CreateTaskSchema, UpdateTaskSchema, AddCommentSchema, type Task, type TaskComment } from '@webbarracks/shared';
import { wsManager } from '../ws/server.js';

export const taskRouter = new Hono();

// List tasks
taskRouter.get('/', async (c) => {
  const auth = c.get('auth');
  const projectId = c.req.query('projectId');
  const tasks = db.getTasks(auth.workspaceId, projectId);
  return c.json(tasks);
});

// Get task details with comments, time tracked per user, active collaborators
taskRouter.get('/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const task = db.getTaskById(id);
  if (!task) return c.json({ error: 'Task not found' }, 404);

  const isClient = auth.workspaceRole === 'client';
  const comments = db.getComments(id, isClient);

  // Time tracked per user on this task
  const entries = db.timeEntries.filter((te) => te.task_id === id && te.ended_at !== null);
  const userTimeMap: Record<string, number> = {};
  for (const entry of entries) {
    userTimeMap[entry.user_id] = (userTimeMap[entry.user_id] || 0) + entry.duration_seconds;
  }

  const timeBreakdown = Object.entries(userTimeMap).map(([userId, seconds]) => {
    const user = db.getUserById(userId);
    return {
      userId,
      fullName: user?.full_name || 'Team Member',
      avatarUrl: user?.avatar_url,
      hours: Math.round((seconds / 3600.0) * 10) / 10
    };
  });

  // Check currently active timers on this task
  const activeNow = db.timeEntries
    .filter((entry) => entry.task_id === id && entry.ended_at === null)
    .map((entry) => {
      const user = db.getUserById(entry.user_id);
      return {
        userId: entry.user_id,
        fullName: user?.full_name || 'Team Member',
        avatarUrl: user?.avatar_url,
        startedAt: entry.started_at
      };
    });

  return c.json({
    task,
    comments,
    timeBreakdown,
    activeCollaborators: activeNow,
    totalSecondsTracked: entries.reduce((acc, e) => acc + e.duration_seconds, 0)
  });
});

// Create task
taskRouter.post('/', requirePermission('task:create'), async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const parsed = CreateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  const project = db.getProjectById(parsed.data.project_id);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  const count = db.tasks.filter((t) => t.project_id === project.id).length + 1;
  const key = `${project.key}-${count}`;

  const newTask: Task = {
    id: randomUUID(),
    workspace_id: auth.workspaceId,
    project_id: parsed.data.project_id,
    key,
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    type: parsed.data.type,
    reporter_id: auth.userId,
    due_date: parsed.data.due_date || null,
    start_date: parsed.data.start_date || null,
    estimate_hours: parsed.data.estimate_hours,
    billable: parsed.data.billable,
    tags: parsed.data.tags,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const created = db.createTask(newTask, parsed.data.assignee_ids);

  db.logAudit({
    workspace_id: auth.workspaceId,
    user_id: auth.userId,
    action: 'task.create',
    entity_type: 'task',
    entity_id: newTask.id,
    details: { key, title: newTask.title }
  });

  wsManager.broadcast('task.updated', { action: 'created', task: created }, auth.workspaceId);

  return c.json(created, 201);
});

// Update task (status change, assignees, estimate)
taskRouter.put('/:id', requirePermission('task:edit'), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  const updated = db.updateTask(id, parsed.data, parsed.data.assignee_ids);
  if (!updated) return c.json({ error: 'Task not found' }, 404);

  wsManager.broadcast('task.updated', { action: 'updated', task: updated }, auth.workspaceId);

  return c.json(updated);
});

// Add comment to task
taskRouter.post('/:id/comments', requirePermission('task:comment'), async (c) => {
  const auth = c.get('auth');
  const taskId = c.req.param('id');
  const body = await c.req.json();
  const parsed = AddCommentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  // Client cannot post internal comments
  let isInternal = parsed.data.is_internal;
  if (auth.workspaceRole === 'client') {
    isInternal = false;
  }

  const comment: TaskComment = {
    id: randomUUID(),
    task_id: taskId,
    user_id: auth.userId,
    content: parsed.data.content,
    is_internal: isInternal,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.addComment(comment);
  const user = db.getUserById(auth.userId);

  return c.json({ ...comment, user }, 201);
});
