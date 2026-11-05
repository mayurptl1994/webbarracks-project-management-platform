import { apiRequest } from '../core/api.js';

export async function renderAuditView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Audit Trail</h1>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
          Immutable ledger of security events, role modifications, and manual time edits.
        </p>
      </div>

      <div class="card" style="padding: 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-subtle); text-align: left; font-size: 0.75rem; color: var(--text-muted);">
              <th style="padding: 0.75rem 1rem;">TIMESTAMP</th>
              <th style="padding: 0.75rem 1rem;">ACTOR</th>
              <th style="padding: 0.75rem 1rem;">ACTION</th>
              <th style="padding: 0.75rem 1rem;">ENTITY</th>
              <th style="padding: 0.75rem 1rem;">DETAILS</th>
            </tr>
          </thead>
          <tbody id="audit-table-body">
            <tr><td colspan="5" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading audit events...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  try {
    const logs = await apiRequest('/audit-logs');
    const tbody = container.querySelector('#audit-table-body');

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">No audit events recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs
      .map((l) => {
        return `
        <tr style="border-bottom: 1px solid var(--border-subtle);">
          <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-size: 0.8125rem;">${new Date(l.created_at).toLocaleString()}</td>
          <td style="padding: 0.75rem 1rem; font-weight: 600;">${l.user?.full_name || 'System'}</td>
          <td style="padding: 0.75rem 1rem;">
            <span class="badge" style="background: var(--bg-muted);">${l.action}</span>
          </td>
          <td style="padding: 0.75rem 1rem; color: var(--text-secondary);">${l.entity_type}</td>
          <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
            ${JSON.stringify(l.details)}
          </td>
        </tr>
      `;
      })
      .join('');
  } catch (err) {
    container.querySelector('#audit-table-body').innerHTML = `
      <tr><td colspan="5" style="padding: 2.5rem; text-align: center; color: var(--status-danger);">Failed to load audit logs: ${err.message}</td></tr>
    `;
  }
}
