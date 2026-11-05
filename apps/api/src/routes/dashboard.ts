import { Hono } from 'hono';
import { db } from '../db/store.js';

export const dashboardRouter = new Hono();

dashboardRouter.get('/summary', async (c) => {
  const auth = c.get('auth');
  const role = auth.workspaceRole;
  const isClient = role === 'client';
  const isMember = role === 'member';

  const now = Date.now();
  const allTimeEntries = db.timeEntries.filter((e) => e.workspace_id === auth.workspaceId);
  const activeEntries = allTimeEntries.filter((e) => e.ended_at === null);
  const projects = db.getProjects(auth.workspaceId, auth.userId, isClient);
  const tasks = db.getTasks(auth.workspaceId);

  // Time today (since midnight)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  // Active timers table for dashboard
  const activeTrackers = activeEntries.map((e) => {
    const user = db.getUserById(e.user_id);
    const task = db.getTaskById(e.task_id);
    const proj = db.getProjectById(e.project_id);
    const elapsed = Math.floor((now - new Date(e.started_at).getTime()) / 1000);
    return {
      userId: e.user_id,
      userName: user?.full_name || 'Team Member',
      avatarUrl: user?.avatar_url,
      taskId: e.task_id,
      taskKey: task?.key || '',
      taskTitle: task?.title || '',
      projectName: proj?.name || '',
      projectColor: proj?.color || '#2563eb',
      startedAt: e.started_at,
      elapsedSeconds: Math.max(0, elapsed)
    };
  });

  // Calculate metrics based on role
  let userEntries = allTimeEntries;
  if (isMember) {
    userEntries = allTimeEntries.filter((e) => e.user_id === auth.userId);
  } else if (isClient) {
    userEntries = allTimeEntries.filter((e) => e.billable && ['approved', 'submitted'].includes(e.status));
  }

  const hoursToday = userEntries
    .filter((e) => new Date(e.started_at).getTime() >= todayMs)
    .reduce((acc, e) => acc + (e.ended_at ? e.duration_seconds : Math.floor((now - new Date(e.started_at).getTime()) / 1000)), 0) / 3600.0;

  const totalTrackedHours = userEntries
    .reduce((acc, e) => acc + e.duration_seconds, 0) / 3600.0;

  const openTasksCount = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
  const pendingApprovalsCount = db.timesheets.filter((t) => t.workspace_id === auth.workspaceId && t.status === 'submitted').length;
  const screenshotsCount = isClient ? 0 : db.getScreenshots(auth.workspaceId).length;

  // Recent activity feed
  const recentActivities = db.getAuditLogs(auth.workspaceId).slice(0, 6);

  return c.json({
    role,
    metrics: {
      hoursToday: Math.round(hoursToday * 10) / 10,
      totalTrackedHours: Math.round(totalTrackedHours * 10) / 10,
      activeTrackersCount: activeTrackers.length,
      openTasksCount,
      pendingApprovalsCount,
      projectsCount: projects.length,
      screenshotsCount
    },
    activeTrackers,
    recentActivities,
    projects: projects.slice(0, 5)
  });
});

