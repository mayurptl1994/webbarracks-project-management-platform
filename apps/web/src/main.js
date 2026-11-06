import './styles/tokens.css';
import { store } from './core/store.js';
import { apiRequest } from './core/api.js';
import { router } from './core/router.js';
import { wsClient } from './core/ws.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';
import { createTrackerBar } from './components/tracker-bar.js';

// Clean, Focused Views
import { renderAdminDashboardView } from './views/admin-dashboard.js';
import { renderUserDashboardView } from './views/user-dashboard.js';
import { renderClientsView } from './views/clients.js';
import { renderTrackingView } from './views/tracking.js';
import { renderReportsView } from './views/reports.js';
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

    // Assemble Shell Layout
    app.innerHTML = '';
    const sidebar = renderSidebar();

    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'wb-main';

    const topbar = renderTopbar();

    // Persistent Sticky Time Tracker Header (visible across all views)
    const stickyHeader = document.createElement('div');
    stickyHeader.className = 'wb-sticky-tracker-header';
    stickyHeader.id = 'sticky-tracker-header';

    const trackerInstance = createTrackerBar({
      onEntryLogged: (entry) => {
        window.dispatchEvent(new CustomEvent('wb-entry-logged', { detail: { entry } }));
      }
    });
    stickyHeader.appendChild(trackerInstance.element);

    const content = document.createElement('main');
    content.className = 'wb-content';

    mainWrapper.appendChild(topbar);
    mainWrapper.appendChild(stickyHeader);
    mainWrapper.appendChild(content);

    app.appendChild(sidebar);
    app.appendChild(mainWrapper);

    // Register Routes for Core Time Tracking & Client Management
    router.setContainer(content);

    const defaultDashboard = res.user.role === 'admin' ? renderAdminDashboardView : renderUserDashboardView;

    router.register('/', defaultDashboard);
    router.register('/clients', renderClientsView);
    router.register('/tracking', renderTrackingView);
    router.register('/reports', renderReportsView);
    router.register('/audit-logs', renderAuditView);

    // Navigate to current URL
    router.resolve();
  } catch (err) {
    console.warn('Authentication required or session expired:', err);
    renderLoginView(app);
  }
}

bootstrap();
