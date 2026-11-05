import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';

export async function renderTimesheetsView(container) {
  const canApprove = store.hasPermission('time:approve_timesheets');
  const role = store.getState('workspaceRole');

  // Compute Monday of current week (YYYY-MM-DD)
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff)).toISOString().slice(0, 10);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Weekly Timesheets</h1>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
            Week of <strong>${monday}</strong>. Review, submit, and approve weekly timesheets.
          </p>
        </div>

        <div id="timesheet-actions" style="display: flex; gap: 0.75rem;">
          <!-- Action buttons injected dynamically -->
        </div>
      </div>

      <!-- Timesheet Grid Card -->
      <div class="card" style="padding: 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-subtle); text-align: center; font-size: 0.75rem; color: var(--text-muted);">
              <th style="padding: 0.75rem 1rem; text-align: left;">PROJECT & TASK</th>
              <th style="padding: 0.75rem 0.5rem; width: 65px;">MON</th>
              <th style="padding: 0.75rem 0.5rem; width: 65px;">TUE</th>
              <th style="padding: 0.75rem 0.5rem; width: 65px;">WED</th>
              <th style="padding: 0.75rem 0.5rem; width: 65px;">THU</th>
              <th style="padding: 0.75rem 0.5rem; width: 65px;">FRI</th>
              <th style="padding: 0.75rem 0.5rem; width: 65px;">SAT</th>
              <th style="padding: 0.75rem 0.5rem; width: 65px;">SUN</th>
              <th style="padding: 0.75rem 1rem; text-align: right; width: 80px;">TOTAL</th>
            </tr>
          </thead>
          <tbody id="timesheet-rows">
            <tr><td colspan="9" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading timesheet data...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const loadGrid = async () => {
    try {
      const data = await apiRequest(`/timesheets/grid?periodStart=${monday}`);
      const tbody = container.querySelector('#timesheet-rows');
      const actionsEl = container.querySelector('#timesheet-actions');

      // Render Action Buttons
      if (data.status === 'draft' || !data.status) {
        actionsEl.innerHTML = `
          <button id="btn-submit-ts" class="btn btn-primary">
            Submit for Approval
          </button>
        `;
      } else if (data.status === 'submitted') {
        if (canApprove) {
          actionsEl.innerHTML = `
            <span class="badge badge-in_review" style="align-self: center;">Pending Approval</span>
            <button id="btn-approve-ts" class="btn btn-primary" style="background: var(--status-success);">Approve</button>
            <button id="btn-reject-ts" class="btn btn-danger">Reject</button>
          `;
        } else {
          actionsEl.innerHTML = `
            <span class="badge badge-in_review" style="align-self: center; padding: 6px 12px;">Submitted (Awaiting Approval)</span>
          `;
        }
      } else if (data.status === 'approved') {
        actionsEl.innerHTML = `
          <span class="badge badge-done" style="align-self: center; padding: 6px 12px;">Approved & Locked</span>
        `;
      }

      // Render Rows
      if (!data.rows || data.rows.length === 0) {
        tbody.innerHTML = `
          <tr><td colspan="9" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
            No tracked hours recorded for this period yet. Track time on tasks to populate the timesheet.
          </td></tr>
        `;
        return;
      }

      tbody.innerHTML = data.rows
        .map((r) => {
          return `
          <tr style="border-bottom: 1px solid var(--border-subtle);">
            <td style="padding: 0.75rem 1rem;">
              <span style="font-weight: 700; font-size: 0.8125rem;">${r.task?.key || 'TASK'}:</span>
              <span style="color: var(--text-secondary); margin-left: 0.25rem;">${r.task?.title || 'General Task'}</span>
              <span class="badge" style="background: var(--bg-muted); margin-left: 0.5rem; font-size: 0.6875rem;">${r.project?.name || 'Project'}</span>
            </td>
            ${r.days.map((d) => `<td style="padding: 0.75rem 0.5rem; text-align: center; font-family: var(--font-mono);">${d > 0 ? d + 'h' : '—'}</td>`).join('')}
            <td style="padding: 0.75rem 1rem; text-align: right; font-family: var(--font-mono); font-weight: 700;">
              ${r.total}h
            </td>
          </tr>
        `;
        })
        .join('');

      // Wire submit / approve / reject
      container.querySelector('#btn-submit-ts')?.addEventListener('click', async () => {
        try {
          await apiRequest('/timesheets/submit', {
            method: 'POST',
            body: JSON.stringify({ period_start: monday, period_end: monday })
          });
          loadGrid();
        } catch (err) {
          alert('Submit error: ' + err.message);
        }
      });

      container.querySelector('#btn-approve-ts')?.addEventListener('click', async () => {
        if (!data.timesheetId) return;
        try {
          await apiRequest(`/timesheets/${data.timesheetId}/approval`, {
            method: 'POST',
            body: JSON.stringify({ action: 'approve' })
          });
          loadGrid();
        } catch (err) {
          alert('Approval error: ' + err.message);
        }
      });

      container.querySelector('#btn-reject-ts')?.addEventListener('click', async () => {
        if (!data.timesheetId) return;
        const reason = prompt('Please specify a rejection reason:');
        if (!reason) return;
        try {
          await apiRequest(`/timesheets/${data.timesheetId}/approval`, {
            method: 'POST',
            body: JSON.stringify({ action: 'reject', rejection_reason: reason })
          });
          loadGrid();
        } catch (err) {
          alert('Rejection error: ' + err.message);
        }
      });
    } catch (err) {
      container.querySelector('#timesheet-rows').innerHTML = `
        <tr><td colspan="9" style="padding: 2.5rem; text-align: center; color: var(--status-danger);">Failed to load timesheet: ${err.message}</td></tr>
      `;
    }
  };

  await loadGrid();
}

