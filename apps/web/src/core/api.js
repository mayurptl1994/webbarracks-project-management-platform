import { store } from './store.js';
import { localDb } from './local-db.js';

/**
 * Universal Client-Side API Router powered by Local Browser Database
 * Persists 100% of data to browser localStorage without needing any backend server.
 */
export async function apiRequest(endpoint, options = {}) {
  // Simulate micro-tick for natural async lifecycle
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

  // Normalize endpoint URL
  const [pathname] = endpoint.replace(/^\/api/, '').split('?');

  // 1. Auth routes
  if (pathname === '/auth/me' || pathname === '/auth/login') {
    const user = localDb.getCurrentUser();
    return { user, token: 'local-browser-session-token' };
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
      return localDb.createTimeEntry(body);
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

  // 5. Dashboard stats & summary
  if (pathname === '/dashboard/stats') {
    return localDb.getDashboardStats();
  }

  if (pathname === '/dashboard/summary') {
    return localDb.getDashboardSummary();
  }

  // 6. Reports summary & export
  if (pathname === '/reports/summary') {
    return localDb.getReportsSummary();
  }

  if (pathname === '/reports/export/csv') {
    return localDb.exportCsv();
  }

  // 7. Audit logs
  if (pathname === '/audit-logs') {
    return localDb.getAuditLogs();
  }

  // Fallback for unknown routes
  return {};
}
