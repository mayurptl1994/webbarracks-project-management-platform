import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';

export async function renderSettingsView(container) {
  const ws = store.getState('workspace');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 800px;">
      <div>
        <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Workspace Settings</h1>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
          Configure rounding rules, forgotten-timer thresholds, and monitoring compliance.
        </p>
      </div>

      <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem;">
        <h3 style="font-size: 1.125rem; font-weight: 700;">General Information</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Workspace Name</label>
            <input value="${ws?.name || 'Acme Technologies'}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
          </div>
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Currency</label>
            <input value="${ws?.currency || 'USD'}" readonly style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-subtle);" />
          </div>
        </div>
      </div>

      <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem;">
        <h3 style="font-size: 1.125rem; font-weight: 700;">Time Tracking & Rounding Policies</h3>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Billing Rounding Rule</label>
            <select style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">
              <option value="none" selected>Exact seconds (no rounding)</option>
              <option value="5">Round nearest 5 minutes</option>
              <option value="15">Round nearest 15 minutes</option>
              <option value="30">Round nearest 30 minutes</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Forgotten-Timer Auto-Stop (Hours)</label>
            <input type="number" value="12" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
          </div>
        </div>

        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
          <input type="checkbox" checked /> Require specific task selection before timer can run
        </label>
      </div>

      <div class="card" style="display: flex; flex-direction: column; gap: 1.25rem;">
        <h3 style="font-size: 1.125rem; font-weight: 700;">Screen Monitoring & Privacy Policy</h3>

        <div style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5;">
          Explicit user consent is audited upon workspace joining. Screenshots are captured only while a project timer is actively running and stored in encrypted private storage.
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Randomized Capture Interval</label>
            <select style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">
              <option value="5">Every 5 minutes</option>
              <option value="10" selected>Every 10 minutes (Recommended)</option>
              <option value="20">Every 20 minutes</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">User Deletion Grace Window</label>
            <select style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">
              <option value="5" selected>5 minutes after capture</option>
              <option value="15">15 minutes after capture</option>
              <option value="0">Disabled (Admins only)</option>
            </select>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button class="btn btn-primary" onclick="alert('Settings successfully updated.')">Save Changes</button>
      </div>
    </div>
  `;
}
