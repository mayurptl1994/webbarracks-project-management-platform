import type { Context, Next } from 'hono';
import type { Permission } from '@webbarracks/shared';

/**
 * Enforces RBAC permissions defined in shared matrix.
 * Never trusts client role claims; relies on the server-resolved effective permissions.
 */
export function requirePermission(permission: Permission) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ error: 'Unauthorized: Authentication required' }, 401);
    }

    if (!auth.permissions.has(permission)) {
      return c.json(
        {
          error: 'Forbidden: Insufficient permissions',
          requiredPermission: permission,
          userRole: auth.workspaceRole,
          projectRole: auth.projectRole
        },
        403
      );
    }

    await next();
  };
}
