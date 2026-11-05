import { apiRequest } from '../core/api.js';
import { openModal } from '../components/modal.js';

export async function renderTimeEntriesView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Manual Time Log</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Detailed historical ledger with rate snapshots and audit records.
          </p>
        </div>

        <button id="btn-manual-time" class="btn-wb-primary">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          <span>+ Add Manual Time</span>
        </button>
      </div>

      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <table class="wb-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>MEMBER</th>
              <th>PROJECT &amp; TASK</th>
              <th>HOURS</th>
              <th>BILLABLE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody id="entries-rows">
            <tr><td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading entries...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = container.querySelector('#entries-rows');

  const loadEntries = async () => {
    try {
      const entries = await apiRequest('/time-entries');
      if (!entries || entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">No manual time entries logged yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = entries
        .map((e) => {
          const statusBadge =
            e.status === 'approved'
              ? `<span class="status-pill-published" style="background: #ecfdf5; color: #047857;">APPROVED</span>`
              : `<span class="status-pill-published" style="background: #fffbeb; color: #b45309;">PENDING</span>`;

          const billableBadge = e.billable
            ? `<span style="color: #10b981; font-weight: 700; font-size: 0.75rem;">Yes</span>`
            : `<span style="color: #64748b; font-size: 0.75rem;">No</span>`;

          return `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-secondary);">${e.date}</td>
            <td style="font-weight: 600; color: var(--text-primary);">${e.user_name}</td>
            <td>
              <div style="font-weight: 700; font-size: 0.875rem;">${e.task_title}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${e.task_key} • ${e.project_name}</div>
            </td>
            <td style="font-family: var(--font-mono); font-weight: 700; font-size: 0.875rem; color: #2563eb;">${e.hours}h</td>
            <td>${billableBadge}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
        })
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--status-danger);">Failed to load time entries: ${err.message}</td></tr>`;
    }
  };

  await loadEntries();

  // Add Manual Time Modal
  container.querySelector('#btn-manual-time')?.addEventListener('click', () => {
    openModal({
      title: 'Add Manual Time Entry',
      contentHtml: `
        <form id="form-manual-time" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Project &amp; Task *</label>
            <select name="task_key" required style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);">
              <option value="CLOUD-1">CLOUD-1: Setup Terraform infrastructure modules</option>
              <option value="PORTAL-1">PORTAL-1: Build customer metrics dashboard</option>
              <option value="MOBILE-1">MOBILE-1: Electron tray background process</option>
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Date *</label>
              <input type="date" name="date" required value="${new Date().toISOString().slice(0, 10)}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Hours *</label>
              <input type="number" step="0.25" min="0.25" max="24" name="hours" required value="2.0" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Notes / Reason for Manual Entry</label>
            <textarea name="notes" rows="2" placeholder="e.g. Offline architecture review meeting..." style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-sans);"></textarea>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" name="billable" checked id="check-billable" />
            <label for="check-billable" style="font-size: 0.8125rem; font-weight: 600;">Billable to client</label>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn-wb-primary">Save Entry</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-manual-time');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const taskKey = fd.get('task_key');
          const taskTitle = taskKey === 'CLOUD-1' ? 'Setup Terraform infrastructure modules' : taskKey === 'PORTAL-1' ? 'Build customer metrics dashboard' : 'Electron tray background process';
          const projectName = taskKey === 'CLOUD-1' ? 'Platform Cloud Migration' : taskKey === 'PORTAL-1' ? 'NextGen Client Portal' : 'Mobile Companion';

          await apiRequest('/time-entries', {
            method: 'POST',
            body: JSON.stringify({
              task_key: taskKey,
              task_title: taskTitle,
              project_name: projectName,
              date: fd.get('date'),
              hours: Number(fd.get('hours')) || 1.0,
              billable: fd.get('billable') === 'on'
            })
          });
          close();
          loadEntries();
        });
      }
    });
  });
}
