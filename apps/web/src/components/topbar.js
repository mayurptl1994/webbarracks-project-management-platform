import { store } from '../core/store.js';
import { apiRequest } from '../core/api.js';

export function renderTopbar() {
  const topbar = document.createElement('header');
  topbar.className = 'wb-topbar';

  const user = store.getState('currentUser');
  const isAdmin = user?.role === 'admin';
  const roleLabel = isAdmin ? 'Admin' : 'User';

  topbar.innerHTML = `
    <!-- Left Breadcrumbs matching reference -->
    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
      <span style="color: var(--text-muted); font-weight: 500;">${roleLabel}</span>
      <span style="color: var(--border-strong);">/</span>
      <span id="topbar-current-page" style="color: var(--text-primary); font-weight: 600;">Dashboard</span>
    </div>

    <!-- Active Monitoring Indicator Badge -->
    <div id="topbar-monitoring-badge" style="display: none;">
      <div class="monitoring-active-pill">
        <span class="pulse-dot"></span>
        <span id="topbar-tracking-text">TRACKING &amp; MONITORING ACTIVE (00:00:00)</span>
      </div>
    </div>

    <!-- Right Controls matching reference -->
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <!-- Quick Demo Role Switcher -->
      <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; margin-right: 0.5rem;">
        <span style="color: var(--text-muted);">Switch Persona:</span>
        <select id="topbar-role-selector" style="padding: 0.25rem 0.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-surface); font-size: 0.75rem; font-weight: 600;">
          <option value="user-admin-1" ${user?.role === 'admin' ? 'selected' : ''}>Super Admin (webbarracks@gmail.com)</option>
          <option value="user-regular-1" ${user?.id === 'user-regular-1' ? 'selected' : ''}>Elena Rostova (Regular User)</option>
          <option value="user-regular-2" ${user?.id === 'user-regular-2' ? 'selected' : ''}>Alex Mercer (Regular User)</option>
        </select>
      </div>

      <!-- Production Ready Pill -->
      <div style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; color: #334155;">
        <span style="width: 7px; height: 7px; background: #10b981; border-radius: 50%;"></span>
        Production Ready
      </div>

      <!-- Timer Console Link -->
      <a href="/tracking" data-link class="btn-wb-outline" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>Timer Console</span>
      </a>

      <!-- Sign Out Button matching screenshot -->
      <button id="btn-topbar-signout" class="btn-wb-primary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">
        Sign Out
      </button>
    </div>
  `;

  // Quick Persona switcher
  const roleSelect = topbar.querySelector('#topbar-role-selector');
  roleSelect?.addEventListener('change', async (e) => {
    const targetUserId = e.target.value;
    localStorage.setItem('wb_user_id', targetUserId);
    window.location.reload();
  });

  // Sign out
  topbar.querySelector('#btn-topbar-signout')?.addEventListener('click', () => {
    localStorage.removeItem('wb_user_id');
    store.setState('currentUser', null);
    window.location.reload();
  });

  // Dynamic tracker status update
  let timerInterval = null;
  store.subscribe('activeSession', (rawSession) => {
    const session = rawSession?.session || rawSession;
    const badge = topbar.querySelector('#topbar-monitoring-badge');
    const textEl = topbar.querySelector('#topbar-tracking-text');

    if (session && (session.status === 'active' || session.id)) {
      badge.style.display = 'block';
      clearInterval(timerInterval);

      const startTimeMs = new Date(session.started_at || session.start_time_iso || Date.now()).getTime();

      const updateTicker = () => {
        const now = Date.now();
        const segment = isNaN(startTimeMs) ? 0 : Math.floor((now - startTimeMs) / 1000);
        const totalSec = Math.max(0, (session.duration_seconds || 0) + segment);

        const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const secs = String(totalSec % 60).padStart(2, '0');

        const taskTitle = session.task_name || session.task_title || 'Active Session';
        textEl.textContent = `TRACKER TICKING (${hrs}:${mins}:${secs}) • ${taskTitle}`;
      };

      updateTicker();
      timerInterval = setInterval(updateTicker, 1000);
    } else {
      clearInterval(timerInterval);
      badge.style.display = 'none';
    }
  });

  return topbar;
}
