import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openModal } from '../components/modal.js';

export async function renderAdminDashboardView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Page Header matching screenshot aesthetic -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Dashboard</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Welcome back, <strong style="color: var(--text-primary);">WebBarracks Super Admin</strong>. Here is the project management & team telemetry overview.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <a href="/tracking" data-link class="btn-wb-outline">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Timer Console</span>
          </a>
          <button id="btn-quick-new-task" class="btn-wb-primary">
            <span>+ New Task</span>
          </button>
        </div>
      </div>

      <!-- 4 Stat Summary Cards matching reference visual styling -->
      <div class="grid-4-cols" id="admin-stat-cards">
        <div class="wb-stat-card">
          <div class="wb-stat-label">ACTIVE PROJECTS</div>
          <div class="wb-stat-value" id="stat-projects">3</div>
          <div class="wb-stat-subtext">Cloud, Portal &amp; Mobile</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">OPEN PROJECT TASKS</div>
          <div class="wb-stat-value" id="stat-tasks">5</div>
          <div class="wb-stat-subtext">2 In Progress • 1 In Review</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">HOURS LOGGED THIS WEEK</div>
          <div class="wb-stat-value" id="stat-hours">256.5h</div>
          <div class="wb-stat-subtext">78% billable efficiency</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">SECURITY AUDIT RECORDS</div>
          <div class="wb-stat-value" id="stat-audits">166</div>
          <div class="wb-stat-subtext">Tamper-evident activity logs</div>
        </div>
      </div>

      <!-- 2 Main Cards matching reference layout -->
      <div class="grid-2-cols">
        <!-- Active Projects & Deliverables Card -->
        <div class="wb-card">
          <div class="wb-card-header">
            <div>
              <div class="wb-card-title">Active Projects &amp; Deliverables</div>
              <div class="wb-card-subtitle">Budgets, delivery milestones and health status</div>
            </div>
            <a href="/projects" data-link class="btn-wb-outline btn-wb-sm">View All</a>
          </div>

          <div style="overflow-x: auto;">
            <table class="wb-table">
              <thead>
                <tr>
                  <th>PROJECT &amp; KEY</th>
                  <th>CLIENT</th>
                  <th>HEALTH</th>
                  <th>BURN / BUDGET</th>
                </tr>
              </thead>
              <tbody id="projects-table-body">
                <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading active projects...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Administrative Audit Logs Card -->
        <div class="wb-card">
          <div class="wb-card-header">
            <div>
              <div class="wb-card-title">Recent Administrative Audit Logs</div>
              <div class="wb-card-subtitle">Security events &amp; sensitive project actions</div>
            </div>
            <a href="/audit-logs" data-link class="btn-wb-outline btn-wb-sm">View Full Log</a>
          </div>

          <div style="overflow-x: auto;">
            <table class="wb-table">
              <thead>
                <tr>
                  <th>ACTION</th>
                  <th>ACTOR</th>
                  <th>IP ADDRESS</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody id="audit-table-body">
                <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading audit logs...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Active Tracking Telemetry -->
      <div class="wb-card">
        <div class="wb-card-header">
          <div>
            <div class="wb-card-title">Live Task Tracking Telemetry</div>
            <div class="wb-card-subtitle">Real-time authorized tracking sessions across project deliverables</div>
          </div>
          <a href="/tracking" data-link class="btn-wb-primary btn-wb-sm">Open Tracking Console</a>
        </div>

        <div id="live-telemetry-container">
          <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.8125rem;">
            Loading active telemetry...
          </div>
        </div>
      </div>
    </div>
  `;

  // Load Dashboard Data
  try {
    const stats = await apiRequest('/dashboard/stats');
    if (stats) {
      container.querySelector('#stat-projects').textContent = stats.activeProjects ?? 3;
      container.querySelector('#stat-tasks').textContent = stats.openTasks ?? 5;
      container.querySelector('#stat-hours').textContent = (stats.totalTrackedHours ?? 256.5) + 'h';
      container.querySelector('#stat-audits').textContent = stats.totalAuditRecords ?? 166;
    }

    // Load Projects Table
    const projects = await apiRequest('/projects');
    const projectsTbody = container.querySelector('#projects-table-body');
    if (projects && projects.length > 0) {
      projectsTbody.innerHTML = projects
        .map((p) => {
          const healthBadge =
            p.health === 'on_track'
              ? `<span class="status-pill-published" style="background: #ecfdf5; color: #047857;">ON TRACK</span>`
              : `<span class="status-pill-published" style="background: #fffbeb; color: #b45309;">AT RISK</span>`;

          const burnText =
            p.budget_type === 'hours'
              ? `${p.budget_spent || 0}h / ${p.budget_value || 0}h`
              : `$${(p.budget_spent || 0).toLocaleString()} / $${(p.budget_value || 0).toLocaleString()}`;

          return `
            <tr>
              <td>
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.875rem;">${p.name}</div>
                <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${p.key}</div>
              </td>
              <td style="color: var(--text-secondary); font-size: 0.8125rem;">${p.client_name || 'Internal'}</td>
              <td>${healthBadge}</td>
              <td style="font-family: var(--font-mono); font-weight: 600; font-size: 0.8125rem;">${burnText}</td>
            </tr>
          `;
        })
        .join('');
    } else {
      projectsTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No active projects.</td></tr>`;
    }

    // Load Audit Logs Table matching screenshot
    const audits = await apiRequest('/audit-logs');
    const auditTbody = container.querySelector('#audit-table-body');
    if (audits && audits.length > 0) {
      auditTbody.innerHTML = audits
        .slice(0, 6)
        .map(
          (log) => `
        <tr>
          <td><span class="action-log-badge">${log.action}</span></td>
          <td style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.75rem;">${log.actor}</td>
          <td style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">${log.ip_address}</td>
          <td style="color: var(--text-secondary); font-size: 0.75rem;">${log.time}</td>
        </tr>
      `
        )
        .join('');
    }

    // Load Live Telemetry
    const telemetry = await apiRequest('/tracking/live');
    const telemetryContainer = container.querySelector('#live-telemetry-container');
    if (!telemetry || telemetry.length === 0) {
      telemetryContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
          No active tracking sessions right now. Team members can start tracking from the <a href="/tracking" data-link style="color: #2563eb; font-weight: 600;">Timer Console</a>.
        </div>
      `;
    } else {
      telemetryContainer.innerHTML = `
        <table class="wb-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>PROJECT &amp; TASK</th>
              <th>MONITORING STATUS</th>
              <th>ELAPSED TIME</th>
            </tr>
          </thead>
          <tbody>
            ${telemetry
              .map(
                (s) => `
              <tr>
                <td><strong>${s.user_name}</strong></td>
                <td>
                  <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${s.task_key}</span>
                  <div><strong>${s.task_title}</strong></div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.project_name}</div>
                </td>
                <td><span class="monitoring-active-pill"><span class="pulse-dot"></span> Authorized Active</span></td>
                <td style="font-family: var(--font-mono); font-weight: 700; color: #10b981;">
                  ${Math.floor((s.duration_seconds || 0) / 60)}m ${(s.duration_seconds || 0) % 60}s
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    console.error('Admin dashboard error:', err);
  }

  // Quick New Task Modal
  container.querySelector('#btn-quick-new-task')?.addEventListener('click', () => {
    openModal({
      title: 'Create New Project Task',
      contentHtml: `
        <form id="form-new-task" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Task Title *</label>
            <input name="title" required placeholder="e.g. Implement API Gateway Rate Limiter" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-sans);" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Project *</label>
              <select name="project_id" required style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);">
                <option value="proj-1">CLOUD - Enterprise Cloud Migration</option>
                <option value="proj-2">PORTAL - Client Portal V2</option>
                <option value="proj-3">MOBILE - Agent Field Companion</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Priority</label>
              <select name="priority" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);">
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Estimate (Hours)</label>
              <input name="estimate_hours" type="number" value="4" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Billable</label>
              <select name="billable" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);">
                <option value="true">Yes (Billable)</option>
                <option value="false">No (Internal Non-Billable)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn-wb-primary">Create Task</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-new-task');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify({
              title: fd.get('title'),
              project_id: fd.get('project_id'),
              priority: fd.get('priority'),
              estimate_hours: Number(fd.get('estimate_hours')) || 1,
              billable: fd.get('billable') === 'true'
            })
          });
          close();
          renderAdminDashboardView(container);
        });
      }
    });
  });
}
