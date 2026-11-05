import './styles/tokens.css';
import 'filepond/dist/filepond.min.css';
import { store } from './core/store.js';
import { apiRequest } from './core/api.js';
import { router } from './core/router.js';
import { wsClient } from './core/ws.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';

// Views
import { renderAdminDashboardView } from './views/admin-dashboard.js';
import { renderUserDashboardView } from './views/user-dashboard.js';
import { renderUsersView } from './views/users.js';
import { renderTrackingView } from './views/tracking.js';
import { renderScreenshotsView } from './views/screenshots.js';
import { renderCatalogView } from './views/catalog.js';
import { renderAuditView } from './views/audit.js';
import { renderReportsView } from './views/reports.js';
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
    const activeRes = await apiRequest('/tracking/active', {
      headers: { 'x-user-id': res.user.id }
    });
    store.setState('activeSession', activeRes.active);

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

    // Register Routes
    router.setContainer(content);

    const defaultDashboard = res.user.role === 'admin' ? renderAdminDashboardView : renderUserDashboardView;

    router.register('/', defaultDashboard);
    router.register('/users', renderUsersView);
    router.register('/tracking', renderTrackingView);
    router.register('/screenshots', renderScreenshotsView);
    router.register('/catalog', renderCatalogView);
    router.register('/audit-logs', renderAuditView);
    router.register('/reports', renderReportsView);

    // Navigate to current URL
    router.resolve();
  } catch (err) {
    console.warn('Authentication required or session expired:', err);
    renderLoginView(app);
  }
}

bootstrap();
