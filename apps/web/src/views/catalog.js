import { apiRequest } from '../core/api.js';
import { openModal } from '../components/modal.js';

export async function renderCatalogView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Commercial Plugin Catalog</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Active distribution artifacts, plugin packages, and release pricing.
          </p>
        </div>

        <button id="btn-catalog-add" class="btn-wb-primary">
          <span>+ Add Product</span>
        </button>
      </div>

      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <table class="wb-table">
          <thead>
            <tr>
              <th>PLUGIN TITLE</th>
              <th>VERSION</th>
              <th>STATUS</th>
              <th>PRICE RANGE</th>
              <th style="text-align: right;">ACTION</th>
            </tr>
          </thead>
          <tbody id="catalog-full-tbody">
            <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading catalog...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const load = async () => {
    const list = await apiRequest('/catalog');
    const tbody = container.querySelector('#catalog-full-tbody');
    tbody.innerHTML = list
      .map(
        (item) => `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary); font-size: 0.875rem;">${item.title}</td>
        <td style="font-family: var(--font-mono); color: var(--text-muted); font-size: 0.75rem;">${item.version}</td>
        <td><span class="status-pill-published">${item.status}</span></td>
        <td style="font-family: var(--font-mono); font-weight: 600;">${item.price_range}</td>
        <td style="text-align: right;">
          <button class="btn-wb-outline btn-wb-sm">Edit Package</button>
        </td>
      </tr>
    `
      )
      .join('');
  };

  await load();

  container.querySelector('#btn-catalog-add')?.addEventListener('click', () => {
    openModal({
      title: 'Add Commercial Product',
      contentHtml: `
        <form id="form-add-product" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Package Title *</label>
            <input name="title" required placeholder="e.g. Web Barracks Security Scanner" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Version *</label>
              <input name="version" required value="v1.0.0" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Price Range</label>
              <input name="price_range" value="$0 - $0" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button type="submit" class="btn-wb-primary">Save to Catalog</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-add-product');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          await apiRequest('/catalog', {
            method: 'POST',
            body: JSON.stringify({
              title: fd.get('title'),
              version: fd.get('version'),
              price_range: fd.get('price_range')
            })
          });
          close();
          load();
        });
      }
    });
  });
}
