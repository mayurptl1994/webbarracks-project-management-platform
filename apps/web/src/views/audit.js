import { apiRequest } from '../core/api.js';

export async function renderAuditView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Security Audit Logs</h1>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
          Tamper-evident records of security events, administrative logins, and content updates.
        </p>
      </div>

      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <table class="wb-table">
          <thead>
            <tr>
              <th>ACTION</th>
              <th>ACTOR</th>
              <th>IP ADDRESS</th>
              <th>TIME</th>
            </tr>
          </thead>
          <tbody id="audit-full-tbody">
            <tr><td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">Loading audit records...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  try {
    const logs = await apiRequest('/audit-logs');
    const tbody = container.querySelector('#audit-full-tbody');

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No audit events recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs
      .map(
        (l) => `
      <tr>
        <td><span class="action-log-badge">${l.action}</span></td>
        <td style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.8125rem;">${l.actor}</td>
        <td style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.8125rem;">${l.ip_address}</td>
        <td style="color: var(--text-secondary); font-size: 0.8125rem;">${l.time}</td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    container.querySelector('#audit-full-tbody').innerHTML = `
      <tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--status-danger);">Failed to load audit records: ${err.message}</td></tr>
    `;
  }
}
