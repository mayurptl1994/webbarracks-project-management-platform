import { Hono } from 'hono';
import { db } from '../db/store.js';
import { requirePermission } from '../middleware/rbac.js';

export const reportRouter = new Hono();

// Summary Report
reportRouter.get('/summary', requirePermission('reports:view_own'), async (c) => {
  const auth = c.get('auth');
  const isClient = auth.workspaceRole === 'client';
  const groupBy = c.req.query('groupBy') || 'project'; // 'project' | 'user' | 'date'

  // Filter entries
  const canViewAll = auth.permissions.has('reports:view_all') || auth.permissions.has('reports:view_team');
  let entries = db.timeEntries.filter((e) => e.workspace_id === auth.workspaceId && e.ended_at !== null);
  if (!canViewAll && !isClient) {
    entries = entries.filter((e) => e.user_id === auth.userId);
  } else if (isClient) {
    entries = entries.filter((e) => e.billable && ['approved', 'submitted'].includes(e.status));
  }

  const groups: Record<
    string,
    { key: string; name: string; totalHours: number; billableHours: number; billableAmount: number; costAmount: number }
  > = {};

  for (const entry of entries) {
    let groupKey = '';
    let groupName = '';

    if (groupBy === 'user') {
      groupKey = entry.user_id;
      const u = db.getUserById(entry.user_id);
      groupName = u?.full_name || 'Team Member';
    } else if (groupBy === 'date') {
      groupKey = entry.started_at.slice(0, 10);
      groupName = groupKey;
    } else {
      groupKey = entry.project_id;
      const p = db.getProjectById(entry.project_id);
      groupName = p?.name || 'Unknown Project';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        key: groupKey,
        name: groupName,
        totalHours: 0,
        billableHours: 0,
        billableAmount: 0,
        costAmount: 0
      };
    }

    const hrs = entry.duration_seconds / 3600.0;
    groups[groupKey].totalHours += hrs;
    if (entry.billable) {
      groups[groupKey].billableHours += hrs;
      groups[groupKey].billableAmount += hrs * entry.hourly_rate_snapshot;
    }
    // Only calculate cost if NOT a client
    if (!isClient) {
      groups[groupKey].costAmount += hrs * entry.cost_rate_snapshot;
    }
  }

  const rows = Object.values(groups).map((g) => ({
    ...g,
    totalHours: Math.round(g.totalHours * 10) / 10,
    billableHours: Math.round(g.billableHours * 10) / 10,
    billableAmount: Math.round(g.billableAmount),
    costAmount: Math.round(g.costAmount)
  }));

  const totals = rows.reduce(
    (acc, row) => ({
      totalHours: Math.round((acc.totalHours + row.totalHours) * 10) / 10,
      billableHours: Math.round((acc.billableHours + row.billableHours) * 10) / 10,
      billableAmount: acc.billableAmount + row.billableAmount,
      costAmount: acc.costAmount + row.costAmount
    }),
    { totalHours: 0, billableHours: 0, billableAmount: 0, costAmount: 0 }
  );

  return c.json({ groupBy, rows, totals });
});

// Project Profitability Report (Revenue vs Cost = Margin)
reportRouter.get('/profitability', requirePermission('reports:view_financial'), async (c) => {
  const auth = c.get('auth');
  if (auth.workspaceRole === 'client') {
    return c.json({ error: 'Forbidden: Clients cannot access profitability' }, 403);
  }

  const projects = db.projects.filter((p) => p.workspace_id === auth.workspaceId);
  const rows = projects.map((p) => {
    const entries = db.timeEntries.filter((e) => e.project_id === p.id && e.ended_at !== null);
    const totalHours = entries.reduce((acc, e) => acc + e.duration_seconds, 0) / 3600.0;
    const billableHours = entries.filter((e) => e.billable).reduce((acc, e) => acc + e.duration_seconds, 0) / 3600.0;

    const revenue = entries.reduce((acc, e) => (e.billable ? acc + (e.duration_seconds / 3600.0) * e.hourly_rate_snapshot : acc), 0);
    const cost = entries.reduce((acc, e) => acc + (e.duration_seconds / 3600.0) * e.cost_rate_snapshot, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    return {
      projectId: p.id,
      projectName: p.name,
      projectKey: p.key,
      totalHours: Math.round(totalHours * 10) / 10,
      billableHours: Math.round(billableHours * 10) / 10,
      revenue: Math.round(revenue),
      cost: Math.round(cost),
      profit: Math.round(profit),
      marginPercent: margin
    };
  });

  return c.json(rows);
});

// Team Utilization Report (Tracked vs Working Hours Capacity)
reportRouter.get('/utilization', requirePermission('reports:view_team'), async (c) => {
  const auth = c.get('auth');
  const members = db.getWorkspaceMembers(auth.workspaceId).filter((m) => m.role !== 'client');

  const rows = members.map((m) => {
    const user = m.user;
    const capacity = user?.working_hours_per_week || 40.0;
    const entries = db.timeEntries.filter((e) => e.user_id === m.user_id && e.ended_at !== null);
    const totalHours = entries.reduce((acc, e) => acc + e.duration_seconds, 0) / 3600.0;
    const billableHours = entries.filter((e) => e.billable).reduce((acc, e) => acc + e.duration_seconds, 0) / 3600.0;
    const utilization = Math.min(150, Math.round((totalHours / capacity) * 100));

    return {
      userId: m.user_id,
      fullName: user?.full_name || 'Team Member',
      role: m.role,
      weeklyCapacity: capacity,
      totalHours: Math.round(totalHours * 10) / 10,
      billableHours: Math.round(billableHours * 10) / 10,
      utilizationPercent: utilization
    };
  });

  return c.json(rows);
});

// Export CSV
reportRouter.get('/export/csv', requirePermission('reports:export'), async (c) => {
  const auth = c.get('auth');
  const isClient = auth.workspaceRole === 'client';
  const entries = db.getTimeEntries(auth.workspaceId);

  const headers = isClient
    ? ['ID', 'Date', 'Project', 'Task Key', 'Task Title', 'Duration (Hours)', 'Billable']
    : ['ID', 'Date', 'User', 'Project', 'Task Key', 'Task Title', 'Duration (Hours)', 'Billable', 'Bill Rate', 'Cost Rate', 'Note'];

  const rows = entries.map((e) => {
    const hrs = (e.duration_seconds / 3600.0).toFixed(2);
    const date = e.started_at.slice(0, 10);
    if (isClient) {
      return [e.id, date, e.project?.name || '', e.task?.key || '', `"${(e.task?.title || '').replace(/"/g, '""')}"`, hrs, e.billable ? 'Yes' : 'No'];
    }
    return [
      e.id,
      date,
      `"${e.user?.full_name || ''}"`,
      `"${e.project?.name || ''}"`,
      e.task?.key || '',
      `"${(e.task?.title || '').replace(/"/g, '""')}"`,
      hrs,
      e.billable ? 'Yes' : 'No',
      e.hourly_rate_snapshot,
      e.cost_rate_snapshot,
      `"${(e.note || '').replace(/"/g, '""')}"`
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', 'attachment; filename="webbarracks-time-report.csv"');
  return c.text(csv);
});
