import { apiRequest } from '../core/api.js';
import { openModal } from '../components/modal.js';
import { createTrackerBar } from '../components/tracker-bar.js';
import { CURRENCY_SYMBOLS, formatRateWithCurrency } from './clients.js';
import { openTimeEntryModal } from '../components/time-entry-modal.js';

export async function renderTimeEntriesView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Time Entries Ledger</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Real-time tracker bar, client billing rates, and historical time ledger.
          </p>
        </div>

        <button id="btn-manual-time" class="btn-wb-outline">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          <span>+ Custom Time Modal</span>
        </button>
      </div>

      <!-- Mounted Reference Tracker Bar -->
      <div id="time-entries-tracker-mount"></div>

      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <table class="wb-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>MEMBER</th>
              <th>CLIENT &amp; DESCRIPTION</th>
              <th>TIME INTERVAL</th>
              <th>HOURS</th>
              <th>BILLABLE</th>
              <th style="text-align: right;">VALUE</th>
              <th style="text-align: right;">ACTION</th>
            </tr>
          </thead>
          <tbody id="entries-rows">
            <tr><td colspan="8" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading entries...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Mount Tracker Bar
  const trackerMount = container.querySelector('#time-entries-tracker-mount');
  const tracker = createTrackerBar({
    onEntryLogged: () => {
      loadEntries();
    }
  });
  trackerMount.appendChild(tracker.element);

  const tbody = container.querySelector('#entries-rows');

  let cachedClients = [];
  try {
    cachedClients = await apiRequest('/clients');
  } catch {
    cachedClients = [];
  }

  const loadEntries = async () => {
    try {
      const entries = await apiRequest('/time-entries');
      if (!entries || entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">No time entries logged yet. Use the bar above to start tracking!</td></tr>`;
        return;
      }

      tbody.innerHTML = entries
        .map((e) => {
          const sym = CURRENCY_SYMBOLS[e.client_currency] || '$';
          const billableBadge = e.billable
            ? `<span style="color: #047857; font-weight: 700; font-size: 0.75rem; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">Yes ($)</span>`
            : `<span style="color: #94a3b8; font-size: 0.75rem;">No</span>`;

          const amountStr = e.billable ? `${sym}${(e.billable_amount || (e.hours * (e.client_rate || 100))).toFixed(2)}` : '—';
          const interval = e.start_time && e.end_time ? `${e.start_time} - ${e.end_time}` : 'Timer Session';

          const taskName = e.task_name || e.task_title || e.description || 'General Client Work';
          const taskUrlLink = e.task_url
            ? `<a href="${e.task_url}" target="_blank" rel="noopener noreferrer" class="wb-entry-task-link" title="Open ${e.task_url}" onclick="event.stopPropagation();" style="margin-left: 4px;">
                <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                <span>Task Link ↗</span>
              </a>`
            : '';

          const plainDesc = (e.description || '').replace(/<[^>]*>/g, '').trim();
          const isDiff = plainDesc && plainDesc.toLowerCase() !== taskName.toLowerCase().trim();
          const descSnippet = isDiff && e.description
            ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 3px; max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${plainDesc}</div>`
            : '';

          return `
          <tr data-id="${e.id}">
            <td>
              <button type="button" class="btn-edit-row-time" data-id="${e.id}" title="Click to edit date & time" style="font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-secondary); background: transparent; border: 1px dashed transparent; border-radius: 4px; padding: 2px 6px; cursor: pointer; text-align: left;">
                📅 ${e.date}
              </button>
            </td>
            <td style="font-weight: 600; color: var(--text-primary); font-size: 0.8125rem;">${e.user_name || 'Member'}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                <span style="font-weight: 700; font-size: 0.875rem; color: var(--text-primary); cursor: pointer;" class="btn-edit-row-time" data-id="${e.id}">${taskName}</span>
                ${taskUrlLink}
              </div>
              <div style="font-size: 0.75rem; color: #047857; font-weight: 600; margin-top: 2px;">
                ● ${e.client_name || 'Direct Client'} ${e.client_rate ? `(${sym}${e.client_rate}/hr)` : ''}
              </div>
              ${descSnippet}
            </td>
            <td>
              <button type="button" class="btn-edit-row-time" data-id="${e.id}" title="Click to edit time & date" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); background: #f8fafc; border: 1px solid var(--border-default); border-radius: 4px; padding: 3px 8px; cursor: pointer;">
                🕒 ${interval}
              </button>
            </td>
            <td>
              <button type="button" class="btn-edit-row-time" data-id="${e.id}" title="Click to edit duration & hours" style="font-family: var(--font-mono); font-weight: 700; font-size: 0.875rem; color: var(--text-primary); background: transparent; border: 1px dashed transparent; border-radius: 4px; padding: 2px 6px; cursor: pointer;">
                ${Number(e.hours || 0).toFixed(2)}h
              </button>
            </td>
            <td>${billableBadge}</td>
            <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: #047857;">${amountStr}</td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 0.35rem;">
                <button class="btn-wb-outline btn-wb-sm btn-edit-row-time" data-id="${e.id}">
                  Edit
                </button>
                <button class="btn-wb-outline btn-wb-sm btn-delete-row-entry" data-id="${e.id}" style="color: var(--status-danger);">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
        })
        .join('');

      tbody.querySelectorAll('.btn-edit-row-time').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const entry = entries.find((e) => e.id === id);
          if (entry) {
            openTimeEntryModal({
              entry,
              clients: cachedClients,
              onSave: () => {
                loadEntries();
              }
            });
          }
        });
      });

      tbody.querySelectorAll('.btn-delete-row-entry').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (confirm('Delete this time entry?')) {
            try {
              await apiRequest(`/time-entries/${id}`, { method: 'DELETE' });
              await loadEntries();
            } catch (err) {
              alert('Failed to delete: ' + err.message);
            }
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="padding: 2.5rem; text-align: center; color: var(--status-danger);">Failed to load time entries: ${err.message}</td></tr>`;
    }
  };

  await loadEntries();

  // Add Custom Time Modal (Uses comprehensive openTimeEntryModal)
  container.querySelector('#btn-manual-time')?.addEventListener('click', () => {
    openTimeEntryModal({
      entry: {
        id: null,
        task_name: '',
        task_url: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
        start_time: '09:00 am',
        end_time: '10:00 am',
        duration_seconds: 3600,
        hours: 1.0,
        billable: true
      },
      clients: cachedClients,
      onSave: () => {
        loadEntries();
      }
    });
  });
}
