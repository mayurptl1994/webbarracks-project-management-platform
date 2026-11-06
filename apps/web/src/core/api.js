import { store } from './store.js';
import { localDb } from './local-db.js';

/**
 * Universal Client-Side API Router powered by Local Browser Database
 * Persists 100% of data to browser localStorage without needing any backend server.
 */
export async function apiRequest(endpoint, options = {}) {
  // Simulate standard micro-tick for natural async UI lifecycle
  await new Promise((resolve) => setTimeout(resolve, 15));

  const method = (options.method || 'GET').toUpperCase();
  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch {
      body = options.body;
    }
  }

  // Normalize endpoint URL (strip query string for routing, extract query params)
  const [pathname, queryString] = endpoint.replace(/^\/api/, '').split('?');
  const queryParams = new URLSearchParams(queryString || '');

  // 1. Auth routes
  if (pathname === '/auth/me') {
    const user = localDb.getCurrentUser();
    return { user };
  }

  if (pathname === '/auth/login') {
    const user = localDb.getCurrentUser();
    return { user, token: 'local-browser-session-token' };
  }

  if (pathname === '/auth/users' || pathname === '/users') {
    if (method === 'GET') {
      return localDb.getUsers();
    }
    if (method === 'POST') {
      return localDb.createUser(body);
    }
  }

  const userMatch = pathname.match(/^\/users\/([^/]+)$/);
  if (userMatch) {
    const id = userMatch[1];
    if (method === 'PUT' || method === 'PATCH') {
      return localDb.updateUser(id, body);
    }
    if (method === 'DELETE') {
      return localDb.deleteUser(id);
    }
  }

  // 2. Clients routes
  if (pathname === '/clients') {
    if (method === 'GET') {
      return localDb.getClients();
    }
    if (method === 'POST') {
      return localDb.createClient(body);
    }
  }

  const clientMatch = pathname.match(/^\/clients\/([^/]+)$/);
  if (clientMatch) {
    const id = clientMatch[1];
    if (method === 'GET') {
      const client = localDb.getClientById(id);
      if (!client) throw new Error('Client not found');
      return client;
    }
    if (method === 'PUT' || method === 'PATCH') {
      return localDb.updateClient(id, body);
    }
    if (method === 'DELETE') {
      return localDb.deleteClient(id);
    }
  }

  // 3. Time entries routes
  if (pathname === '/time-entries') {
    if (method === 'GET') {
      return localDb.getTimeEntries();
    }
    if (method === 'POST') {
      const newEntry = localDb.createTimeEntry(body);
      return newEntry;
    }
  }

  const entryMatch = pathname.match(/^\/time-entries\/([^/]+)$/);
  if (entryMatch) {
    const id = entryMatch[1];
    if (method === 'PUT' || method === 'PATCH') {
      return localDb.updateTimeEntry(id, body);
    }
    if (method === 'DELETE') {
      return localDb.deleteTimeEntry(id);
    }
  }

  // 4. Tracking & Active Timer routes
  if (pathname === '/tracking/active') {
    const active = localDb.getActiveTimer();
    return { active };
  }

  if (pathname === '/tracking/start') {
    const res = localDb.startTimer(body);
    store.setState('activeSession', res.session);
    store.setState('activeTimer', res.session);
    return res;
  }

  if (pathname === '/tracking/stop') {
    const res = localDb.stopTimer();
    store.setState('activeSession', null);
    store.setState('activeTimer', null);
    return res;
  }

  if (pathname === '/tracking/live') {
    return localDb.getLiveTelemetry();
  }

  if (pathname === '/tracking/screenshots') {
    return localDb.getScreenshots();
  }

  const screenshotMatch = pathname.match(/^\/tracking\/screenshots\/([^/]+)$/);
  if (screenshotMatch && method === 'DELETE') {
    return localDb.deleteScreenshot(screenshotMatch[1]);
  }

  if (pathname === '/screenshots/upload') {
    return { success: true, url: '' };
  }

  // 5. Tasks & Kanban routes
  if (pathname === '/tasks') {
    if (method === 'GET') {
      return localDb.getTasks();
    }
    if (method === 'POST') {
      return localDb.createTask(body);
    }
  }

  const taskStatusMatch = pathname.match(/^\/tasks\/([^/]+)\/status$/);
  if (taskStatusMatch && (method === 'PUT' || method === 'PATCH')) {
    return localDb.updateTaskStatus(taskStatusMatch[1], body.status);
  }

  const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const id = taskMatch[1];
    if (method === 'GET') {
      const task = localDb.getTasks().find((t) => t.id === id);
      return task || {};
    }
    if (method === 'PUT' || method === 'PATCH') {
      return localDb.updateTask(id, body);
    }
    if (method === 'DELETE') {
      return localDb.deleteTask(id);
    }
  }

  // 6. Projects routes
  if (pathname === '/projects') {
    if (method === 'GET') {
      return localDb.getProjects();
    }
    if (method === 'POST') {
      return localDb.createProject(body);
    }
  }

  // 7. Dashboard stats & summary
  if (pathname === '/dashboard/stats') {
    return localDb.getDashboardStats();
  }

  if (pathname === '/dashboard/summary') {
    return localDb.getDashboardSummary();
  }

  // 8. Reports summary & export
  if (pathname === '/reports/summary') {
    return localDb.getReportsSummary();
  }

  if (pathname === '/reports/export/csv') {
    return localDb.exportCsv();
  }

  // 9. Timesheets routes
  if (pathname === '/timesheets/grid') {
    const periodStart = queryParams.get('periodStart');
    return localDb.getTimesheetsGrid(periodStart);
  }

  if (pathname === '/timesheets/submit') {
    return localDb.submitTimesheet(body?.periodStart);
  }

  if (pathname === '/timesheets/approve') {
    return localDb.approveTimesheet(body?.periodStart);
  }

  // 10. Audit logs
  if (pathname === '/audit-logs') {
    return localDb.getAuditLogs();
  }

  // Fallback for unknown routes
  console.warn(`[LocalDB] Unhandled local endpoint: ${method} ${endpoint}`);
  return {};
}
