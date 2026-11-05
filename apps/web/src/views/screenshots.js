import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openModal } from '../components/modal.js';
import { captureManager } from '../core/capture.js';

export async function renderScreenshotsView(container) {
  const role = store.getState('workspaceRole');
  if (role === 'client') {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 4rem;">
        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--status-danger);">Access Restricted</h2>
        <p style="color: var(--text-muted); margin-top: 0.5rem;">
          In accordance with tenant privacy and security policies, clients are not permitted to view desktop activity screenshots.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Screenshot Monitoring Gallery</h1>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
            Periodic randomized desktop captures with keyboard/mouse activity percentage metrics.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button id="btn-manual-capture" class="btn btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Capture Now</span>
          </button>
        </div>
      </div>

      <div id="screenshots-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
        <div class="card skeleton" style="height: 220px;"></div>
        <div class="card skeleton" style="height: 220px;"></div>
        <div class="card skeleton" style="height: 220px;"></div>
      </div>
    </div>
  `;

  const loadScreenshots = async () => {
    try {
      const shots = await apiRequest('/screenshots');
      const grid = container.querySelector('#screenshots-grid');

      if (shots.length === 0) {
        grid.innerHTML = `
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
            <p style="color: var(--text-muted);">No screenshots recorded yet. Start tracking a task to initiate screen captures.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = shots
        .map((s) => {
          const timeStr = new Date(s.taken_at).toLocaleTimeString();
          const dateStr = new Date(s.taken_at).toLocaleDateString();

          const isDataUrl = s.storage_path.startsWith('data:image');
          const imgSrc = isDataUrl ? s.storage_path : 'https://placehold.co/600x340/0f172a/ffffff?text=Screen+Capture';

          return `
          <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
            <div style="position: relative; cursor: pointer;" class="screenshot-thumb" data-id="${s.id}">
              <img src="${imgSrc}" alt="Capture frame" style="width: 100%; height: 160px; object-fit: cover; background: #000;" />
              <div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.75); color: #fff; padding: 2px 8px; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; font-family: var(--font-mono);">
                ${s.activity_percent}% Activity
              </div>
            </div>

            <div style="padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem;">
                <strong>${s.userName}</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${timeStr}</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${s.taskKey ? `${s.taskKey}: ` : ''}${s.taskTitle || 'Workspace'}
              </div>
              <div style="font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px;">
                ${s.window_title || s.app_name || 'Active Session'}
              </div>
            </div>
          </div>
        `;
        })
        .join('');

      // Lightbox preview on thumbnail click
      grid.querySelectorAll('.screenshot-thumb').forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const id = thumb.getAttribute('data-id');
          const item = shots.find((x) => x.id === id);
          if (item) showLightbox(item, loadScreenshots);
        });
      });
    } catch (err) {
      container.querySelector('#screenshots-grid').innerHTML = `
        <div class="card" style="grid-column: 1 / -1; color: var(--status-danger);">Failed to load screenshots: ${err.message}</div>
      `;
    }
  };

  await loadScreenshots();

  // Manual Capture button
  container.querySelector('#btn-manual-capture')?.addEventListener('click', async () => {
    const active = store.getState('activeTimer');
    if (!active) {
      alert('Please start a timer on a task first before capturing a frame.');
      return;
    }
    await captureManager.captureFrame();
    setTimeout(loadScreenshots, 500);
  });
}

function showLightbox(item, onDelete) {
  const isDataUrl = item.storage_path.startsWith('data:image');
  const imgSrc = isDataUrl ? item.storage_path : 'https://placehold.co/1280x720/0f172a/ffffff?text=Screen+Capture';

  openModal({
    title: `Screenshot: ${item.userName} (${item.activity_percent}% Activity)`,
    contentHtml: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <img src="${imgSrc}" style="width: 100%; max-height: 480px; object-fit: contain; background: #000; border-radius: var(--radius-md);" />
        <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-secondary);">
          <div>
            <strong>Application:</strong> ${item.app_name || 'Desktop Workspace'}<br/>
            <strong>Window:</strong> ${item.window_title || 'Session'}<br/>
            <strong>Captured:</strong> ${new Date(item.taken_at).toLocaleString()}
          </div>
          <button id="btn-delete-shot" class="btn btn-sm btn-danger" style="align-self: flex-end;">Delete Frame</button>
        </div>
      </div>
    `,
    onMount: (overlay, close) => {
      overlay.querySelector('#btn-delete-shot')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this screenshot?')) return;
        try {
          await apiRequest(`/screenshots/${item.id}`, { method: 'DELETE' });
          close();
          onDelete();
        } catch (err) {
          alert('Delete error: ' + err.message);
        }
      });
    }
  });
}
