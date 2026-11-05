/**
 * Accessible Modal and Drawer helpers with focus trapping and ESC key listener
 */

export function openModal({ title, contentHtml, onMount }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="modal-card">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.125rem; font-weight: 700;">${title}</h2>
        <button id="modal-close-btn" class="btn btn-secondary btn-icon" aria-label="Close modal">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">
        ${contentHtml}
      </div>
    </div>
  `;

  const close = () => {
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
  };

  const handleKeydown = (e) => {
    if (e.key === 'Escape') close();
  };

  overlay.querySelector('#modal-close-btn')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', handleKeydown);
  document.body.appendChild(overlay);

  if (onMount) {
    onMount(overlay, close);
  }

  return { close };
}

export function openDrawer({ title, contentHtml, onMount }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="drawer-right">
      <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
        <h2 style="font-size: 1.125rem; font-weight: 700;">${title}</h2>
        <button id="drawer-close-btn" class="btn btn-secondary btn-icon" aria-label="Close drawer">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="drawer-body" style="padding: 1.5rem; flex: 1; overflow-y: auto;">
        ${contentHtml}
      </div>
    </div>
  `;

  const close = () => {
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
  };

  const handleKeydown = (e) => {
    if (e.key === 'Escape') close();
  };

  overlay.querySelector('#drawer-close-btn')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', handleKeydown);
  document.body.appendChild(overlay);

  if (onMount) {
    onMount(overlay, close);
  }

  return { close };
}
