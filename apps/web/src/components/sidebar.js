import { store } from '../core/store.js';

export function renderSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'app-sidebar';

  const role = store.getState('workspaceRole') || 'owner';
  const isClient = role === 'client';
  const isAdminOrOwner = ['owner', 'admin'].includes(role);
  const isManagerOrAbove = ['owner', 'admin', 'manager'].includes(role);

  sidebar.innerHTML = `
    <!-- Brand / Workspace Header -->
    <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 0.75rem;">
      <div style="width: 32px; height: 32px; background: var(--text-primary); color: var(--text-inverse); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem;">
        W
      </div>
      <div>
        <div style="font-weight: 700; font-size: 0.9375rem; letter-spacing: -0.01em;">Webbarracks</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Acme Technologies</div>
      </div>
    </div>

    <!-- Navigation Links -->
    <nav style="padding: 1rem 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; flex: 1; overflow-y: auto;">
      <a href="/" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
        <span>Dashboard</span>
      </a>

      <a href="/projects" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
        <span>Projects</span>
      </a>

      <a href="/board" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
        <span>Kanban Board</span>
      </a>

      <a href="/tasks" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
        <span>Tasks List</span>
      </a>

      <!-- Time & Timesheets (Clients only see summary, not tracking) -->
      ${
        !isClient
          ? `
        <div style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem 0.75rem 0.25rem;">
          Time & Attendance
        </div>

        <a href="/timesheets" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>Timesheets</span>
        </a>

        <a href="/time-entries" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Time Entries</span>
        </a>
      `
          : ''
      }

      <!-- Screenshots: NEVER RENDERED FOR CLIENTS -->
      ${
        !isClient
          ? `
        <a href="/screenshots" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>Screenshots</span>
        </a>
      `
          : ''
      }

      <div style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem 0.75rem 0.25rem;">
        Analytics & Admin
      </div>

      <a href="/reports" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
        <span>Reports Hub</span>
      </a>

      <!-- Management sections -->
      ${
        isManagerOrAbove
          ? `
        <a href="/team" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          <span>Team & Roles</span>
        </a>
      `
          : ''
      }

      ${
        isAdminOrOwner
          ? `
        <a href="/audit-logs" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>Audit Log</span>
        </a>

        <a href="/settings" data-link class="nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 500; color: var(--text-secondary);">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Settings</span>
        </a>
      `
          : ''
      }
    </nav>

    <!-- User Profile Footer -->
    <div style="padding: 1rem 1.25rem; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 0.75rem;">
      <div style="width: 34px; height: 34px; border-radius: 50%; background: var(--bg-muted); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem;">
        ${role.slice(0, 2).toUpperCase()}
      </div>
      <div style="overflow: hidden;">
        <div id="sidebar-user-name" style="font-size: 0.8125rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${store.getState('currentUser')?.full_name || 'Active User'}
        </div>
        <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: capitalize;">
          ${role}
        </div>
      </div>
    </div>
  `;

  return sidebar;
}
