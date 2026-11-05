import { store } from '../core/store.js';

export function renderSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'wb-sidebar';

  const user = store.getState('currentUser');
  const isAdmin = user?.role === 'admin';
  const currentPath = window.location.pathname;

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

    <!-- Navigation List (Left Base Scrollable) -->
    <nav class="sidebar-nav">
      <div class="sidebar-group-title">CORE WORKSPACE</div>

      <!-- Dashboard -->
      <a href="/" data-link class="sidebar-item ${currentPath === '/' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          <span>Dashboard</span>
        </div>
      </a>

      <!-- Projects (Collapsible with user requested chevron) -->
      <div class="sidebar-item ${currentPath.startsWith('/projects') ? 'active' : ''}" id="menu-projects-toggle">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          <span>Projects</span>
        </div>
        <span id="projects-arrow-wrapper">
          <svg class="dropdown-chevron expanded" id="projects-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
      </div>

      <div class="sidebar-submenu" id="submenu-projects" style="display: flex;">
        <a href="/projects" data-link class="sidebar-subitem ${currentPath === '/projects' ? 'active' : ''}">
          <span>•</span> All Projects
        </a>
        <a href="/board?projectId=proj-1" data-link class="sidebar-subitem">
          <span>•</span> Cloud Infrastructure
        </a>
        <a href="/board?projectId=proj-2" data-link class="sidebar-subitem">
          <span>•</span> Client Portal V2
        </a>
        <a href="/board?projectId=proj-3" data-link class="sidebar-subitem">
          <span>•</span> Mobile Companion
        </a>
      </div>

      <!-- Kanban Board -->
      <a href="/board" data-link class="sidebar-item ${currentPath === '/board' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
          <span>Kanban Board</span>
        </div>
        ${chevronSvg}
      </a>

      <!-- Tasks & Backlog -->
      <a href="/tasks" data-link class="sidebar-item ${currentPath === '/tasks' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          <span>Tasks & Backlog</span>
        </div>
        ${chevronSvg}
      </a>

      <div class="sidebar-group-title">TIME & MONITORING</div>

      <!-- Task Timer Console -->
      <a href="/tracking" data-link class="sidebar-item ${currentPath === '/tracking' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Task Timer Console</span>
        </div>
      </a>

      <!-- Weekly Timesheets -->
      <a href="/timesheets" data-link class="sidebar-item ${currentPath === '/timesheets' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>Timesheets & Approvals</span>
        </div>
        ${chevronSvg}
      </a>

      <!-- Screen Monitor Gallery -->
      <a href="/screenshots" data-link class="sidebar-item ${currentPath === '/screenshots' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Screen Monitor</span>
        </div>
      </a>

      <!-- Manual Time Log -->
      <a href="/time-entries" data-link class="sidebar-item ${currentPath === '/time-entries' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          <span>Manual Time Log</span>
        </div>
      </a>

      <div class="sidebar-group-title">TEAM & GOVERNANCE</div>

      <!-- Project Reports -->
      <a href="/reports" data-link class="sidebar-item ${currentPath === '/reports' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <span>Project Reports</span>
        </div>
        ${chevronSvg}
      </a>

      <!-- Team Members -->
      <a href="/team" data-link class="sidebar-item ${currentPath === '/team' ? 'active' : ''}">
        <div class="sidebar-item-left">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          <span>Team Directory</span>
        </div>
        ${chevronSvg}
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
          ${chevronSvg}
        </a>

        <!-- Audit Logs -->
        <a href="/audit-logs" data-link class="sidebar-item ${currentPath === '/audit-logs' ? 'active' : ''}">
          <div class="sidebar-item-left">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>System Audit Trail</span>
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
            ${user?.full_name || 'WebBarracks Super Admin'}
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

  // Accordion toggle with smooth rotation of user requested chevron
  const projectsToggle = sidebar.querySelector('#menu-projects-toggle');
  const submenuProjects = sidebar.querySelector('#submenu-projects');
  const projectsArrow = sidebar.querySelector('#projects-arrow');

  projectsToggle?.addEventListener('click', () => {
    const isHidden = submenuProjects.style.display === 'none';
    submenuProjects.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      projectsArrow.classList.add('expanded');
    } else {
      projectsArrow.classList.remove('expanded');
    }
  });

  // Logout action
  sidebar.querySelector('#sidebar-logout-btn')?.addEventListener('click', async () => {
    store.setState('currentUser', null);
    localStorage.removeItem('wb_user_id');
    window.location.reload();
  });

  return sidebar;
}
