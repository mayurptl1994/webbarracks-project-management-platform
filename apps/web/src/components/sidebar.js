import { store } from '../core/store.js';

export function renderSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'wb-sidebar';

  const currentPath = window.location.hash ? window.location.hash.replace(/^#/, '') : window.location.pathname;

  const chevronSvg = `
    <svg class="dropdown-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;

  sidebar.innerHTML = `
    <!-- Top Brand Header -->
    <div class="sidebar-header">
      <div class="sidebar-logo-group">
        <div class="sidebar-logo-icon">w</div>
        <div class="sidebar-logo-text">Web Barracks</div>
        <span class="sidebar-badge-pro">PRO</span>
      </div>
      <button class="sidebar-toggle-btn" title="Toggle Sidebar">&lt;</button>
    </div>

    <!-- Navigation List -->
    <nav class="sidebar-nav">
      <div class="sidebar-group-title">CORE WORKSPACE</div>

      <!-- Dashboard -->
      <a href="/" data-link class="sidebar-item ${currentPath === '/' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          <span>Dashboard</span>
        </div>
      </a>

      <!-- Clients (With hourly rates & currency) -->
      <a href="/clients" data-link class="sidebar-item ${currentPath.startsWith('/clients') ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          <span>Clients</span>
        </div>
        ${chevronSvg}
      </a>

      <div class="sidebar-group-title">TIME &amp; TRACKING</div>

      <!-- Time Tracker Console -->
      <a href="/tracking" data-link class="sidebar-item ${currentPath === '/tracking' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Time Tracker</span>
        </div>
      </a>

      <div class="sidebar-group-title">REPORTS &amp; GOVERNANCE</div>

      <!-- Billing Reports -->
      <a href="/reports" data-link class="sidebar-item ${currentPath === '/reports' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <span>Billing Reports</span>
        </div>
        ${chevronSvg}
      </a>

      <!-- System Audit Trail -->
      <a href="/audit-logs" data-link class="sidebar-item ${currentPath === '/audit-logs' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>System Audit Trail</span>
        </div>
      </a>
    </nav>
  `;

  // Handle collapsible sidebar toggle
  const toggleBtn = sidebar.querySelector('.sidebar-toggle-btn');
  toggleBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed');
  });

  return sidebar;
}
