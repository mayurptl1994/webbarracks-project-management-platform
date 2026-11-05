import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';

export async function renderTimesheetsView(container) {
  const user = store.getState('currentUser');
  const isAdmin = user?.role === 'admin';

  // Compute Monday of current week (YYYY-MM-DD)
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff)).toISOString().slice(0, 10);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Weekly Timesheets</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Week of <strong>${monday}</strong>. Review, submit, and approve weekly timesheets.
          </p>
        </div>

        <div id="timesheet-actions" style="display: flex; gap: 0.75rem; align-items: center;">
          <!-- Action buttons injected dynamically -->
        </div>
      </div>

      <!-- Timesheet Grid Card -->
      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <table class="wb-table">
          <thead>
            <tr>
              <th>PROJECT &amp; TASK</th>
              <th style="text-align: center; width: 65px;">MON</th>
              <th style="text-align: center; width: 65px;">TUE</th>
              <th style="text-align: center; width: 65px;">WED</th>
              <th style="text-align: center; width: 65px;">THU</th>
              <th style="text-align: center; width: 65px;">FRI</th>
              <th style="text-align: center; width: 65px;">SAT</th>
              <th style="text-align: center; width: 65px;">SUN</th>
              <th style="text-align: right; width: 90px;">TOTAL</th>
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
          <button id="btn-submit-ts" class="btn-wb-primary">
            Submit for Approval
          </button>
        `;
      } else if (data.status === 'submitted') {
        if (isAdmin) {
          actionsEl.innerHTML = `
            <span class="status-pill-published" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a;">Pending Approval</span>
            <button id="btn-approve-ts" class="btn-wb-primary" style="background: #10b981;">Approve Timesheet</button>
          `;
        } else {
          actionsEl.innerHTML = `
            <span class="status-pill-published" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a;">Submitted (Awaiting Approval)</span>
          `;
        }
      } else if (data.status === 'approved') {
        actionsEl.innerHTML = `
          <span class="status-pill-published" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">Approved &amp; Locked</span>
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

      let grandTotal = 0;

      tbody.innerHTML = data.rows
        .map((r) => {
          grandTotal += r.total || 0;
          return `
          <tr>
            <td>
              <div style="font-weight: 700; font-size: 0.875rem; color: var(--text-primary);">${r.task?.title || 'General Task'}</div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.2rem;">
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">${r.task?.key || 'TASK'}</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">${r.project?.name || 'Project'}</span>
              </div>
            </td>
            ${r.days.map((d) => `<td style="text-align: center; font-family: var(--font-mono); font-size: 0.8125rem; color: ${d > 0 ? 'var(--text-primary)' : 'var(--text-muted)'}; font-weight: ${d > 0 ? '600' : 'normal'};">${d > 0 ? d + 'h' : '—'}</td>`).join('')}
            <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; font-size: 0.875rem; color: #2563eb;">
              ${r.total}h
            </td>
          </tr>
        `;
        })
        .join('') + `
        <tr style="background: #f8fafc; font-weight: 700;">
          <td style="font-size: 0.875rem;">WEEKLY SUMMARY TOTAL</td>
          <td colspan="7"></td>
          <td style="text-align: right; font-family: var(--font-mono); font-size: 0.9375rem; color: #10b981;">${grandTotal}h</td>
        </tr>
      `;

      // Wire submit / approve
      container.querySelector('#btn-submit-ts')?.addEventListener('click', async () => {
        try {
          await apiRequest('/timesheets/submit', { method: 'POST' });
          loadGrid();
        } catch (err) {
          alert('Failed to submit timesheet: ' + err.message);
        }
      });

      container.querySelector('#btn-approve-ts')?.addEventListener('click', async () => {
        try {
          await apiRequest('/timesheets/approve', { method: 'POST' });
          loadGrid();
        } catch (err) {
          alert('Failed to approve timesheet: ' + err.message);
        }
      });
    } catch (err) {
      console.error('Error loading timesheet grid:', err);
    }
  };

  await loadGrid();
}
