import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { captureManager } from '../core/capture.js';
import * as FilePond from 'filepond';

export async function renderTrackingView(container) {
  const user = store.getState('currentUser');
  let tasks = [];
  try {
    tasks = await apiRequest('/tasks');
  } catch {
    tasks = [];
  }

  const taskOptions = (tasks && tasks.length > 0)
    ? tasks.map((t) => ({ id: t.id, label: `[${t.key}] ${t.title}` }))
    : [
        { id: 'task-1', label: '[CLOUD-1] Setup Terraform infrastructure modules for VPC and Kubernetes' },
        { id: 'task-2', label: '[PORTAL-1] Build responsive customer metrics dashboard' },
        { id: 'task-3', label: '[PORTAL-2] Realtime Timesheet Approval Flow' }
      ];

  let selectedTaskId = taskOptions[0].id;
  let selectedTarget = taskOptions[0].label;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 960px;">
      <!-- Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Tracking Console</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            User-specific time tracking and authorized background monitoring for <strong>${user?.full_name || 'User'}</strong>.
          </p>
        </div>
      </div>

      <!-- Active Session Control Console Card -->
      <div class="wb-card" style="border: 1px solid var(--border-strong); box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-default); padding-bottom: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div id="tracking-status-indicator" style="width: 12px; height: 12px; border-radius: 50%; background: #94a3b8;"></div>
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">TRACKING STATUS</div>
              <div id="tracking-status-text" style="font-size: 1rem; font-weight: 700;">Idle (No Session Active)</div>
            </div>
          </div>

          <div id="clock-display" style="font-family: var(--font-mono); font-size: 2.25rem; font-weight: 700; letter-spacing: -0.03em; color: var(--text-primary);">
            00:00:00
          </div>
        </div>

        <!-- Target Selector (NiceSelect Styled) -->
        <div style="margin-bottom: 1.25rem;">
          <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem;">Assigned Project Task / Deliverable *</label>
          <div class="nice-select-custom" id="custom-target-select">
            <div class="nice-select-trigger" id="target-trigger">
              <span id="selected-target-label">${taskOptions[0].label}</span>
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
            </div>
            <div class="nice-select-dropdown" id="target-dropdown">
              ${taskOptions.map((t, idx) => `<div class="nice-select-option ${idx === 0 ? 'selected' : ''}" data-task-id="${t.id}" data-value="${t.label}">${t.label}</div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Disclosed Monitoring Transparency Notice -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 0.875rem 1rem; margin-bottom: 1.25rem; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>User-Authorized Monitoring Disclosure</span>
          </div>
          Starting this session enables background screenshot capture at your configured interval (every ${user?.tracking_permissions?.screenshot_interval_minutes || 5} min). Capture only occurs while this session is active.
        </div>

        <!-- Controls (Start / Pause / Resume / Stop) -->
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button id="btn-start-session" class="btn-wb-primary" style="padding: 0.625rem 1.25rem; font-size: 0.875rem;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
            <span>Start Authorized Session</span>
          </button>

          <button id="btn-pause-session" class="btn-wb-outline" style="display: none; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 9v6m4-6v6"/></svg>
            <span>Pause</span>
          </button>

          <button id="btn-resume-session" class="btn-wb-primary" style="display: none; padding: 0.625rem 1.25rem; font-size: 0.875rem;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
            <span>Resume</span>
          </button>

          <button id="btn-stop-session" class="btn-wb-outline" style="display: none; padding: 0.625rem 1.25rem; font-size: 0.875rem; color: var(--status-danger); border-color: #fecaca;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>
            <span>Stop &amp; Save Session</span>
          </button>
        </div>
      </div>

      <!-- FilePond Document / Attachment Upload Section -->
      <div class="wb-card">
        <div class="wb-card-header">
          <div>
            <div class="wb-card-title">Session Deliverables &amp; Artifact Uploads</div>
            <div class="wb-card-subtitle">FilePond integrated: Drag and drop project assets, code diffs, or review documents</div>
          </div>
        </div>

        <input type="file" class="filepond" id="filepond-uploader" multiple data-max-file-size="10MB" data-max-files="5" />
      </div>

      <!-- Tracking Session History -->
      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <div style="padding: 1.25rem; border-bottom: 1px solid var(--border-default);">
          <div class="wb-card-title">Session History &amp; Records</div>
          <div class="wb-card-subtitle">Logged sessions with precise timestamps and durations</div>
        </div>

        <table class="wb-table">
          <thead>
            <tr>
              <th>DATE &amp; TIME</th>
              <th>TARGET POINT</th>
              <th>DURATION</th>
              <th>MONITORING</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody id="session-history-body">
            <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading session history...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Initialize NiceSelect Dropdown Logic
  const trigger = container.querySelector('#target-trigger');
  const dropdown = container.querySelector('#target-dropdown');
  const label = container.querySelector('#selected-target-label');

  trigger.addEventListener('click', () => {
    dropdown.classList.toggle('open');
  });

  dropdown.querySelectorAll('.nice-select-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      selectedTarget = opt.getAttribute('data-value');
      selectedTaskId = opt.getAttribute('data-task-id') || selectedTaskId;
      label.textContent = selectedTarget;
      dropdown.querySelectorAll('.nice-select-option').forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      dropdown.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  // Initialize FilePond
  const pondInput = container.querySelector('#filepond-uploader');
  const pond = FilePond.create(pondInput, {
    allowMultiple: true,
    name: 'deliverables',
    labelIdle: 'Drag & Drop your session files or <span class="filepond--label-action">Browse</span>'
  });

  // Timer Tick Mechanism
  let tickInterval = null;
  const clockEl = container.querySelector('#clock-display');
  const indicatorEl = container.querySelector('#tracking-status-indicator');
  const statusTextEl = container.querySelector('#tracking-status-text');

  const btnStart = container.querySelector('#btn-start-session');
  const btnPause = container.querySelector('#btn-pause-session');
  const btnResume = container.querySelector('#btn-resume-session');
  const btnStop = container.querySelector('#btn-stop-session');

  const syncUI = (session) => {
    clearInterval(tickInterval);

    if (!session || session.status === 'completed') {
      indicatorEl.style.background = '#94a3b8';
      indicatorEl.className = '';
      statusTextEl.textContent = 'Idle (No Session Active)';
      clockEl.textContent = '00:00:00';

      btnStart.style.display = 'inline-flex';
      btnPause.style.display = 'none';
      btnResume.style.display = 'none';
      btnStop.style.display = 'none';
      captureManager.stopCapture();
    } else if (session.status === 'active') {
      indicatorEl.style.background = '#dc2626';
      indicatorEl.className = 'pulse-dot';
      statusTextEl.innerHTML = `<span style="color: #dc2626; font-weight: 700;">Recording Active:</span> ${session.target_name}`;

      btnStart.style.display = 'none';
      btnPause.style.display = 'inline-flex';
      btnResume.style.display = 'none';
      btnStop.style.display = 'inline-flex';

      const updateClock = () => {
        const now = Date.now();
        const segment = Math.floor((now - new Date(session.started_at).getTime()) / 1000);
        const total = (session.duration_seconds || 0) + segment;

        const h = String(Math.floor(total / 3600)).padStart(2, '0');
        const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
        const s = String(total % 60).padStart(2, '0');
        clockEl.textContent = `${h}:${m}:${s}`;
      };

      updateClock();
      tickInterval = setInterval(updateClock, 1000);

      // Start screen capture
      captureManager.startCapture();
    } else if (session.status === 'paused') {
      indicatorEl.style.background = '#f59e0b';
      indicatorEl.className = '';
      statusTextEl.innerHTML = `<span style="color: #f59e0b; font-weight: 700;">Paused:</span> ${session.target_name}`;

      const total = session.duration_seconds || 0;
      const h = String(Math.floor(total / 3600)).padStart(2, '0');
      const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
      const s = String(total % 60).padStart(2, '0');
      clockEl.textContent = `${h}:${m}:${s}`;

      btnStart.style.display = 'none';
      btnPause.style.display = 'none';
      btnResume.style.display = 'inline-flex';
      btnStop.style.display = 'inline-flex';
    }
  };

  // Check active session on load
  const loadActive = async () => {
    const res = await apiRequest('/tracking/active');
    store.setState('activeSession', res.active);
    syncUI(res.active);
  };

  await loadActive();

  // Button actions
  btnStart.addEventListener('click', async () => {
    try {
      const session = await apiRequest('/tracking/start', {
        method: 'POST',
        body: JSON.stringify({ taskId: selectedTaskId, targetName: selectedTarget })
      });
      store.setState('activeSession', session);
      syncUI(session);
      loadHistory();
    } catch (err) {
      alert('Failed to start session: ' + err.message);
    }
  });

  btnPause.addEventListener('click', async () => {
    try {
      const session = await apiRequest('/tracking/pause', { method: 'POST' });
      store.setState('activeSession', session);
      syncUI(session);
      loadHistory();
    } catch (err) {
      alert('Error pausing session: ' + err.message);
    }
  });

  btnResume.addEventListener('click', async () => {
    try {
      const session = await apiRequest('/tracking/resume', { method: 'POST' });
      store.setState('activeSession', session);
      syncUI(session);
      loadHistory();
    } catch (err) {
      alert('Error resuming session: ' + err.message);
    }
  });

  btnStop.addEventListener('click', async () => {
    try {
      await apiRequest('/tracking/stop', { method: 'POST' });
      store.setState('activeSession', null);
      syncUI(null);
      loadHistory();
    } catch (err) {
      alert('Error stopping session: ' + err.message);
    }
  });

  // Load Session History
  const loadHistory = async () => {
    try {
      const history = await apiRequest('/tracking/history');
      const tbody = container.querySelector('#session-history-body');

      if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No tracked sessions yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = history
        .map((s) => {
          const dateStr = new Date(s.started_at).toLocaleString();
          const mins = Math.floor((s.duration_seconds || 0) / 60);
          const secs = (s.duration_seconds || 0) % 60;

          return `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 0.75rem;">${dateStr}</td>
            <td style="font-weight: 700; color: var(--text-primary);">${s.target_name}</td>
            <td style="font-family: var(--font-mono); font-weight: 600;">${mins}m ${secs}s</td>
            <td><span class="status-pill-published" style="background: #10b981;">Authorized</span></td>
            <td><span class="action-log-badge">${s.status.toUpperCase()}</span></td>
          </tr>
        `;
        })
        .join('');
    } catch (err) {
      container.querySelector('#session-history-body').innerHTML = `
        <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--status-danger);">Failed to load history: ${err.message}</td></tr>
      `;
    }
  };

  await loadHistory();
}

