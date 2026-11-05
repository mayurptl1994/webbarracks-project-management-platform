import { Hono } from 'hono';
import { db } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { UploadScreenshotMetadataSchema } from '@webbarracks/shared';
import { wsManager } from '../ws/server.js';

export const screenshotRouter = new Hono();

// List screenshots (strictly forbidden for Client role!)
screenshotRouter.get('/', requirePermission('screenshots:view_own'), async (c) => {
  const auth = c.get('auth');
  if (auth.workspaceRole === 'client') {
    return c.json({ error: 'Forbidden: Clients cannot access screenshots' }, 403);
  }

  const projectId = c.req.query('projectId');
  const userId = c.req.query('userId');

  // If user cannot view others' screenshots, restrict to their own
  const canViewOthers = auth.permissions.has('screenshots:view_others');
  const effectiveUserId = canViewOthers ? userId : auth.userId;

  const screenshots = db.getScreenshots(auth.workspaceId, {
    projectId,
    userId: effectiveUserId
  });

  // Enrich with user and project data
  const enriched = screenshots.map((s) => {
    const user = db.getUserById(s.user_id);
    const task = db.getTaskById(s.task_id);
    const project = db.getProjectById(s.project_id);
    return {
      ...s,
      userName: user?.full_name || 'Team Member',
      taskKey: task?.key,
      taskTitle: task?.title,
      projectName: project?.name
    };
  });

  return c.json(enriched);
});

// Upload screenshot metadata and image frame
screenshotRouter.post('/upload', requirePermission('screenshots:view_own'), async (c) => {
  const auth = c.get('auth');
  if (auth.workspaceRole === 'client') {
    return c.json({ error: 'Forbidden: Clients cannot upload screenshots' }, 403);
  }

  const body = await c.req.json();
  const parsed = UploadScreenshotMetadataSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  const item = db.addScreenshot({
    time_entry_id: parsed.data.time_entry_id || null,
    workspace_id: auth.workspaceId,
    project_id: parsed.data.project_id,
    task_id: parsed.data.task_id,
    user_id: auth.userId,
    taken_at: parsed.data.taken_at || new Date().toISOString(),
    storage_path: parsed.data.image_base64 || 'screenshots/captured-frame.webp',
    activity_percent: parsed.data.activity_percent,
    blurred: parsed.data.blurred,
    app_name: parsed.data.app_name || 'Browser Workspace',
    window_title: parsed.data.window_title || 'Active Session'
  });

  wsManager.broadcast('screenshot.uploaded', { screenshot: item }, auth.workspaceId);

  return c.json(item, 201);
});

// Delete screenshot
screenshotRouter.delete('/:id', requirePermission('screenshots:delete_own'), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const isAdmin = auth.permissions.has('screenshots:delete_others');

  const success = db.deleteScreenshot(id, auth.userId, isAdmin);
  if (!success) {
    return c.json({ error: 'Screenshot not found or delete window expired' }, 404);
  }

  return c.json({ success: true });
});

