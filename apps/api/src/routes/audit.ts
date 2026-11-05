import { Hono } from 'hono';
import { db } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';

export const auditRouter = new Hono();

auditRouter.get('/', requirePermission('workspace:view_audit_log'), async (c) => {
  const auth = c.get('auth');
  const logs = db.getAuditLogs(auth.workspaceId);
  return c.json(logs);
});
