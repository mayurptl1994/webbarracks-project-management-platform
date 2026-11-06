import { apiRequest } from '../core/api.js';
import { openModal } from './modal.js';
import { CURRENCY_SYMBOLS, formatRateWithCurrency } from '../views/clients.js';
import { createRichTextEditor } from './rich-editor.js';

/**
 * Parses time string (e.g. "07:55 pm", "7:55 PM", "19:55") into 24-hour "HH:mm"
 */
export function parseTimeTo24H(timeStr) {
  if (!timeStr) return '09:00';
  const clean = timeStr.trim().toLowerCase();
  const isPM = clean.includes('pm');
  const isAM = clean.includes('am');
  const numbers = clean.replace(/[^\d:]/g, '');
  const parts = numbers.split(':').map(Number);
  let h = isNaN(parts[0]) ? 9 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats 24-hour "HH:mm" into 12-hour "hh:mm a" (e.g. "07:55 pm")
 */
export function format24HTo12H(time24) {
  if (!time24) return '09:00 am';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) h = 9;
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Formats duration in seconds to HH:MM:SS
 */
export function formatDurationHms(seconds) {
  const sec = Math.max(0, Math.floor(seconds || 0));
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Parses duration input like "01:30:00", "45m", "1.5h", or "90"
 */
export function parseDurationInput(str) {
  if (!str) return 0;
  str = String(str).trim().toLowerCase();

  // Format hh:mm:ss or hh:mm
  if (str.includes(':')) {
    const parts = str.split(':').map((p) => Number(p) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 3600 + parts[1] * 60;
    }
  }

  // Format like "1.5h", "90m", "45s"
  if (str.endsWith('h')) {
    return Math.round((parseFloat(str) || 0) * 3600);
  }
  if (str.endsWith('m')) {
    return Math.round((parseFloat(str) || 0) * 60);
  }
  if (str.endsWith('s')) {
    return Math.round(parseFloat(str) || 0);
  }

  // Pure number treated as minutes if < 24, else seconds
  const num = parseFloat(str) || 0;
  if (num <= 24) return Math.round(num * 3600); // 2 -> 2 hours
  return Math.round(num * 60); // 45 -> 45 minutes
}

/**
 * Calculates duration in seconds between two 24H times ("HH:mm")
 */
export function calculateDurationFromTimes(startTime24, endTime24) {
  const [sh, sm] = (startTime24 || '09:00').split(':').map(Number);
  const [eh, em] = (endTime24 || '10:00').split(':').map(Number);

  let startMin = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm);
  let endMin = (isNaN(eh) ? 10 : eh) * 60 + (isNaN(em) ? 0 : em);

  if (endMin <= startMin) {
    endMin += 24 * 60; // Crosses midnight
  }

  return Math.max(0, (endMin - startMin) * 60);
}

/**
 * Adds seconds to 24H start time and returns 24H end time string
 */
export function addSecondsTo24HTime(startTime24, durationSec) {
  const [sh, sm] = (startTime24 || '09:00').split(':').map(Number);
  const totalMin = Math.round(((isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm) + durationSec / 60) % (24 * 60));
  const eh = Math.floor(totalMin / 60);
  const em = totalMin % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

/**
 * Opens the interactive modal to edit time, date, duration, and details of an entry
 */
export function openTimeEntryModal({ entry, clients = [], onSave }) {
  if (!entry) return;

  const renderModalWithClients = (allClients) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const initialDate = entry.date || todayStr;
    const initialStart24 = parseTimeTo24H(entry.start_time || '09:00');
    let initialEnd24 = parseTimeTo24H(entry.end_time || '10:00');

    let currentDurationSec = Number(entry.duration_seconds) || 0;
    if (currentDurationSec <= 0) {
      currentDurationSec = calculateDurationFromTimes(initialStart24, initialEnd24);
    } else {
      if (initialEnd24 === initialStart24 && currentDurationSec > 0) {
        initialEnd24 = addSecondsTo24HTime(initialStart24, currentDurationSec);
      }
    }

    let selectedClientId = entry.client_id;
    let currentClient = allClients.find((c) => c.id === selectedClientId);

    if (!currentClient && entry.client_name) {
      currentClient = allClients.find((c) => c.name.toLowerCase() === entry.client_name.toLowerCase());
      if (currentClient) selectedClientId = currentClient.id;
    }

    if (!currentClient && allClients.length > 0) {
      currentClient = allClients.find((c) => c.status === 'active') || allClients[0];
      selectedClientId = currentClient.id;
    }

    if (!currentClient) {
      currentClient = {
        id: 'default',
        name: 'Direct Client',
        currency: 'USD',
        hourly_rate: 0
      };
    }

    let isBillable = entry.billable !== false;
    const isCreating = !entry?.id;
    const title = isCreating ? 'Create Time Entry' : 'Edit Time Entry & Date';

    const clientOptionsHtml = allClients
      .map((c) => `<option value="${c.id}" ${c.id === selectedClientId ? 'selected' : ''}>${c.name} (${CURRENCY_SYMBOLS[c.currency] || '$'}${c.hourly_rate}/hr)</option>`)
      .join('');

    const currentTaskName = entry.task_name || entry.task_title || (isCreating ? '' : (entry.description || 'General Client Work'));
    const currentTaskUrl = entry.task_url || '';

    const contentHtml = `
      <form id="form-edit-time-entry" style="display: flex; flex-direction: column; gap: 1.15rem;">
        
        <!-- 1. Task Name & Client -->
        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 0.75rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
              Task Name *
            </label>
            <input 
              type="text" 
              id="edit-entry-task-name" 
              name="task_name" 
              value="${currentTaskName}" 
              placeholder="e.g. Implement OAuth Flow" 
              required
              style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600;"
            />
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
              Client Tariff
            </label>
            <select 
              id="edit-entry-client" 
              name="client_id" 
              style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem; background: #ffffff;"
            >
              ${clientOptionsHtml || `<option value="${currentClient.id}">${currentClient.name} (${CURRENCY_SYMBOLS[currentClient.currency] || '$'}${currentClient.hourly_rate}/hr)</option>`}
            </select>
          </div>
        </div>

        <!-- 2. Task URL -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <label style="font-size: 0.8125rem; font-weight: 700; color: var(--text-primary);">
              Task URL (Jira / Linear / GitHub / Asana Issue)
            </label>
            ${currentTaskUrl ? `<a href="${currentTaskUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: #2563eb; text-decoration: underline;">Test Link ↗</a>` : ''}
          </div>
          <div style="position: relative; display: flex; align-items: center;">
            <span style="position: absolute; left: 10px; color: var(--text-muted); display: flex;">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </span>
            <input 
              type="url" 
              id="edit-entry-task-url" 
              name="task_url" 
              value="${currentTaskUrl}" 
              placeholder="https://app.asana.com/... or https://github.com/..." 
              style="width: 100%; padding: 0.5rem 0.75rem 0.5rem 2rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.8125rem; font-family: var(--font-mono);"
            />
          </div>
        </div>

        <!-- 3. Description (Rich Text) -->
        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
            Description (Rich Text Notes)
          </label>
          <div id="edit-entry-rich-editor-mount"></div>
        </div>

        <!-- 4. Date Section -->
        <div style="background: #f8fafc; border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
            <label style="font-size: 0.8125rem; font-weight: 700; color: var(--text-primary);">
              Date
            </label>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" id="btn-quick-today" class="btn-wb-outline" style="font-size: 0.6875rem; padding: 2px 8px;">Today</button>
              <button type="button" id="btn-quick-yesterday" class="btn-wb-outline" style="font-size: 0.6875rem; padding: 2px 8px;">Yesterday</button>
            </div>
          </div>
          <input 
            type="date" 
            id="edit-entry-date" 
            name="date" 
            value="${initialDate}" 
            required 
            style="width: 100%; padding: 0.45rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem; font-family: var(--font-mono); background: #ffffff;"
          />
        </div>

        <!-- 5. Time Interval & Duration -->
        <div style="background: #f8fafc; border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em;">
            Time Interval &amp; Duration
          </div>

          <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--text-secondary);">
                Start Time
              </label>
              <input 
                type="time" 
                id="edit-entry-start" 
                name="start_time" 
                value="${initialStart24}" 
                required 
                style="width: 100%; padding: 0.45rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem; font-family: var(--font-mono); background: #ffffff;"
              />
            </div>

            <div style="color: var(--text-muted); font-size: 1rem; margin-top: 1rem;">→</div>

            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--text-secondary);">
                End Time
              </label>
              <input 
                type="time" 
                id="edit-entry-end" 
                name="end_time" 
                value="${initialEnd24}" 
                required 
                style="width: 100%; padding: 0.45rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem; font-family: var(--font-mono); background: #ffffff;"
              />
            </div>
          </div>

          <!-- Duration Direct Input -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; align-items: center; border-top: 1px dashed var(--border-default); padding-top: 0.65rem;">
            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--text-secondary);">
                Duration (HH:MM:SS)
              </label>
              <input 
                type="text" 
                id="edit-entry-duration" 
                name="duration" 
                value="${formatDurationHms(currentDurationSec)}" 
                placeholder="00:00:00"
                style="width: 100%; padding: 0.45rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem; font-family: var(--font-mono); font-weight: 700; background: #ffffff;"
              />
            </div>

            <div>
              <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--text-secondary);">
                Billable Status
              </label>
              <label style="display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.45rem 0; font-size: 0.875rem; font-weight: 600;">
                <input 
                  type="checkbox" 
                  id="edit-entry-billable" 
                  name="billable" 
                  ${isBillable ? 'checked' : ''}
                  style="width: 16px; height: 16px; accent-color: #10b981; cursor: pointer;"
                />
                <span id="billable-label-text" style="color: #047857;">Billable ($)</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 6. Computed Preview Summary Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-md); padding: 0.75rem 1rem;">
          <div>
            <div style="font-size: 0.6875rem; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.05em;">Computed Tariff</div>
            <div id="preview-client-rate" style="font-size: 0.875rem; font-weight: 700; color: #065f46; font-family: var(--font-mono);">
              ${CURRENCY_SYMBOLS[currentClient.currency] || '$'}${currentClient.hourly_rate}/hr
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 0.6875rem; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.05em;">Estimated Earnings</div>
            <div id="preview-amount-calc" style="font-size: 1.125rem; font-weight: 700; color: #047857; font-family: var(--font-mono);">
              $0.00
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--border-default);">
          <button type="button" class="btn-wb-outline" id="btn-edit-modal-cancel">
            Cancel
          </button>
          <button type="submit" class="btn-wb-primary" id="btn-edit-modal-submit">
            Save Changes
          </button>
        </div>
      </form>
    `;

    openModal({
      title,
      contentHtml,
      width: '680px',
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-edit-time-entry');
        const startInput = overlay.querySelector('#edit-entry-start');
        const endInput = overlay.querySelector('#edit-entry-end');
        const durationInput = overlay.querySelector('#edit-entry-duration');
        const billableCheckbox = overlay.querySelector('#edit-entry-billable');
        const billableLabel = overlay.querySelector('#billable-label-text');
        const clientSelect = overlay.querySelector('#edit-entry-client');
        const dateInput = overlay.querySelector('#edit-entry-date');
        const previewRate = overlay.querySelector('#preview-client-rate');
        const previewAmount = overlay.querySelector('#preview-amount-calc');

        // Mount Rich Text Editor
        const richEditorMount = overlay.querySelector('#edit-entry-rich-editor-mount');
        const richEditor = createRichTextEditor({
          placeholder: 'Add detailed task notes, deliverables, and checklist items...',
          initialContent: entry.description || `<p>${currentTaskName}</p>`,
          minHeight: '120px'
        });
        richEditorMount.appendChild(richEditor.element);

        let durationSec = currentDurationSec;

        const refreshCalculations = () => {
          const rate = Number(currentClient?.hourly_rate) || 0;
          const currencySym = CURRENCY_SYMBOLS[currentClient?.currency] || '$';
          const isB = billableCheckbox.checked;
          const hours = durationSec / 3600;
          const total = isB ? Math.round(hours * rate * 100) / 100 : 0;

          if (billableLabel) {
            billableLabel.textContent = isB ? `Billable (${currencySym})` : 'Non-billable';
            billableLabel.style.color = isB ? '#047857' : '#64748b';
          }

          if (previewRate) {
            previewRate.textContent = `${currencySym}${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / hr`;
          }

          if (previewAmount) {
            previewAmount.textContent = isB ? `${currencySym}${total.toFixed(2)}` : 'Non-billable';
          }
        };

        // Client Change
        clientSelect?.addEventListener('change', (e) => {
          const found = allClients.find((c) => c.id === e.target.value);
          if (found) {
            currentClient = found;
            selectedClientId = found.id;
            refreshCalculations();
          }
        });

        // Quick Date Shortcuts
        overlay.querySelector('#btn-quick-today')?.addEventListener('click', () => {
          dateInput.value = todayStr;
        });
        overlay.querySelector('#btn-quick-yesterday')?.addEventListener('click', () => {
          dateInput.value = yesterdayStr;
        });

        // When Start or End time changes, recalculate duration
        const onTimeChange = () => {
          const startVal = startInput.value || '09:00';
          const endVal = endInput.value || '10:00';
          durationSec = calculateDurationFromTimes(startVal, endVal);
          durationInput.value = formatDurationHms(durationSec);
          refreshCalculations();
        };

        startInput?.addEventListener('input', onTimeChange);
        endInput?.addEventListener('input', onTimeChange);

        // When Duration input changes, recalculate end time
        durationInput?.addEventListener('input', (e) => {
          const parsed = parseDurationInput(e.target.value);
          if (parsed > 0) {
            durationSec = parsed;
            const startVal = startInput.value || '09:00';
            endInput.value = addSecondsTo24HTime(startVal, durationSec);
            refreshCalculations();
          }
        });

        durationInput?.addEventListener('blur', () => {
          durationInput.value = formatDurationHms(durationSec);
        });

        billableCheckbox?.addEventListener('change', refreshCalculations);

        // Initial calculation
        refreshCalculations();

        // Cancel button
        overlay.querySelector('#btn-edit-modal-cancel')?.addEventListener('click', close);

        // Submit Form
        form?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const submitBtn = overlay.querySelector('#btn-edit-modal-submit');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving...';

          const start24 = startInput.value || '09:00';
          const end24 = endInput.value || '10:00';
          const start12 = format24HTo12H(start24);
          const end12 = format24HTo12H(end24);

          const hours = Math.round((durationSec / 3600) * 1000) / 1000;
          const rate = Number(currentClient?.hourly_rate) || 0;
          const billable = billableCheckbox.checked;
          const billable_amount = billable ? Math.round((durationSec / 3600) * rate * 100) / 100 : 0;

          const taskNameVal = overlay.querySelector('#edit-entry-task-name')?.value.trim() || entry.task_name || 'General Client Work';
          const taskUrlVal = overlay.querySelector('#edit-entry-task-url')?.value.trim() || '';
          const richDescVal = richEditor.getHtml() || `<p>${taskNameVal}</p>`;

          const payload = {
            date: dateInput.value,
            start_time: start12,
            end_time: end12,
            duration_seconds: durationSec,
            hours,
            billable,
            billable_amount,
            task_name: taskNameVal,
            task_title: taskNameVal,
            task_url: taskUrlVal,
            description: richDescVal,
            client_id: currentClient.id,
            client_name: currentClient.name,
            client_currency: currentClient.currency,
            client_rate: rate,
            client_color: currentClient.color || '#10b981'
          };

          try {
            let updated;
            if (isCreating) {
              updated = await apiRequest('/time-entries', {
                method: 'POST',
                body: JSON.stringify(payload)
              });
            } else {
              updated = await apiRequest(`/time-entries/${entry.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
              });
            }
            close();
            if (onSave) onSave(updated);
            window.dispatchEvent(new CustomEvent('wb-entry-logged', { detail: { entry: updated } }));
          } catch (err) {
            alert('Failed to save time entry: ' + err.message);
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
          }
        });
      }
    });
  };

  if (!clients || clients.length === 0) {
    apiRequest('/clients').then((res) => {
      renderModalWithClients(res && res.length > 0 ? res : []);
    }).catch(() => {
      renderModalWithClients([]);
    });
  } else {
    renderModalWithClients(clients);
  }
}
