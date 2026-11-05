import './styles/tokens.css';
import { store } from './core/store.js';
import { apiRequest } from './core/api.js';
import { router } from './core/router.js';
import { wsClient } from './core/ws.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';

// Views
import { renderDashboardView } from './views/dashboard.js';
import { renderProjectsView } from './views/projects.js';
import { renderBoardView } from './views/board.js';
import { renderTasksListView } from './views/tasks.js';
import { renderTimesheetsView } from './views/timesheets.js';
import { renderTimeEntriesView } from './views/time-entries.js';
import { renderScreenshotsView } from './views/screenshots.js';
import { renderReportsView } from './views/reports.js';
import { renderTeamView } from './views/team.js';
import { renderSettingsView } from './views/settings.js';
import { renderAuditView } from './views/audit.js';

async function bootstrap() {
  const app = document.getElementById('app');

  // Set theme from store
  const savedTheme = store.getState('theme');
  document.documentElement.setAttribute('data-theme', savedTheme);

  try {
    // 1. Fetch current session & user data
    const session = await apiRequest('/auth/session');
    store.setState('currentUser', session.user);
    store.setState('workspace', session.workspace);
    store.setState('workspaceRole', session.workspaceRole);
    store.setState('effectivePermissions', session.effectivePermissions);

    // 2. Fetch active running timer (restores on reload/tab open)
    const timerRes = await apiRequest('/time/active');
    store.setState('activeTimer', timerRes.active);

    // 3. Connect live WebSockets
    wsClient.connect();

    // 4. Assemble Shell UI
    app.innerHTML = '';
    const sidebar = renderSidebar();
    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'app-main';

    const topbar = renderTopbar();
    const content = document.createElement('main');
    content.className = 'app-content';

    mainWrapper.appendChild(topbar);
    mainWrapper.appendChild(content);

    app.appendChild(sidebar);
    app.appendChild(mainWrapper);

    // 5. Register Routes
    router.setContainer(content);
    router.register('/', renderDashboardView);
    router.register('/projects', renderProjectsView);
    router.register('/board', renderBoardView);
    router.register('/tasks', renderTasksListView);
    router.register('/timesheets', renderTimesheetsView);
    router.register('/time-entries', renderTimeEntriesView);
    router.register('/screenshots', renderScreenshotsView);
    router.register('/reports', renderReportsView);
    router.register('/team', renderTeamView);
    router.register('/settings', renderSettingsView);
    router.register('/audit-logs', renderAuditView);

    // Initial navigation
    router.resolve();
  } catch (err) {
    console.error('Bootstrap error:', err);
    app.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-app); padding: 2rem;">
        <div class="card" style="max-width: 500px; text-align: center; padding: 2.5rem;">
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--status-danger);">Connecting to Local API Server...</h2>
          <p style="margin-top: 0.75rem; color: var(--text-muted); font-size: 0.875rem;">
            Make sure the API server is running on port 3001.
          </p>
          <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="window.location.reload()">Retry Connection</button>
        </div>
      </div>
    `;
  }
}

// Start
bootstrap();
