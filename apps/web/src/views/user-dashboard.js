import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { renderTrackingView } from './tracking.js';

export async function renderUserDashboardView(container) {
  const user = store.getState('currentUser');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Welcome Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">User Workspace</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Welcome back, <strong style="color: var(--text-primary);">${user?.full_name}</strong>. Manage your authorized tracking points and project sessions.
          </p>
        </div>

        <a href="/tracking" data-link class="btn-wb-primary">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Open Full Tracking Console</span>
        </a>
      </div>

      <!-- User Profile & Target Stats -->
      <div class="grid-4-cols">
        <div class="wb-stat-card">
          <div class="wb-stat-label">ACCOUNT STATUS</div>
          <div class="wb-stat-value" style="font-size: 1.35rem; color: #10b981;">Active</div>
          <div class="wb-stat-subtext">Provisioned by Administrator</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">ASSIGNED TARGETS</div>
          <div class="wb-stat-value">${user?.assigned_targets?.length || 2}</div>
          <div class="wb-stat-subtext">Authorized project points</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">MONITORING POLICY</div>
          <div class="wb-stat-value" style="font-size: 1.35rem;">Transparent</div>
          <div class="wb-stat-subtext">User-authorized background capture</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">CAPTURE INTERVAL</div>
          <div class="wb-stat-value">${user?.tracking_permissions?.screenshot_interval_minutes || 5}m</div>
          <div class="wb-stat-subtext">Per active session</div>
        </div>
      </div>

      <!-- Quick Tracking Console embedded -->
      <div id="user-tracking-embed">
        <!-- Render tracking view embedded -->
      </div>
    </div>
  `;

  const embedContainer = container.querySelector('#user-tracking-embed');
  await renderTrackingView(embedContainer);
}

