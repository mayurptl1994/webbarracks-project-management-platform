import { store } from '../core/store.js';
import { apiRequest } from '../core/api.js';
import { captureManager } from '../core/capture.js';

let timerInterval = null;

export function renderTopbar() {
  const topbar = document.createElement('header');
  topbar.className = 'app-topbar';

  topbar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <button id="btn-toggle-sidebar" class="btn btn-secondary btn-icon" style="display: none;" aria-label="Toggle Navigation">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      <!-- Global Sticky Timer Bar -->
      <div id="global-timer-bar" class="topbar-timer-widget">
        <div id="timer-dot" class="timer-indicator-dot idle"></div>
        <span id="timer-clock" class="timer-clock">00:00:00</span>
        <span id="timer-label" class="timer-task-label">No timer running</span>
        <button id="btn-timer-action" class="btn btn-sm btn-secondary" style="margin-left: 0.5rem;">
          Select Task
        </button>
      </div>

      <!-- Persistent Screen Capture Indicator -->
      <div id="screen-capture-badge" style="display: none; align-items: center; gap: 6px; padding: 4px 10px; background: var(--status-danger-bg); color: var(--status-danger); border-radius: 9999px; font-size: 0.75rem; font-weight: 600;">
        <span style="width: 8px; height: 8px; background: var(--status-danger); border-radius: 50%; animation: pulse 1s infinite;"></span>
        SCREEN CAPTURE ACTIVE
      </div>
    </div>

    <!-- Right Controls: Demo Role Persona Switcher & Theme Toggle -->
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <!-- Fast Role Switcher -->
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
        <span style="color: var(--text-muted); font-weight: 500;">Role:</span>
        <select id="select-demo-user" style="padding: 0.35rem 0.65rem; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-surface); font-weight: 600;">
          <option value="11111111-1111-1111-1111-111111111111">Alex Mercer (Owner)</option>
          <option value="22222222-2222-2222-2222-222222222222">Sarah Connor (Admin)</option>
          <option value="33333333-3333-3333-3333-333333333333">David Miller (Manager)</option>
          <option value="44444444-4444-4444-4444-444444444444">Elena Rostova (Dev / Member)</option>
          <option value="55555555-5555-5555-5555-555555555555">Liam Vance (Designer / Member)</option>
          <option value="66666666-6666-6666-6666-666666666666">Rachel Zane (Client)</option>
        </select>
      </div>

      <!-- Theme Switcher -->
      <button id="btn-theme-toggle" class="btn btn-secondary btn-icon" aria-label="Toggle Dark / Light Theme" title="Toggle Theme">
        <svg id="theme-icon" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
      </button>
    </div>
  `;

  // Attach event handlers
  const selectUser = topbar.querySelector('#select-demo-user');
  selectUser.addEventListener('change', async (e) => {
    const targetUserId = e.target.value;
    try {
      const res = await apiRequest('/auth/demo-switch', {
        method: 'POST',
        body: JSON.stringify({ userId: targetUserId })
      });
      store.setState('currentUser', res.user);
      store.setState('workspaceRole', res.workspaceRole);
      store.setState('effectivePermissions', res.effectivePermissions);

      // Re-fetch active timer for new user
      const timerRes = await apiRequest('/time/active');
      store.setState('activeTimer', timerRes.active);

      // Reload view
      window.location.reload();
    } catch (err) {
      alert('Failed to switch user: ' + err.message);
    }
  });

  // Sync selected user dropdown with store
  store.subscribe('currentUser', (user) => {
    if (user && selectUser) {
      selectUser.value = user.id;
    }
  });

  // Theme toggle
  const btnTheme = topbar.querySelector('#btn-theme-toggle');
  btnTheme.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('wb_theme', nextTheme);
    store.setState('theme', nextTheme);
  });

  // Timer button action
  const btnTimerAction = topbar.querySelector('#btn-timer-action');
  btnTimerAction.addEventListener('click', async () => {
    const active = store.getState('activeTimer');
    if (active) {
      // Stop timer
      try {
        await apiRequest('/time/stop', { method: 'POST' });
        store.setState('activeTimer', null);
        captureManager.stopCapture();
      } catch (err) {
        alert('Failed to stop timer: ' + err.message);
      }
    } else {
      // Open board or quick task picker
      window.location.pathname = '/board';
    }
  });

  // Update timer display
  store.subscribe('activeTimer', (active) => {
    const clockEl = topbar.querySelector('#timer-clock');
    const labelEl = topbar.querySelector('#timer-label');
    const dotEl = topbar.querySelector('#timer-dot');
    const badgeEl = topbar.querySelector('#screen-capture-badge');

    if (active) {
      dotEl.className = 'timer-indicator-dot';
      labelEl.textContent = active.task?.title || active.task?.key || 'Active Task';
      btnTimerAction.textContent = 'Stop Timer';
      btnTimerAction.className = 'btn btn-sm btn-danger';
      badgeEl.style.display = 'flex';

      // Start elapsed ticker
      clearInterval(timerInterval);
      const started = new Date(active.started_at).getTime();

      const updateTicker = () => {
        const diffSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
        const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(diffSeconds % 60).padStart(2, '0');
        clockEl.textContent = `${hrs}:${mins}:${secs}`;
      };

      updateTicker();
      timerInterval = setInterval(updateTicker, 1000);

      // Trigger web screen capture if not already running
      captureManager.startCapture();
    } else {
      clearInterval(timerInterval);
      dotEl.className = 'timer-indicator-dot idle';
      clockEl.textContent = '00:00:00';
      labelEl.textContent = 'No timer running';
      btnTimerAction.textContent = 'Select Task';
      btnTimerAction.className = 'btn btn-sm btn-secondary';
      badgeEl.style.display = 'none';
      captureManager.stopCapture();
    }
  });

  return topbar;
}
