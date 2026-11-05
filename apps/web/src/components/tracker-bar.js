import { store } from '../core/store.js';
import { apiRequest } from '../core/api.js';
import { CURRENCY_SYMBOLS, formatRateWithCurrency, showClientModal } from '../views/clients.js';

/**
 * Creates the Time Tracker Bar matching the reference design
 * @param {Object} options
 * @param {Function} options.onEntryLogged - Callback invoked whenever an entry is logged/stopped
 */
export function createTrackerBar({ onEntryLogged } = {}) {
  const container = document.createElement('div');
  container.className = 'wb-tracker-wrapper';
  container.style.width = '100%';

  let clients = [];
  let selectedClient = null;
  let isBillable = true;
  let mode = 'timer'; // 'timer' | 'manual'
  let timerInterval = null;

  container.innerHTML = `
    <div class="wb-tracker-bar" id="tracker-bar-main">
      <!-- 1. What are you working on? -->
      <input 
        type="text" 
        id="tracker-desc-input" 
        class="wb-tracker-input" 
        placeholder="What are you working on? (Task name)" 
        autocomplete="off"
      />

      <!-- 1b. Task URL Button & Popover -->
      <div style="position: relative;" id="tracker-url-container">
        <button 
          type="button" 
          class="wb-tracker-icon-btn" 
          id="tracker-url-btn" 
          title="Attach Task URL (Jira, Linear, GitHub...)"
          style="color: var(--text-muted);"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </button>

        <div id="tracker-url-popover" style="display: none; position: absolute; top: calc(100% + 8px); left: 0; background: #ffffff; border: 1px solid var(--border-strong); border-radius: var(--radius-md); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); width: 280px; padding: 0.75rem; z-index: 100;">
          <div style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem;">
            Attach Task URL
          </div>
          <input 
            type="url" 
            id="tracker-url-input" 
            placeholder="https://jira.company.com/browse/ENG-104" 
            style="width: 100%; padding: 0.4rem 0.6rem; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); font-size: 0.75rem; font-family: var(--font-mono);"
          />
          <div style="display: flex; justify-content: flex-end; gap: 0.35rem; margin-top: 0.5rem;">
            <button type="button" id="tracker-url-done-btn" class="btn-wb-primary" style="font-size: 0.6875rem; padding: 3px 8px;">Done</button>
          </div>
        </div>
      </div>

      <!-- 2. Client Selector Pill -->
      <div style="position: relative;" id="tracker-client-container">
        <button type="button" class="wb-tracker-client-pill" id="tracker-client-btn">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span id="tracker-client-label">Client</span>
        </button>

        <!-- Dropdown Popover -->
        <div id="tracker-client-menu" style="display: none; position: absolute; top: calc(100% + 8px); left: 0; background: #ffffff; border: 1px solid var(--border-strong); border-radius: var(--radius-md); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); width: 280px; z-index: 100; overflow: hidden;">
          <div style="padding: 0.4rem 0.75rem; font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-default); display: flex; align-items: center; justify-content: space-between;">
            <span>Select Client Tariff</span>
          </div>
          <div id="tracker-client-list" style="max-height: 220px; overflow-y: auto; padding: 0.35rem 0;">
            <div style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.75rem;">Loading clients...</div>
          </div>
          <div style="border-top: 1px solid var(--border-default); padding: 0.4rem 0.5rem; background: #f8fafc;">
            <button type="button" id="tracker-add-client-inline-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.45rem 0.6rem; font-size: 0.8125rem; font-weight: 600; color: #0f172a; background: #ffffff; border: 1px dashed var(--border-strong); border-radius: var(--radius-sm); cursor: pointer; transition: background 150ms ease;">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>+ Add New Client</span>
            </button>
          </div>
        </div>
      </div>

      <div class="wb-tracker-divider"></div>

      <!-- 3. Billable Toggle Icon -->
      <button 
        type="button" 
        class="wb-tracker-icon-btn ${isBillable ? 'active' : ''}" 
        id="tracker-billable-btn" 
        title="Toggle Billable ($)"
      >
        <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      </button>

      <!-- 4. Timer Controls Section (Timer Mode) -->
      <div id="tracker-timer-controls" style="display: flex; align-items: center; gap: 0.85rem;">
        <div class="wb-tracker-clock" id="tracker-clock-display">00:00:00</div>
        
        <button type="button" class="wb-tracker-btn-start" id="tracker-toggle-btn">
          <span>START</span>
        </button>
      </div>

      <!-- 4b. Manual Controls Section (Manual Mode, hidden by default) -->
      <div id="tracker-manual-controls" style="display: none; align-items: center; gap: 0.5rem;">
        <input 
          type="time" 
          id="manual-start-time" 
          value="09:00" 
          style="padding: 0.35rem 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 0.8125rem;"
        />
        <span style="color: var(--text-muted); font-size: 0.8125rem;">–</span>
        <input 
          type="time" 
          id="manual-end-time" 
          value="11:30" 
          style="padding: 0.35rem 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 0.8125rem;"
        />
        <button type="button" class="wb-tracker-btn-start" id="tracker-manual-add-btn">
          <span>ADD</span>
        </button>
      </div>

      <!-- 5. Mode Switcher (Timer vs Manual Icon) -->
      <button 
        type="button" 
        class="wb-tracker-icon-btn" 
        id="tracker-mode-btn" 
        title="Switch to Manual Entry / Timer Mode"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </button>
    </div>
  `;

  const descInput = container.querySelector('#tracker-desc-input');
  const clientBtn = container.querySelector('#tracker-client-btn');
  const clientLabel = container.querySelector('#tracker-client-label');
  const clientMenu = container.querySelector('#tracker-client-menu');
  const clientList = container.querySelector('#tracker-client-list');
  const billableBtn = container.querySelector('#tracker-billable-btn');
  const clockDisplay = container.querySelector('#tracker-clock-display');
  const toggleBtn = container.querySelector('#tracker-toggle-btn');
  const modeBtn = container.querySelector('#tracker-mode-btn');
  const timerControls = container.querySelector('#tracker-timer-controls');
  const manualControls = container.querySelector('#tracker-manual-controls');
  const manualStartTime = container.querySelector('#manual-start-time');
  const manualEndTime = container.querySelector('#manual-end-time');
  const manualAddBtn = container.querySelector('#tracker-manual-add-btn');

  let attachedTaskUrl = '';
  const urlBtn = container.querySelector('#tracker-url-btn');
  const urlPopover = container.querySelector('#tracker-url-popover');
  const urlInput = container.querySelector('#tracker-url-input');
  const urlDoneBtn = container.querySelector('#tracker-url-done-btn');

  urlBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = urlPopover.style.display === 'none';
    urlPopover.style.display = isHidden ? 'block' : 'none';
    if (isHidden) urlInput?.focus();
  });

  const syncUrlState = () => {
    attachedTaskUrl = urlInput?.value.trim() || '';
    if (attachedTaskUrl) {
      urlBtn.style.color = '#2563eb';
      urlBtn.title = `Attached Task URL: ${attachedTaskUrl}`;
    } else {
      urlBtn.style.color = 'var(--text-muted)';
      urlBtn.title = 'Attach Task URL (Jira, Linear, GitHub...)';
    }
  };

  urlInput?.addEventListener('input', syncUrlState);
  urlDoneBtn?.addEventListener('click', () => {
    syncUrlState();
    urlPopover.style.display = 'none';
  });

  // Load Clients into dropdown
  const loadClients = async () => {
    try {
      clients = await apiRequest('/clients');
      if (clients && clients.length > 0) {
        // Default to first active client
        const active = clients.find((c) => c.status === 'active') || clients[0];
        setClient(active);

        clientList.innerHTML = clients
          .map((c) => {
            const sym = CURRENCY_SYMBOLS[c.currency] || '$';
            return `
              <div class="tracker-client-option" data-id="${c.id}" style="padding: 0.5rem 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; transition: background 120ms ease;">
                <div style="overflow: hidden;">
                  <div style="font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${c.name}</div>
                  <div style="font-size: 0.6875rem; color: var(--text-muted);">${c.company || 'Direct Client'}</div>
                </div>
                <span style="font-size: 0.75rem; font-family: var(--font-mono); font-weight: 700; color: #047857; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">
                  ${sym}${c.hourly_rate}/hr
                </span>
              </div>
            `;
          })
          .join('');

        clientList.querySelectorAll('.tracker-client-option').forEach((opt) => {
          opt.addEventListener('mouseenter', () => { opt.style.background = '#f8fafc'; });
          opt.addEventListener('mouseleave', () => { opt.style.background = 'transparent'; });
          opt.addEventListener('click', () => {
            const cid = opt.getAttribute('data-id');
            const found = clients.find((c) => c.id === cid);
            if (found) setClient(found);
            clientMenu.style.display = 'none';
          });
        });
      } else {
        clientList.innerHTML = `<div style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.75rem;">No clients available.</div>`;
      }
    } catch (err) {
      console.warn('Failed to load clients for tracker bar:', err);
    }
  };

  const setClient = (client) => {
    selectedClient = client;
    if (client) {
      const sym = CURRENCY_SYMBOLS[client.currency] || '$';
      clientLabel.innerHTML = `
        <span style="font-weight: 700; color: #0f172a;">${client.name}</span>
        <span style="font-size: 0.6875rem; color: #047857; font-family: var(--font-mono); font-weight: 700; background: #ecfdf5; padding: 1px 4px; border-radius: 3px;">${sym}${client.hourly_rate}/hr</span>
      `;
      clientBtn.classList.add('selected');
    } else {
      clientLabel.textContent = 'Client';
      clientBtn.classList.remove('selected');
    }
  };

  // Toggle client dropdown
  clientBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = clientMenu.style.display === 'none';
    clientMenu.style.display = isHidden ? 'block' : 'none';
  });

  // Inline Add New Client
  const inlineAddClientBtn = container.querySelector('#tracker-add-client-inline-btn');
  inlineAddClientBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    clientMenu.style.display = 'none';
    showClientModal(null, async (createdClient) => {
      await loadClients();
      if (createdClient) {
        setClient(createdClient);
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      clientMenu.style.display = 'none';
      if (urlPopover) urlPopover.style.display = 'none';
    }
  });

  // Billable toggle
  billableBtn.addEventListener('click', () => {
    isBillable = !isBillable;
    billableBtn.classList.toggle('active', isBillable);
    billableBtn.style.color = isBillable ? '#047857' : '#94a3b8';
  });

  // Mode Switcher (Timer vs Manual)
  modeBtn.addEventListener('click', () => {
    if (mode === 'timer') {
      mode = 'manual';
      timerControls.style.display = 'none';
      manualControls.style.display = 'flex';
      modeBtn.title = 'Switch to Timer Mode';
      modeBtn.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      `;
    } else {
      mode = 'timer';
      manualControls.style.display = 'none';
      timerControls.style.display = 'flex';
      modeBtn.title = 'Switch to Manual Mode';
      modeBtn.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      `;
    }
  });

  // Timer Tick Engine
  const startClock = (startTime, initialSec = 0) => {
    clearInterval(timerInterval);
    clockDisplay.classList.add('ticking');
    toggleBtn.className = 'wb-tracker-btn-stop';
    toggleBtn.innerHTML = `<span>STOP</span>`;

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - new Date(startTime).getTime()) / 1000);
      const totalSec = Math.max(0, initialSec + elapsed);

      const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');
      clockDisplay.textContent = `${h}:${m}:${s}`;
    };

    tick();
    timerInterval = setInterval(tick, 1000);
  };

  const stopClock = () => {
    clearInterval(timerInterval);
    clockDisplay.classList.remove('ticking');
    clockDisplay.textContent = '00:00:00';
    toggleBtn.className = 'wb-tracker-btn-start';
    toggleBtn.innerHTML = `<span>START</span>`;
  };

  // Start / Stop Click Handler
  toggleBtn.addEventListener('click', async () => {
    const active = store.getState('activeSession');

    if (active && active.status === 'active') {
      // STOP TIMER
      toggleBtn.disabled = true;
      toggleBtn.textContent = 'STOPPING...';
      try {
        const res = await apiRequest('/tracking/stop', { method: 'POST' });
        store.setState('activeSession', null);
        stopClock();
        descInput.value = '';
        if (onEntryLogged) onEntryLogged(res.entry);
      } catch (err) {
        alert('Failed to stop timer: ' + err.message);
      } finally {
        toggleBtn.disabled = false;
      }
    } else {
      // START TIMER
      const desc = descInput.value.trim() || 'General Client Work';
      toggleBtn.disabled = true;
      toggleBtn.textContent = 'STARTING...';

      try {
        const res = await apiRequest('/tracking/start', {
          method: 'POST',
          body: JSON.stringify({
            description: desc,
            task_name: desc,
            task_url: attachedTaskUrl,
            clientId: selectedClient?.id,
            billable: isBillable
          })
        });

        store.setState('activeSession', res);
        startClock(res.started_at, 0);
      } catch (err) {
        alert('Failed to start timer: ' + err.message);
        stopClock();
      } finally {
        toggleBtn.disabled = false;
      }
    }
  });

  // Manual Add Handler
  manualAddBtn.addEventListener('click', async () => {
    const desc = descInput.value.trim() || 'Manual Client Session';
    const startVal = manualStartTime.value || '09:00';
    const endVal = manualEndTime.value || '11:00';

    const [sh, sm] = startVal.split(':').map(Number);
    const [eh, em] = endVal.split(':').map(Number);
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin <= startMin) endMin += 24 * 60; // Crosses midnight

    const diffHours = Math.max(0.25, (endMin - startMin) / 60);

    manualAddBtn.disabled = true;
    manualAddBtn.textContent = 'SAVING...';

    try {
      const res = await apiRequest('/time-entries', {
        method: 'POST',
        body: JSON.stringify({
          task_name: desc,
          task_title: desc,
          task_url: attachedTaskUrl,
          description: `<p>${desc}</p>`,
          client_id: selectedClient?.id,
          start_time: startVal,
          end_time: endVal,
          hours: diffHours,
          duration_seconds: diffHours * 3600,
          billable: isBillable
        })
      });

      descInput.value = '';
      if (urlInput) urlInput.value = '';
      syncUrlState();
      if (onEntryLogged) onEntryLogged(res);
    } catch (err) {
      alert('Failed to add manual entry: ' + err.message);
    } finally {
      manualAddBtn.disabled = false;
      manualAddBtn.textContent = 'ADD';
    }
  });

  // Sync with global store for existing active sessions
  store.subscribe('activeSession', (session) => {
    if (session && session.status === 'active') {
      if (session.task_title && !descInput.value) {
        descInput.value = session.task_title;
      }
      if (session.client_id && (!selectedClient || selectedClient.id !== session.client_id)) {
        const found = clients.find((c) => c.id === session.client_id);
        if (found) setClient(found);
      }
      startClock(session.started_at, session.duration_seconds || 0);
    } else {
      stopClock();
    }
  });

  // Initial active session check
  const currentActive = store.getState('activeSession');
  if (currentActive && currentActive.status === 'active') {
    if (currentActive.task_title) descInput.value = currentActive.task_title;
    startClock(currentActive.started_at, currentActive.duration_seconds || 0);
  }

  loadClients();

  return {
    element: container,
    populate: ({ description, client, taskUrl }) => {
      if (description) descInput.value = description;
      if (client) setClient(client);
      if (taskUrl && urlInput) {
        urlInput.value = taskUrl;
        syncUrlState();
      }
    }
  };
}

