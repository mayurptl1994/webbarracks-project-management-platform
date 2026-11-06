import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { CURRENCY_SYMBOLS, formatRateWithCurrency } from './clients.js';
import { openTimeEntryModal } from '../components/time-entry-modal.js';

export async function renderTrackingView(container) {
  const user = store.getState('currentUser');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.75rem;">
      <!-- Page Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Time Tracker</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Real-time timer console, client tariff billing, and activity log for <strong>${user?.full_name || 'User'}</strong>.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <a href="/clients" data-link class="btn-wb-outline" style="font-size: 0.8125rem;">
            <span>Manage Client Rates</span>
          </a>
        </div>
      </div>

      <!-- Quick Summary Metric Bar -->
      <div class="grid-4-cols" id="tracking-quick-metrics">
        <div class="wb-stat-card">
          <div class="wb-stat-label">TOTAL TIME LOGGED</div>
          <div class="wb-stat-value" id="metric-total-time">00:00:00</div>
          <div class="wb-stat-subtext">Across all recent sessions</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">BILLABLE HOURS</div>
          <div class="wb-stat-value" id="metric-billable-hours" style="color: #10b981;">0.0h</div>
          <div class="wb-stat-subtext">Eligible for client invoicing</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">BILLABLE EARNINGS</div>
          <div class="wb-stat-value" id="metric-billable-value" style="color: #047857;">$0.00</div>
          <div class="wb-stat-subtext">Calculated at client tariffs</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">LOGGED ENTRIES</div>
          <div class="wb-stat-value" id="metric-entries-count">0</div>
          <div class="wb-stat-subtext">Completed session records</div>
        </div>
      </div>

      <!-- Time Entries Section Header & Filter Controls -->
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h2 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em;">Logged Time Entries</h2>
            <span id="entries-count-badge" style="font-size: 0.75rem; font-weight: 700; color: #475569; background: #e2e8f0; padding: 2px 8px; border-radius: 9999px;">0</span>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <input 
              id="input-entries-search" 
              type="search" 
              placeholder="Filter entries by description or client..." 
              style="padding: 0.4rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); background: var(--bg-surface); font-size: 0.8125rem; width: 260px;" 
            />
            <select id="select-filter-client" style="padding: 0.4rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); background: var(--bg-surface); font-size: 0.8125rem;">
              <option value="">All Clients</option>
            </select>
            <select id="select-filter-billable" style="padding: 0.4rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); background: var(--bg-surface); font-size: 0.8125rem;">
              <option value="">All Statuses</option>
              <option value="billable">Billable Only ($)</option>
              <option value="non_billable">Non-Billable</option>
            </select>
          </div>
        </div>

        <!-- Grouped Time Entries Container -->
        <div id="entries-groups-container" class="wb-entries-list">
          <div style="text-align: center; padding: 3rem; color: var(--text-muted); background: #ffffff; border: 1px dashed var(--border-strong); border-radius: var(--radius-lg);">
            Loading time entries...
          </div>
        </div>
      </div>
    </div>
  `;

  // Load and List Entries
  let allEntries = [];
  let availableClients = [];

  // Listen for entries logged from the sticky tracker bar
  const onLogged = () => {
    loadEntries();
  };
  window.addEventListener('wb-entry-logged', onLogged);

  const loadClientsFilter = async () => {
    try {
      availableClients = await apiRequest('/clients');
      const clientSelect = container.querySelector('#select-filter-client');
      if (clientSelect && availableClients.length > 0) {
        availableClients.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.name} (${c.currency} ${c.hourly_rate}/hr)`;
          clientSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.warn('Failed to load client filter:', err);
    }
  };

  const loadEntries = async () => {
    try {
      allEntries = await apiRequest('/time-entries');
      updateMetrics(allEntries);
      renderEntriesList(filterEntries());
    } catch (err) {
      container.querySelector('#entries-groups-container').innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--status-danger); background: #ffffff; border: 1px solid var(--border-default); border-radius: var(--radius-lg);">
          Failed to load time entries: ${err.message}
        </div>
      `;
    }
  };

  const updateMetrics = (entries) => {
    const totalSec = entries.reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);
    const billableHours = entries.filter((e) => e.billable).reduce((acc, e) => acc + (Number(e.hours) || 0), 0);
    const billableAmount = entries.filter((e) => e.billable).reduce((acc, e) => acc + (Number(e.billable_amount) || 0), 0);

    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');

    container.querySelector('#metric-total-time').textContent = `${h}:${m}:${s}`;
    container.querySelector('#metric-billable-hours').textContent = `${billableHours.toFixed(1)}h`;
    container.querySelector('#metric-billable-value').textContent = `$${billableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    container.querySelector('#metric-entries-count').textContent = entries.length;
    container.querySelector('#entries-count-badge').textContent = entries.length;
  };

  const filterEntries = () => {
    const query = (container.querySelector('#input-entries-search')?.value || '').toLowerCase().trim();
    const clientId = container.querySelector('#select-filter-client')?.value || '';
    const billableFilter = container.querySelector('#select-filter-billable')?.value || '';

    return allEntries.filter((e) => {
      const matchQuery =
        !query ||
        (e.description && e.description.toLowerCase().includes(query)) ||
        (e.task_title && e.task_title.toLowerCase().includes(query)) ||
        (e.client_name && e.client_name.toLowerCase().includes(query));

      const matchClient = !clientId || e.client_id === clientId;
      const matchBillable =
        !billableFilter ||
        (billableFilter === 'billable' && e.billable) ||
        (billableFilter === 'non_billable' && !e.billable);

      return matchQuery && matchClient && matchBillable;
    });
  };

  const renderEntriesList = (entries) => {
    const listContainer = container.querySelector('#entries-groups-container');

    if (!entries || entries.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted); background: #ffffff; border: 1px dashed var(--border-strong); border-radius: var(--radius-lg);">
          No time entries found. Type what you are working on above and click <strong>START</strong>!
        </div>
      `;
      return;
    }

    // Group entries by Date (e.g. YYYY-MM-DD)
    const groups = {};
    entries.forEach((e) => {
      const dateKey = e.date || new Date().toISOString().slice(0, 10);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    listContainer.innerHTML = sortedDates
      .map((dateKey) => {
        const groupEntries = groups[dateKey];
        const daySec = groupEntries.reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);
        const dayAmount = groupEntries.reduce((acc, e) => acc + (Number(e.billable_amount) || 0), 0);

        const groupCurrencies = [...new Set(groupEntries.map((e) => e.client_currency).filter(Boolean))];
        const groupSym = groupCurrencies.length === 1 ? (CURRENCY_SYMBOLS[groupCurrencies[0]] || '$') : '$';

        const dh = String(Math.floor(daySec / 3600)).padStart(2, '0');
        const dm = String(Math.floor((daySec % 3600) / 60)).padStart(2, '0');
        const ds = String(daySec % 60).padStart(2, '0');

        let label = dateKey;
        if (dateKey === todayStr) label = 'Today';
        else if (dateKey === yesterdayStr) label = 'Yesterday';
        else {
          try {
            label = new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
          } catch {
            label = dateKey;
          }
        }

        const entriesHtml = groupEntries
          .map((entry) => {
            const sec = Number(entry.duration_seconds) || 0;
            const h = String(Math.floor(sec / 3600)).padStart(2, '0');
            const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
            const s = String(sec % 60).padStart(2, '0');
            const durationStr = `${h}:${m}:${s}`;

            const timeRange = entry.start_time && entry.end_time ? `${entry.start_time} - ${entry.end_time}` : '';
            const currency = entry.client_currency || 'USD';
            const sym = CURRENCY_SYMBOLS[currency] || '$';
            const clientRate = entry.client_rate ? `${sym}${entry.client_rate}/hr` : '';

            const billableIcon = entry.billable
              ? `<span style="color: #047857; font-weight: 700; font-size: 0.875rem; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;" title="Billable: ${sym}${(entry.billable_amount || 0).toFixed(2)}">$</span>`
              : `<span style="color: #94a3b8; font-size: 0.875rem;" title="Non-billable">⊘</span>`;

            const taskName = entry.task_name || entry.task_title || 'General Client Work';

            // Format task URL badge
            let taskUrlBadge = '';
            if (entry.task_url) {
              let label = 'Task Link';
              try {
                const u = new URL(entry.task_url.startsWith('http') ? entry.task_url : `https://${entry.task_url}`);
                const host = u.hostname.replace(/^www\./, '');
                const pathname = u.pathname.replace(/\/$/, '');
                const segs = pathname.split('/').filter(Boolean);
                const last = segs.pop();
                label = last && last.length < 24 ? `${host}/…/${last}` : host;
              } catch {
                label = 'Task Link ↗';
              }
              taskUrlBadge = `
                <a 
                  href="${entry.task_url}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="wb-entry-task-link" 
                  title="Open ${entry.task_url}"
                  onclick="event.stopPropagation();"
                >
                  <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  <span>${label}</span>
                </a>
              `;
            }

            // Format rich text description preview
            let richDescHtml = '';
            if (entry.description) {
              const plain = entry.description.replace(/<[^>]*>/g, '').trim();
              const isDifferent = plain && plain.toLowerCase() !== taskName.toLowerCase().trim();
              const hasTags = /<[a-z][\s\S]*>/i.test(entry.description);
              if (isDifferent || hasTags) {
                richDescHtml = `<div class="wb-entry-desc-rich btn-edit-entry-time" data-id="${entry.id}" style="cursor: pointer;" title="Click to edit rich text notes">${entry.description}</div>`;
              }
            }

            return `
              <div class="wb-entry-item" data-id="${entry.id}">
                <div class="wb-entry-item-left" style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem; flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                    <span class="wb-entry-title btn-edit-entry-time" data-id="${entry.id}" style="cursor: pointer;" title="Click to edit task name, URL & details">
                      ${taskName}
                    </span>

                    <div class="wb-entry-client-badge">
                      <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
                      <span>${entry.client_name || 'Direct Client'}</span>
                      ${clientRate ? `<span style="opacity: 0.8; font-family: var(--font-mono); font-size: 0.6875rem;">• ${clientRate}</span>` : ''}
                    </div>

                    ${taskUrlBadge}
                  </div>

                  ${richDescHtml}
                </div>

                <div class="wb-entry-item-right">
                  ${billableIcon}

                  <!-- Clickable Time Range -->
                  <button type="button" class="wb-entry-time-pill btn-edit-entry-time" data-id="${entry.id}" title="Click to edit time & date">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="opacity: 0.6;">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>${timeRange || 'Set time'}</span>
                  </button>

                  <!-- Clickable Duration -->
                  <button type="button" class="wb-entry-duration-pill btn-edit-entry-time" data-id="${entry.id}" title="Click to edit duration & time">
                    <span>${durationStr}</span>
                  </button>

                  <span class="wb-entry-amount">
                    ${entry.billable ? `${sym}${(entry.billable_amount || 0).toFixed(2)}` : '—'}
                  </span>

                  <div class="wb-entry-actions">
                    <!-- Edit Entry Button -->
                    <button class="wb-tracker-icon-btn btn-edit-entry-time" data-id="${entry.id}" title="Edit time, date & details" style="color: #64748b;">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>

                    <!-- Quick Restart Button -->
                    <button class="wb-tracker-icon-btn btn-restart-entry" data-id="${entry.id}" title="Continue tracking this task">
                      <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </button>

                    <!-- Delete Button -->
                    <button class="wb-tracker-icon-btn btn-delete-entry" data-id="${entry.id}" title="Delete entry" style="color: #cbd5e1;">
                      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="wb-entry-group">
            <div class="wb-entry-group-header">
              <span class="wb-entry-group-date">${label}</span>
              <div class="wb-entry-group-total">
                <span>Total: ${dh}:${dm}:${ds}</span>
                <span style="color: #047857; background: #ecfdf5; padding: 2px 8px; border-radius: 4px;">${groupSym}${dayAmount.toFixed(2)}</span>
              </div>
            </div>
            <div>
              ${entriesHtml}
            </div>
          </div>
        `;
      })
      .join('');

    // Attach actions: Click Time or Duration or Edit Button
    listContainer.querySelectorAll('.btn-edit-entry-time').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const entry = allEntries.find((item) => item.id === id);
        if (entry) {
          openTimeEntryModal({
            entry,
            clients: availableClients,
            onSave: () => {
              loadEntries();
            }
          });
        }
      });
    });

    // Attach actions: Quick Restart
    listContainer.querySelectorAll('.btn-restart-entry').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const entry = allEntries.find((e) => e.id === id);
        if (!entry) return;

        // Populate tracker bar
        const client = availableClients.find((c) => c.id === entry.client_id) || {
          id: entry.client_id,
          name: entry.client_name,
          currency: entry.client_currency || 'USD',
          hourly_rate: entry.client_rate || 100
        };

        trackerInstance.populate({
          description: entry.description || entry.task_title,
          client
        });

        // Trigger start
        try {
          const res = await apiRequest('/tracking/start', {
            method: 'POST',
            body: JSON.stringify({
              description: entry.description || entry.task_title,
              clientId: entry.client_id,
              billable: entry.billable !== false
            })
          });
          store.setState('activeSession', res);
        } catch (err) {
          alert('Could not restart timer: ' + err.message);
        }
      });
    });

    // Attach actions: Delete Entry
    listContainer.querySelectorAll('.btn-delete-entry').forEach((btn) => {
      btn.addEventListener('mouseenter', () => { btn.style.color = '#ef4444'; });
      btn.addEventListener('mouseleave', () => { btn.style.color = '#cbd5e1'; });
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this time entry?')) {
          try {
            await apiRequest(`/time-entries/${id}`, { method: 'DELETE' });
            await loadEntries();
          } catch (err) {
            alert('Failed to delete entry: ' + err.message);
          }
        }
      });
    });
  };

  // Wire filter listeners
  container.querySelector('#input-entries-search')?.addEventListener('input', () => {
    renderEntriesList(filterEntries());
  });
  container.querySelector('#select-filter-client')?.addEventListener('change', () => {
    renderEntriesList(filterEntries());
  });
  container.querySelector('#select-filter-billable')?.addEventListener('change', () => {
    renderEntriesList(filterEntries());
  });

  // Initial load
  await loadClientsFilter();
  await loadEntries();
}
