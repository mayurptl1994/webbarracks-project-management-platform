import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { db } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { CreateProjectSchema, UpdateProjectSchema, type Project } from '@webbarracks/shared';

export const projectRouter = new Hono();

// List all projects (respecting client restrictions)
projectRouter.get('/', async (c) => {
  const auth = c.get('auth');
  const isClient = auth.workspaceRole === 'client';
  const projects = db.getProjects(auth.workspaceId, auth.userId, isClient);

  // Compute budget burn & health indicator for each project
  const enriched = projects.map((p) => {
    const timeEntries = db.timeEntries.filter((te) => te.project_id === p.id && te.ended_at !== null);
    const trackedHours = timeEntries.reduce((acc, te) => acc + te.duration_seconds, 0) / 3600.0;
    const trackedAmount = timeEntries.reduce((acc, te) => acc + (te.duration_seconds / 3600.0) * te.hourly_rate_snapshot, 0);

    let burnPercent = 0;
    if (p.budget_type === 'hours' && p.budget_value > 0) {
      burnPercent = Math.round((trackedHours / p.budget_value) * 100);
    } else if (p.budget_type === 'fixed_amount' && p.budget_value > 0) {
      burnPercent = Math.round((trackedAmount / p.budget_value) * 100);
    }

    let health: 'on_track' | 'at_risk' | 'off_track' = 'on_track';
    if (burnPercent > 100) health = 'off_track';
    else if (burnPercent > 80) health = 'at_risk';

    return {
      ...p,
      trackedHours: Math.round(trackedHours * 10) / 10,
      trackedAmount: Math.round(trackedAmount),
      burnPercent,
      health
    };
  });

  return c.json(enriched);
});

// Get project by ID
projectRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const project = db.getProjectById(id);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  const members = db.projectMembers
    .filter((pm) => pm.project_id === id)
    .map((pm) => ({
      ...pm,
      user: db.getUserById(pm.user_id)
    }));

  const tasks = db.getTasks(project.workspace_id, id);

  return c.json({
    project,
    members,
    tasksCount: tasks.length,
    completedTasksCount: tasks.filter((t) => t.status === 'done').length
  });
});

// Create project
projectRouter.post('/', requirePermission('project:create'), async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const parsed = CreateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  const newProject: Project = {
    id: randomUUID(),
    workspace_id: auth.workspaceId,
    name: parsed.data.name,
    key: parsed.data.key,
    description: parsed.data.description || null,
    color: parsed.data.color,
    icon: parsed.data.icon,
    status: 'active',
    owner_id: auth.userId,
    visibility: parsed.data.visibility,
    budget_type: parsed.data.budget_type,
    budget_value: parsed.data.budget_value,
    billable_default: parsed.data.billable_default,
    currency: 'USD',
    tags: parsed.data.tags,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.createProject(newProject);

  // Add creator as project owner
  db.projectMembers.push({
    id: randomUUID(),
    project_id: newProject.id,
    user_id: auth.userId,
    role: 'project_owner',
    created_at: new Date().toISOString()
  });

  db.logAudit({
    workspace_id: auth.workspaceId,
    user_id: auth.userId,
    action: 'project.create',
    entity_type: 'project',
    entity_id: newProject.id,
    details: { name: newProject.name, key: newProject.key }
  });

  return c.json(newProject, 201);
});

// Update project
projectRouter.put('/:id', requirePermission('project:edit'), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
  }

  const updated = db.updateProject(id, parsed.data);
  if (!updated) return c.json({ error: 'Project not found' }, 404);

  db.logAudit({
    workspace_id: auth.workspaceId,
    user_id: auth.userId,
    action: 'project.update',
    entity_type: 'project',
    entity_id: id,
    details: parsed.data
  });

  return c.json(updated);
});
