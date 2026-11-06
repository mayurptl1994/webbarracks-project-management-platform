import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { formatRateWithCurrency, CURRENCY_SYMBOLS } from './clients.js';

export async function renderAdminDashboardView(container) {
  const user = store.getState('currentUser');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Page Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Dashboard</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Welcome back, <strong style="color: var(--text-primary);">${user?.full_name || 'WebBarracks Super Admin'}</strong>. Here is your client billing &amp; time tracking overview.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <a href="/clients" data-link class="btn-wb-outline">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            <span>+ Add Client</span>
          </a>
          <a href="/tracking" data-link class="btn-wb-primary">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Timer Console</span>
          </a>
        </div>
      </div>

      <!-- 4 Stat Summary Cards matching reference visual styling -->
      <div class="grid-4-cols" id="admin-stat-cards">
        <div class="wb-stat-card">
          <div class="wb-stat-label">ACTIVE CLIENTS</div>
          <div class="wb-stat-value" id="stat-clients">0</div>
          <div class="wb-stat-subtext">Hourly tariffs configured</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">TOTAL LOGGED ENTRIES</div>
          <div class="wb-stat-value" id="stat-entries" style="color: #2563eb;">0</div>
          <div class="wb-stat-subtext">Tracked billing records</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">HOURS LOGGED THIS WEEK</div>
          <div class="wb-stat-value" id="stat-hours" style="color: #10b981;">0.0h</div>
          <div class="wb-stat-subtext">Active client work</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">SECURITY AUDIT RECORDS</div>
          <div class="wb-stat-value" id="stat-audits">0</div>
          <div class="wb-stat-subtext">Activity trail records</div>
        </div>
      </div>

      <!-- 2 Main Cards matching reference layout -->
      <div class="grid-2-cols">
        <!-- Active Clients & Tariffs Card -->
        <div class="wb-card">
          <div class="wb-card-header">
            <div>
              <div class="wb-card-title">Clients &amp; Billing Rates</div>
              <div class="wb-card-subtitle">Active client tariffs, price per hour, and currency</div>
            </div>
            <a href="/clients" data-link class="btn-wb-outline btn-wb-sm">Manage Clients</a>
          </div>

          <div style="overflow-x: auto;">
            <table class="wb-table">
              <thead>
                <tr>
                  <th>CLIENT &amp; COMPANY</th>
                  <th>CURRENCY</th>
                  <th>PRICE / HOUR</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody id="clients-table-body">
                <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading clients...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Administrative Audit Logs Card -->
        <div class="wb-card">
          <div class="wb-card-header">
            <div>
              <div class="wb-card-title">Recent Administrative Audit Logs</div>
              <div class="wb-card-subtitle">Security events &amp; client modifications</div>
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

      <!-- Active Tracking Console Widget -->
      <div class="wb-card">
        <div class="wb-card-header">
          <div>
            <div class="wb-card-title">Active Time Tracking</div>
            <div class="wb-card-subtitle">Live time console and real-time tracking session</div>
          </div>
          <a href="/tracking" data-link class="btn-wb-primary btn-wb-sm">Open Full Console</a>
        </div>

        <div id="live-telemetry-container">
          <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.8125rem;">
            Loading active tracker status...
          </div>
        </div>
      </div>
    </div>
  `;

  // Load Dashboard Data
  try {
    const stats = await apiRequest('/dashboard/stats');
    if (stats) {
      container.querySelector('#stat-clients').textContent = stats.activeClients ?? 0;
      container.querySelector('#stat-entries').textContent = stats.totalLoggedEntries ?? 0;
      container.querySelector('#stat-hours').textContent = (stats.totalTrackedHours ?? 0) + 'h';
      container.querySelector('#stat-audits').textContent = stats.totalAuditRecords ?? 0;
    }

    // Load Clients Table
    const clients = await apiRequest('/clients');
    const clientsTbody = container.querySelector('#clients-table-body');
    if (clients && clients.length > 0) {
      clientsTbody.innerHTML = clients
        .map((cl) => {
          const initial = (cl.name || 'C').charAt(0).toUpperCase();
          const statusBadge =
            cl.status === 'active'
              ? `<span style="display: inline-flex; align-items: center; gap: 5px; color: #10b981; font-weight: 700; font-size: 0.75rem;"><span style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span> Active</span>`
              : `<span style="display: inline-flex; align-items: center; gap: 5px; color: #64748b; font-weight: 700; font-size: 0.75rem;"><span style="width: 6px; height: 6px; background: #64748b; border-radius: 50%;"></span> Inactive</span>`;

          const rateText = formatRateWithCurrency(cl.hourly_rate, cl.currency);

          return `
            <tr>
              <td>
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <div style="width: 28px; height: 28px; border-radius: 6px; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem;">
                    ${initial}
                  </div>
                  <div>
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 0.875rem;">${cl.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${cl.company || 'Direct Client'}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="status-pill-published" style="background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; font-weight: 700; font-family: var(--font-mono);">
                  ${cl.currency} (${CURRENCY_SYMBOLS[cl.currency] || '$'})
                </span>
              </td>
              <td>
                <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.875rem; color: #047857; background: #ecfdf5; padding: 2px 6px; border-radius: var(--radius-sm);">
                  ${rateText}
                </span>
              </td>
              <td>${statusBadge}</td>
            </tr>
          `;
        })
        .join('');
    } else {
      clientsTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No active clients configured yet. <a href="/clients" data-link style="color: #2563eb; font-weight: 600;">Create your first client &rarr;</a></td></tr>`;
    }

    // Load Audit Logs Table
    const audits = await apiRequest('/audit-logs');
    const auditTbody = container.querySelector('#audit-table-body');
    if (audits && audits.length > 0) {
      auditTbody.innerHTML = audits
        .slice(0, 6)
        .map((log) => {
          let timeFormatted = 'Just now';
          if (log.created_at) {
            try {
              timeFormatted = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch {
              timeFormatted = 'Recently';
            }
          }
          return `
            <tr>
              <td><span class="action-log-badge">${log.action}</span></td>
              <td style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.75rem; font-weight: 600;">${log.user_name || log.actor || user?.full_name || 'Admin'}</td>
              <td style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">127.0.0.1</td>
              <td style="color: var(--text-secondary); font-size: 0.75rem;">${timeFormatted}</td>
            </tr>
          `;
        })
        .join('');
    } else {
      auditTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No recent audit activity.</td></tr>`;
    }

    // Load Live Tracker Telemetry
    const telemetry = await apiRequest('/tracking/live');
    const telemetryContainer = container.querySelector('#live-telemetry-container');
    if (!telemetry || telemetry.length === 0) {
      telemetryContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
          No active timer session running right now. <a href="/tracking" data-link style="color: #2563eb; font-weight: 600;">Open Time Tracker &rarr;</a>
        </div>
      `;
    } else {
      telemetryContainer.innerHTML = `
        <table class="wb-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>CLIENT / TASK</th>
              <th>TIMER STATUS</th>
              <th>ELAPSED TIME</th>
            </tr>
          </thead>
          <tbody>
            ${telemetry
              .map(
                (s) => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                      <div style="width: 28px; height: 28px; border-radius: 50%; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem;">
                        ${(s.user_name || 'U').charAt(0)}
                      </div>
                      <div>
                        <div style="font-weight: 700; font-size: 0.8125rem;">${s.user_name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${s.user_email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style="font-weight: 600; font-size: 0.8125rem; color: var(--text-primary);">${s.task_name}</span>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${s.project_name}</div>
                  </td>
                  <td>
                    <span class="status-pill-published" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-weight: 700; font-size: 0.75rem;">
                      ● Ticking
                    </span>
                  </td>
                  <td style="font-family: var(--font-mono); font-weight: 700; font-size: 0.875rem; color: #2563eb;">
                    ${s.elapsed_str}
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
}
