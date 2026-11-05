import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openModal } from '../components/modal.js';
import { captureManager } from '../core/capture.js';

export async function renderScreenshotsView(container) {
  const user = store.getState('currentUser');
  const isAdmin = user?.role === 'admin';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Screen Monitoring Records</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Transparent, user-authorized background captures logged during active tracking sessions.
          </p>
        </div>

        <button id="btn-snap-frame" class="btn-wb-primary">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Take Test Capture</span>
        </button>
      </div>

      <!-- Screenshot Grid -->
      <div id="screenshots-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
        <div class="wb-card" style="height: 220px; background: var(--bg-subtle);"></div>
        <div class="wb-card" style="height: 220px; background: var(--bg-subtle);"></div>
      </div>
    </div>
  `;

  const loadScreenshots = async () => {
    try {
      const shots = await apiRequest('/tracking/screenshots');
      const grid = container.querySelector('#screenshots-grid');

      if (shots.length === 0) {
        grid.innerHTML = `
          <div class="wb-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
            <div style="font-weight: 700; font-size: 1.125rem;">No screenshots captured yet</div>
            <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
              Screenshots are captured automatically during authorized tracking sessions. Click "Take Test Capture" to verify your browser screen capture.
            </p>
          </div>
        `;
        return;
      }

      grid.innerHTML = shots
        .map((s) => {
          const timeStr = new Date(s.taken_at).toLocaleString();
          const isDataUrl = s.storage_path.startsWith('data:image');
          const imgSrc = isDataUrl ? s.storage_path : 'https://placehold.co/600x340/0d0f12/ffffff?text=Authorized+Monitoring+Frame';

          return `
          <div class="wb-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
            <div style="position: relative; cursor: pointer;" class="screenshot-thumb" data-id="${s.id}">
              <img src="${imgSrc}" alt="Capture frame" style="width: 100%; height: 160px; object-fit: cover; background: #000;" />
              <div style="position: absolute; top: 8px; right: 8px; background: rgba(13, 15, 18, 0.85); color: #fff; padding: 2px 8px; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; font-family: var(--font-mono);">
                ${s.activity_percent}% Activity
              </div>
            </div>

            <div style="padding: 0.875rem 1rem; display: flex; flex-direction: column; gap: 0.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem;">
                <strong style="color: var(--text-primary);">${s.user_name}</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${timeStr}</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Target: ${s.target_name}
              </div>
              <div style="font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px;">
                ${s.window_title || s.app_name || 'Active Session'}
              </div>
            </div>
          </div>
        `;
        })
        .join('');

      // Lightbox click
      grid.querySelectorAll('.screenshot-thumb').forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const id = thumb.getAttribute('data-id');
          const item = shots.find((x) => x.id === id);
          if (item) showLightbox(item, loadScreenshots);
        });
      });
    } catch (err) {
      container.querySelector('#screenshots-grid').innerHTML = `
        <div class="wb-card" style="grid-column: 1 / -1; color: var(--status-danger);">Failed to load screenshots: ${err.message}</div>
      `;
    }
  };

  await loadScreenshots();

  // Test Capture
  container.querySelector('#btn-snap-frame')?.addEventListener('click', async () => {
    await captureManager.captureFrame();
    setTimeout(loadScreenshots, 500);
  });
}

function showLightbox(item, onDelete) {
  const isDataUrl = item.storage_path.startsWith('data:image');
  const imgSrc = isDataUrl ? item.storage_path : 'https://placehold.co/1280x720/0d0f12/ffffff?text=Screen+Capture';

  openModal({
    title: `Authorized Screen Capture — ${item.user_name}`,
    contentHtml: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <img src="${imgSrc}" style="width: 100%; max-height: 480px; object-fit: contain; background: #000; border-radius: var(--radius-md);" />
        <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-secondary);">
          <div>
            <div><strong>Target:</strong> ${item.target_name}</div>
            <div><strong>Activity Level:</strong> ${item.activity_percent}%</div>
            <div><strong>Captured:</strong> ${new Date(item.taken_at).toLocaleString()}</div>
          </div>
          <button id="btn-delete-lightbox" class="btn-wb-outline btn-wb-sm" style="color: var(--status-danger); border-color: #fecaca; align-self: flex-end;">
            Delete Record
          </button>
        </div>
      </div>
    `,
    onMount: (overlay, close) => {
      overlay.querySelector('#btn-delete-lightbox')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this screenshot record?')) return;
        try {
          await apiRequest(`/tracking/screenshots/${item.id}`, { method: 'DELETE' });
          close();
          onDelete();
        } catch (err) {
          alert('Delete error: ' + err.message);
        }
      });
    }
  });
}
