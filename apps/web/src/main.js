import './styles/tokens.css';
import 'filepond/dist/filepond.min.css';
import { store } from './core/store.js';
import { apiRequest } from './core/api.js';
import { router } from './core/router.js';
import { wsClient } from './core/ws.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';

// Project Management & Time Tracking Views
import { renderAdminDashboardView } from './views/admin-dashboard.js';
import { renderUserDashboardView } from './views/user-dashboard.js';
import { renderClientsView } from './views/clients.js';
import { renderProjectsView } from './views/projects.js';
import { renderBoardView } from './views/board.js';
import { renderTasksView } from './views/tasks.js';
import { renderTrackingView } from './views/tracking.js';
import { renderTimesheetsView } from './views/timesheets.js';
import { renderTimeEntriesView } from './views/time-entries.js';
import { renderScreenshotsView } from './views/screenshots.js';
import { renderReportsView } from './views/reports.js';
import { renderTeamView } from './views/team.js';
import { renderUsersView } from './views/users.js';
import { renderAuditView } from './views/audit.js';
import { renderLoginView } from './views/login.js';

async function bootstrap() {
  const app = document.getElementById('app');

  // Check saved login or default to primary admin
  const savedUserId = localStorage.getItem('wb_user_id') || 'user-admin-1';

  try {
    const res = await apiRequest('/auth/me', {
      headers: { 'x-user-id': savedUserId }
    });
    store.setState('currentUser', res.user);

    // Fetch active session if any
    try {
      const activeRes = await apiRequest('/tracking/active', {
        headers: { 'x-user-id': res.user.id }
      });
      store.setState('activeSession', activeRes.active);
    } catch {
      store.setState('activeSession', null);
    }

    // Connect WebSocket
    wsClient.connect();

    // Assemble Shell Layout matching reference screenshot
    app.innerHTML = '';
    const sidebar = renderSidebar();

    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'wb-main';

    const topbar = renderTopbar();
    const content = document.createElement('main');
    content.className = 'wb-content';

    mainWrapper.appendChild(topbar);
    mainWrapper.appendChild(content);

    app.appendChild(sidebar);
    app.appendChild(mainWrapper);

    // Register Routes for Complete Project Management & Time Tracking
    router.setContainer(content);

    const defaultDashboard = res.user.role === 'admin' ? renderAdminDashboardView : renderUserDashboardView;

    router.register('/', defaultDashboard);
    router.register('/clients', renderClientsView);
    router.register('/projects', renderClientsView);
    router.register('/board', renderBoardView);
    router.register('/tasks', renderTasksView);
    router.register('/tracking', renderTrackingView);
    router.register('/timesheets', renderTimesheetsView);
    router.register('/time-entries', renderTimeEntriesView);
    router.register('/screenshots', renderScreenshotsView);
    router.register('/reports', renderReportsView);
    router.register('/team', renderTeamView);
    router.register('/users', renderUsersView);
    router.register('/audit-logs', renderAuditView);

    // Navigate to current URL
    router.resolve();
  } catch (err) {
    console.warn('Authentication required or session expired:', err);
    renderLoginView(app);
  }
}

bootstrap();
