import { Hono } from 'hono';
import { db } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';
import { WORKSPACE_ROLES, type WorkspaceRole } from '@webbarracks/shared';

export const workspaceRouter = new Hono();

// List workspaces user belongs to
workspaceRouter.get('/', async (c) => {
  const auth = c.get('auth');
  const userMemberships = db.workspaceMembers.filter((m) => m.user_id === auth.userId && m.is_active);
  const userWorkspaces = userMemberships.map((m) => db.getWorkspaceById(m.workspace_id)).filter(Boolean);
  return c.json(userWorkspaces);
});

// Get current workspace
workspaceRouter.get('/current', async (c) => {
  const auth = c.get('auth');
  const ws = db.getWorkspaceById(auth.workspaceId);
  if (!ws) return c.json({ error: 'Workspace not found' }, 404);
  return c.json(ws);
});

// List members of the workspace
workspaceRouter.get('/members', async (c) => {
  const auth = c.get('auth');
  const members = db.getWorkspaceMembers(auth.workspaceId);
  return c.json(members);
});

// Update member role (Owner/Admin only)
workspaceRouter.put('/members/:userId/role', requirePermission('workspace:manage_members'), async (c) => {
  const auth = c.get('auth');
  const targetUserId = c.req.param('userId');
  const body = await c.req.json();
  const role = body.role as WorkspaceRole;

  if (!WORKSPACE_ROLES.includes(role)) {
    return c.json({ error: 'Invalid workspace role' }, 400);
  }

  const updated = db.setWorkspaceMemberRole(auth.workspaceId, targetUserId, role);
  db.logAudit({
    workspace_id: auth.workspaceId,
    user_id: auth.userId,
    action: 'member.role_changed',
    entity_type: 'workspace_member',
    entity_id: targetUserId,
    details: { new_role: role }
  });

  return c.json(updated);
});
