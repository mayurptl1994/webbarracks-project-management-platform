import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/store.js';
import { resolveEffectivePermissions, type WorkspaceRole, type ProjectRole, type Permission } from '@webbarracks/shared';

export interface AuthContext {
  userId: string;
  workspaceId: string;
  workspaceRole: WorkspaceRole;
  projectRole?: ProjectRole | null;
  permissions: Set<Permission>;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const demoUserHeader = c.req.header('x-demo-user-id');
  const workspaceHeader = c.req.header('x-workspace-id') || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const projectHeader = c.req.header('x-project-id');

  let userId: string | null = null;

  // 1. Support local demo header for fast testing/role-switching
  if (demoUserHeader && db.getUserById(demoUserHeader)) {
    userId = demoUserHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      // Decode JWT token
      const decoded = jwt.decode(token) as { sub?: string; id?: string };
      if (decoded && (decoded.sub || decoded.id)) {
        userId = decoded.sub || decoded.id!;
      }
    } catch {
      // Fallback: check if token itself is user ID (local mode)
      if (db.getUserById(token)) {
        userId = token;
      }
    }
  }

  // Default to owner for unauthenticated requests in local dev if no headers provided
  if (!userId) {
    userId = '11111111-1111-1111-1111-111111111111'; // Alex Mercer (Owner)
  }

  const user = db.getUserById(userId);
  if (!user) {
    return c.json({ error: 'Unauthorized: User not found' }, 401);
  }

  // Resolve membership and roles
  const member = db.getWorkspaceMember(workspaceHeader, userId);
  const workspaceRole: WorkspaceRole = member ? member.role : 'member';

  let projectRole: ProjectRole | null = null;
  if (projectHeader) {
    projectRole = db.getProjectMemberRole(projectHeader, userId) || null;
  }

  const permissions = resolveEffectivePermissions(workspaceRole, projectRole);

  c.set('auth', {
    userId,
    workspaceId: workspaceHeader,
    workspaceRole,
    projectRole,
    permissions
  });

  await next();
}

