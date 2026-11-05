import { Hono } from 'hono';
import { db } from '../db/store.js';
import { resolveEffectivePermissions } from '@webbarracks/shared';

export const authRouter = new Hono();

// Return session for the currently authenticated user
authRouter.get('/session', async (c) => {
  const auth = c.get('auth');
  const user = db.getUserById(auth.userId);
  const workspace = db.getWorkspaceById(auth.workspaceId);

  if (!user || !workspace) {
    return c.json({ error: 'User or Workspace not found' }, 404);
  }

  return c.json({
    user,
    workspace,
    workspaceRole: auth.workspaceRole,
    projectRole: auth.projectRole,
    effectivePermissions: Array.from(auth.permissions)
  });
});

// Demo switch: lets reviewer switch role in 1-click in the UI
authRouter.get('/demo-users', async (c) => {
  const members = db.getWorkspaceMembers('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  return c.json(members);
});

// Demo login/switch endpoint
authRouter.post('/demo-switch', async (c) => {
  const body = await c.req.json();
  const { userId } = body;
  const user = db.getUserById(userId);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const member = db.getWorkspaceMember('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', userId);
  const role = member ? member.role : 'member';
  const perms = resolveEffectivePermissions(role);

  return c.json({
    token: user.id, // For local dev, token matches user ID
    user,
    workspace: db.getWorkspaceById('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    workspaceRole: role,
    effectivePermissions: Array.from(perms)
  });
});
