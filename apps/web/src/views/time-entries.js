import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openModal } from '../components/modal.js';

export async function renderTimeEntriesView(container) {
  const canAddManual = store.hasPermission('time:add_manual_own');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Time Entries</h1>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
            Detailed historical ledger with rate snapshots and edit audit logs.
          </p>
        </div>

        ${
          canAddManual
            ? `
          <button id="btn-manual-time" class="btn btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            <span>+ Add Manual Time</span>
          </button>
        `
            : ''
        }
      </div>

      <div class="card" style="padding: 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-subtle); text-align: left; font-size: 0.75rem; color: var(--text-muted);">
              <th style="padding: 0.75rem 1rem;">DATE</th>
              <th style="padding: 0.75rem 1rem;">MEMBER</th>
              <th style="padding: 0.75rem 1rem;">TASK & NOTE</th>
              <th style="padding: 0.75rem 1rem;">HOURS</th>
              <th style="padding: 0.75rem 1rem;">BILLABLE</th>
              <th style="padding: 0.75rem 1rem;">STATUS</th>
              <th style="padding: 0.75rem 1rem; text-align: right;">ACTION</th>
            </tr>
          </thead>
          <tbody id="entries-rows">
            <tr><td colspan="7" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading entries...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const loadEntries = async () => {
    try {
      const entries = await apiRequest('/time/entries');
      const tbody = container.querySelector('#entries-rows');

      if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">No time entries recorded.</td></tr>`;
        return;
      }

      tbody.innerHTML = entries
        .map((e) => {
          const hrs = (e.duration_seconds / 3600.0).toFixed(2);
          const dateStr = new Date(e.started_at).toLocaleDateString();

          return `
          <tr style="border-bottom: 1px solid var(--border-subtle);">
            <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-size: 0.8125rem;">${dateStr}</td>
            <td style="padding: 0.75rem 1rem; font-weight: 600;">${e.user?.full_name || 'Member'}</td>
            <td style="padding: 0.75rem 1rem;">
              <div>
                <span style="font-weight: 700; font-size: 0.8125rem;">${e.task?.key || 'TASK'}:</span>
                <span style="font-weight: 500;">${e.task?.title || ''}</span>
              </div>
              ${e.note ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${e.note}</div>` : ''}
              ${e.edit_reason ? `<div style="font-size: 0.6875rem; color: var(--status-warning);">Edited: ${e.edit_reason}</div>` : ''}
            </td>
            <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-weight: 700;">${hrs}h</td>
            <td style="padding: 0.75rem 1rem;">
              ${e.billable ? `<span class="badge badge-done">Billable</span>` : `<span class="badge" style="background: var(--bg-muted);">Non-billable</span>`}
            </td>
            <td style="padding: 0.75rem 1rem;">
              <span class="badge" style="background: var(--bg-subtle);">${e.status}</span>
            </td>
            <td style="padding: 0.75rem 1rem; text-align: right;">
              <button class="btn btn-sm btn-secondary btn-edit-entry" data-entry-id="${e.id}" data-duration="${e.duration_seconds}" data-note="${e.note || ''}">Edit</button>
            </td>
          </tr>
        `;
        })
        .join('');

      // Attach Edit Handlers
      tbody.querySelectorAll('.btn-edit-entry').forEach((btn) => {
        btn.addEventListener('click', () => {
          const entryId = btn.getAttribute('data-entry-id');
          const currentDuration = btn.getAttribute('data-duration');
          const currentNote = btn.getAttribute('data-note');
          showEditEntryModal(entryId, currentDuration, currentNote, loadEntries);
        });
      });
    } catch (err) {
      container.querySelector('#entries-rows').innerHTML = `
        <tr><td colspan="7" style="padding: 2.5rem; text-align: center; color: var(--status-danger);">Failed to load time entries: ${err.message}</td></tr>
      `;
    }
  };

  await loadEntries();

  // Manual Time Trigger
  container.querySelector('#btn-manual-time')?.addEventListener('click', async () => {
    const tasks = await apiRequest('/tasks');
    if (tasks.length === 0) {
      alert('Please create a task first.');
      return;
    }

    openModal({
      title: 'Add Manual Time Entry',
      contentHtml: `
        <form id="form-manual-time" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Task *</label>
            <select name="task_id" required style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">
              ${tasks.map((t) => `<option value="${t.id}" data-project="${t.project_id}">${t.key} - ${t.title}</option>`).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Date</label>
              <input name="date" type="date" required value="${new Date().toISOString().slice(0, 10)}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Duration (Hours) *</label>
              <input name="hours" type="number" step="0.25" min="0.25" max="24" value="2.0" required style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Notes</label>
            <textarea name="note" rows="2" placeholder="What did you work on?" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);"></textarea>
          </div>

          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
            <input type="checkbox" name="billable" checked /> Billable entry
          </label>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn btn-primary">Save Entry</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-manual-time');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const taskSelect = form.querySelector('select[name="task_id"]');
          const projectId = taskSelect.options[taskSelect.selectedIndex].getAttribute('data-project');
          const dateStr = fd.get('date');
          const hours = parseFloat(fd.get('hours') || '0');
          const durationSeconds = Math.round(hours * 3600);

          const started = new Date(`${dateStr}T09:00:00Z`).toISOString();
          const ended = new Date(new Date(started).getTime() + durationSeconds * 1000).toISOString();

          try {
            await apiRequest('/time/entries/manual', {
              method: 'POST',
              body: JSON.stringify({
                project_id: projectId,
                task_id: fd.get('task_id'),
                started_at: started,
                ended_at: ended,
                duration_seconds: durationSeconds,
                billable: fd.get('billable') === 'on',
                note: fd.get('note')
              })
            });
            close();
            loadEntries();
          } catch (err) {
            alert('Failed to save manual time: ' + err.message);
          }
        });
      }
    });
  });
}

function showEditEntryModal(entryId, currentDuration, currentNote, onDone) {
  const currentHours = (parseInt(currentDuration, 10) / 3600.0).toFixed(2);

  openModal({
    title: 'Edit Time Entry (Audit Logged)',
    contentHtml: `
      <form id="form-edit-entry" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Duration (Hours) *</label>
          <input name="hours" type="number" step="0.25" value="${currentHours}" required style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
        </div>

        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Note</label>
          <textarea name="note" rows="2" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">${currentNote}</textarea>
        </div>

        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--status-danger);">Reason for Edit (Mandatory Audit Requirement) *</label>
          <input name="edit_reason" required placeholder="e.g. Corrected mistaken duration / meeting time" style="width: 100%; padding: 0.5rem; border: 1px solid var(--status-danger); border-radius: var(--radius-md); background: var(--bg-surface);" />
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
          <button type="submit" class="btn btn-primary">Update Entry</button>
        </div>
      </form>
    `,
    onMount: (overlay, close) => {
      const form = overlay.querySelector('#form-edit-entry');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const hrs = parseFloat(fd.get('hours') || '0');
        const reason = fd.get('edit_reason');

        try {
          await apiRequest(`/time/entries/${entryId}`, {
            method: 'PUT',
            body: JSON.stringify({
              duration_seconds: Math.round(hrs * 3600),
              note: fd.get('note'),
              edit_reason: reason
            })
          });
          close();
          onDone();
        } catch (err) {
          alert('Update error: ' + err.message);
        }
      });
    }
  });
}
