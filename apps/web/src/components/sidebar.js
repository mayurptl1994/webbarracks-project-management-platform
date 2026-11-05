import { store } from '../core/store.js';

export function renderSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'wb-sidebar';

  const user = store.getState('currentUser');
  const isAdmin = user?.role === 'admin';
  const currentPath = window.location.pathname;

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
      <div class="sidebar-group-title">CORE OPERATIONS</div>

      <a href="/" data-link class="sidebar-item ${currentPath === '/' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          <span>Dashboard</span>
        </div>
      </a>

      <!-- Website CMS Accordion matching screenshot -->
      <div class="sidebar-item" id="menu-cms-toggle">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          <span>Website CMS</span>
        </div>
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" id="cms-chevron"><path d="M19 9l-7 7-7-7"/></svg>
      </div>

      <div class="sidebar-submenu" id="submenu-cms">
        <div class="sidebar-subitem" data-action="pages">Pages</div>
        <div class="sidebar-subitem" data-action="page-content">Page Content</div>
        <div class="sidebar-subitem" data-action="team-services">Team & Services Catalog</div>
        <div class="sidebar-subitem" data-action="contact">Contact & Locations</div>
        <div class="sidebar-subitem" data-action="header-nav">Header & Navigation</div>
        <div class="sidebar-subitem" data-action="footer">Footer</div>
        <div class="sidebar-subitem" data-action="media">Media Library</div>
      </div>

      <div class="sidebar-item">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <span>SEO Management</span>
        </div>
        <span>&gt;</span>
      </div>

      <div class="sidebar-item">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>Portfolio</span>
        </div>
        <span>&gt;</span>
      </div>

      <a href="/catalog" data-link class="sidebar-item ${currentPath === '/catalog' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          <span>Products & Store</span>
        </div>
        <span>&gt;</span>
      </a>

      <div class="sidebar-item">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          <span>Feedback & Reviews</span>
        </div>
        <span>&gt;</span>
      </div>

      <div class="sidebar-group-title">COMMERCE & SALES</div>

      <div class="sidebar-item">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          <span>Sales & Orders</span>
        </div>
        <span>&gt;</span>
      </div>

      <div class="sidebar-item">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>Subscriptions</span>
        </div>
        <span>&gt;</span>
      </div>

      <div class="sidebar-item">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          <span>Payments & Gateway</span>
        </div>
        <span>&gt;</span>
      </div>

      <a href="/reports" data-link class="sidebar-item ${currentPath === '/reports' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <span>Reports & Analytics</span>
        </div>
        <span>&gt;</span>
      </a>

      <div class="sidebar-group-title">TRACKING & CONTROLS</div>

      <!-- Tracking Workspace -->
      <a href="/tracking" data-link class="sidebar-item ${currentPath === '/tracking' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Tracking Sessions</span>
        </div>
      </a>

      <!-- Screenshots Gallery -->
      <a href="/screenshots" data-link class="sidebar-item ${currentPath === '/screenshots' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Screen Monitor</span>
        </div>
      </a>

      ${
        isAdmin
          ? `
        <!-- User Management (Admin Only) -->
        <a href="/users" data-link class="sidebar-item ${currentPath === '/users' ? 'active' : ''}">
          <div class="sidebar-item-left">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            <span>User Management</span>
          </div>
        </a>

        <!-- Audit Logs -->
        <a href="/audit-logs" data-link class="sidebar-item ${currentPath === '/audit-logs' ? 'active' : ''}">
          <div class="sidebar-item-left">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>Audit Logs</span>
          </div>
        </a>
      `
          : ''
      }
    </nav>

    <!-- User Profile Footer matching Reference -->
    <div class="sidebar-footer">
      <div style="display: flex; align-items: center; gap: 0.65rem; overflow: hidden;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #27272a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem;">
          ${user?.full_name?.charAt(0) || 'W'}
        </div>
        <div style="overflow: hidden;">
          <div style="font-size: 0.8125rem; font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">
            ${user?.full_name || 'WebBarracs Super Admin'}
          </div>
          <div style="font-size: 0.6875rem; color: #64748b; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
            ${user?.role === 'admin' ? 'SUPER ADMIN' : 'REGULAR USER'}
          </div>
        </div>
      </div>
      <button id="sidebar-logout-btn" style="background: transparent; border: none; color: #64748b; cursor: pointer; padding: 4px;" title="Sign Out">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
      </button>
    </div>
  `;

  // Accordion toggle
  const cmsToggle = sidebar.querySelector('#menu-cms-toggle');
  const submenuCms = sidebar.querySelector('#submenu-cms');
  const chevron = sidebar.querySelector('#cms-chevron');
  cmsToggle?.addEventListener('click', () => {
    const isHidden = submenuCms.style.display === 'none';
    submenuCms.style.display = isHidden ? 'flex' : 'none';
    chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
  });

  // Logout action
  sidebar.querySelector('#sidebar-logout-btn')?.addEventListener('click', async () => {
    store.setState('currentUser', null);
    localStorage.removeItem('wb_user_id');
    window.location.reload();
  });

  return sidebar;
}
