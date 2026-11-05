import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { renderBarChart } from '../components/charts.js';

export async function renderDashboardView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Workspace Dashboard</h1>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
            Role view: <strong style="text-transform: capitalize; color: var(--text-primary);">${store.getState('workspaceRole')}</strong> — Real-time tracking and team telemetry.
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <a href="/board" data-link class="btn btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            <span>Kanban Board</span>
          </a>
        </div>
      </div>

      <!-- Metrics Skeleton Loading -->
      <div id="dash-metrics" class="grid-cols-4">
        <div class="card skeleton" style="height: 100px;"></div>
        <div class="card skeleton" style="height: 100px;"></div>
        <div class="card skeleton" style="height: 100px;"></div>
        <div class="card skeleton" style="height: 100px;"></div>
      </div>

      <!-- Main Columns: Currently Tracking Table & Weekly Chart -->
      <div class="grid-cols-2">
        <!-- Live Currently Tracking Table -->
        <div class="card" style="display: flex; flex-direction: column;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="timer-indicator-dot"></span>
              <h2 style="font-size: 1rem; font-weight: 700;">Currently Tracking Now</h2>
            </div>
            <span id="active-trackers-count" class="badge badge-in_progress">0 Active</span>
          </div>

          <div id="active-trackers-list" style="flex: 1; overflow-y: auto;">
            <div style="text-align: center; padding: 2rem 0; color: var(--text-muted); font-size: 0.875rem;">
              Loading active timers...
            </div>
          </div>
        </div>

        <!-- Weekly Activity SVG Chart -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h2 style="font-size: 1rem; font-weight: 700;">Hours Tracked this Week</h2>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Daily Totals</span>
          </div>
          <div id="dash-chart-container">
            <!-- Rendered below -->
          </div>
        </div>
      </div>

      <!-- Recent Projects & Activity Feed -->
      <div class="grid-cols-2">
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h2 style="font-size: 1rem; font-weight: 700;">Project Health & Budget Burn</h2>
            <a href="/projects" data-link style="font-size: 0.8125rem; font-weight: 600;">View All &rarr;</a>
          </div>
          <div id="dash-projects-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <!-- Injected via API -->
          </div>
        </div>

        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h2 style="font-size: 1rem; font-weight: 700;">Recent Audit Trail</h2>
            <a href="/audit-logs" data-link style="font-size: 0.8125rem; font-weight: 600;">Full Logs &rarr;</a>
          </div>
          <div id="dash-audit-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <!-- Injected via API -->
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const data = await apiRequest('/dashboard/summary');

    // 1. Render Metrics Cards
    const metricsEl = container.querySelector('#dash-metrics');
    metricsEl.innerHTML = `
      <div class="card">
        <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 500;">Hours Tracked Today</div>
        <div style="font-size: 1.75rem; font-weight: 700; margin-top: 0.25rem;">${data.metrics.hoursToday} hrs</div>
        <div style="font-size: 0.75rem; color: var(--status-success); margin-top: 0.25rem;">+ Live running counters included</div>
      </div>

      <div class="card">
        <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 500;">Active Live Trackers</div>
        <div style="font-size: 1.75rem; font-weight: 700; margin-top: 0.25rem;">${data.metrics.activeTrackersCount}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Teammates working right now</div>
      </div>

      <div class="card">
        <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 500;">Open Tasks</div>
        <div style="font-size: 1.75rem; font-weight: 700; margin-top: 0.25rem;">${data.metrics.openTasksCount}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Across ${data.metrics.projectsCount} projects</div>
      </div>

      <div class="card">
        <div style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 500;">Pending Approvals</div>
        <div style="font-size: 1.75rem; font-weight: 700; margin-top: 0.25rem;">${data.metrics.pendingApprovalsCount}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Weekly timesheet submissions</div>
      </div>
    `;

    // 2. Render Currently Tracking Table
    const trackersEl = container.querySelector('#active-trackers-list');
    const trackersCountEl = container.querySelector('#active-trackers-count');
    trackersCountEl.textContent = `${data.activeTrackers.length} Active`;

    if (data.activeTrackers.length === 0) {
      trackersEl.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 0; color: var(--text-muted); font-size: 0.875rem;">
          No team members are currently tracking time.
        </div>
      `;
    } else {
      trackersEl.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); text-align: left; color: var(--text-muted); font-size: 0.75rem;">
              <th style="padding: 0.5rem 0;">MEMBER</th>
              <th style="padding: 0.5rem 0;">TASK & PROJECT</th>
              <th style="padding: 0.5rem 0; text-align: right;">RUNNING</th>
            </tr>
          </thead>
          <tbody>
            ${data.activeTrackers
              .map((t) => {
                const mins = Math.floor(t.elapsedSeconds / 60);
                const hrs = Math.floor(mins / 60);
                const formatted = `${hrs}h ${mins % 60}m`;
                return `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="padding: 0.75rem 0; font-weight: 600;">${t.userName}</td>
                  <td style="padding: 0.75rem 0;">
                    <span style="font-weight: 600; font-size: 0.8125rem;">${t.taskKey}:</span>
                    <span style="color: var(--text-secondary);">${t.taskTitle}</span>
                    <span class="badge" style="background: ${t.projectColor}20; color: ${t.projectColor}; margin-left: 0.25rem;">${t.projectName}</span>
                  </td>
                  <td style="padding: 0.75rem 0; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--status-success);">
                    ${formatted}
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      `;
    }

    // 3. Render Sample Chart
    const chartEl = container.querySelector('#dash-chart-container');
    chartEl.innerHTML = renderBarChart([
      { label: 'Mon', value: 8.5 },
      { label: 'Tue', value: 7.2 },
      { label: 'Wed', value: 9.0 },
      { label: 'Thu', value: 6.8 },
      { label: 'Fri', value: 8.0 },
      { label: 'Sat', value: 2.5 },
      { label: 'Sun', value: 0 }
    ]);

    // 4. Render Projects Health
    const projEl = container.querySelector('#dash-projects-list');
    projEl.innerHTML = data.projects
      .map((p) => {
        const healthBadge =
          p.health === 'on_track'
            ? `<span class="badge badge-done">On Track</span>`
            : p.health === 'at_risk'
            ? `<span class="badge badge-in_review">At Risk</span>`
            : `<span class="badge badge-todo" style="background: var(--status-danger-bg); color: var(--status-danger);">Over Budget</span>`;

        return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle);">
          <div>
            <div style="font-weight: 600; font-size: 0.875rem;">${p.name} (${p.key})</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              ${p.trackedHours || 0} hrs tracked / ${p.budget_value} ${p.budget_type}
            </div>
          </div>
          <div>${healthBadge}</div>
        </div>
      `;
      })
      .join('');

    // 5. Render Audit Feed
    const auditEl = container.querySelector('#dash-audit-list');
    auditEl.innerHTML = data.recentActivities
      .map(
        (a) => `
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8125rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle);">
        <div>
          <strong>${a.user?.full_name || 'System'}:</strong>
          <span style="color: var(--text-secondary); margin-left: 0.25rem;">${a.action} (${a.entity_type})</span>
        </div>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(a.created_at).toLocaleDateString()}</span>
      </div>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem;">
        <h2 style="color: var(--status-danger); font-size: 1.25rem;">Unable to load dashboard</h2>
        <p style="color: var(--text-muted); margin-top: 0.5rem;">${err.message}</p>
        <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
}
