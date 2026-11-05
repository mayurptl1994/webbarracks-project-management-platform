import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openModal } from '../components/modal.js';

export async function renderAdminDashboardView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Page Header matching screenshot -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Dashboard</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Welcome back, <strong style="color: var(--text-primary);">WebBarracs Super Admin</strong>. Here is the current summary for WebBarracks.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <a href="/tracking" data-link class="btn-wb-outline">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            <span>View Public Site</span>
          </a>
          <button id="btn-add-product" class="btn-wb-primary">
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      <!-- 4 Stat Summary Cards matching screenshot -->
      <div class="grid-4-cols" id="admin-stat-cards">
        <div class="wb-stat-card">
          <div class="wb-stat-label">ACTIVE CATALOG PRODUCTS</div>
          <div class="wb-stat-value" id="stat-products">2</div>
          <div class="wb-stat-subtext">Verified plugin packages</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">DYNAMIC WEBSITE PAGES</div>
          <div class="wb-stat-value" id="stat-pages">16</div>
          <div class="wb-stat-subtext">Yoast SEO-managed</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">ACTIVE ADMINISTRATORS</div>
          <div class="wb-stat-value" id="stat-admins">1</div>
          <div class="wb-stat-subtext">Argon2id &amp; RBAC hardened</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">SECURITY AUDIT RECORDS</div>
          <div class="wb-stat-value" id="stat-audits">165</div>
          <div class="wb-stat-subtext">Tamper-evident event logs</div>
        </div>
      </div>

      <!-- 2 Main Cards matching screenshot -->
      <div class="grid-2-cols">
        <!-- Commercial Plugin Catalog Card -->
        <div class="wb-card">
          <div class="wb-card-header">
            <div>
              <div class="wb-card-title">Commercial Plugin Catalog</div>
              <div class="wb-card-subtitle">Active distribution artifacts and pricing</div>
            </div>
            <a href="/catalog" data-link class="btn-wb-outline btn-wb-sm">View All</a>
          </div>

          <div style="overflow-x: auto;">
            <table class="wb-table">
              <thead>
                <tr>
                  <th>PLUGIN TITLE</th>
                  <th>VERSION</th>
                  <th>STATUS</th>
                  <th>PRICE RANGE</th>
                </tr>
              </thead>
              <tbody id="catalog-table-body">
                <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading catalog...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Administrative Audit Logs Card -->
        <div class="wb-card">
          <div class="wb-card-header">
            <div>
              <div class="wb-card-title">Recent Administrative Audit Logs</div>
              <div class="wb-card-subtitle">Security events &amp; sensitive system actions</div>
            </div>
            <a href="/audit-logs" data-link class="btn-wb-outline btn-wb-sm">View Full Log</a>
          </div>

          <div style="overflow-x: auto;">
            <table class="wb-table">
              <thead>
                <tr>
                  <th>ACTION</th>
                  <th>ACTOR</th>
                  <th>IP ADDRESS</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody id="audit-table-body">
                <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading audit logs...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Active Tracking Telemetry & Quick Admin Actions -->
      <div class="wb-card">
        <div class="wb-card-header">
          <div>
            <div class="wb-card-title">Live Tracking Sessions Telemetry</div>
            <div class="wb-card-subtitle">Real-time authorized tracking sessions across all provisioned accounts</div>
          </div>
          <a href="/tracking" data-link class="btn-wb-primary btn-wb-sm">Open Tracking Console</a>
        </div>

        <div id="live-telemetry-container">
          <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.8125rem;">
            Loading active telemetry...
          </div>
        </div>
      </div>
    </div>
  `;

  // Load Dashboard Data
  try {
    const stats = await apiRequest('/dashboard/stats');
    container.querySelector('#stat-products').textContent = stats.activeCatalogProducts;
    container.querySelector('#stat-pages').textContent = stats.dynamicPages;
    container.querySelector('#stat-admins').textContent = stats.activeAdministrators;
    container.querySelector('#stat-audits').textContent = stats.totalAuditRecords;

    // Load Catalog Table
    const catalog = await apiRequest('/catalog');
    const catalogTbody = container.querySelector('#catalog-table-body');
    catalogTbody.innerHTML = catalog
      .map(
        (item) => `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);">${item.title}</td>
        <td style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">${item.version}</td>
        <td><span class="status-pill-published">${item.status}</span></td>
        <td style="font-family: var(--font-mono); font-weight: 600;">${item.price_range}</td>
      </tr>
    `
      )
      .join('');

    // Load Audit Logs Table matching screenshot
    const audits = await apiRequest('/audit-logs');
    const auditTbody = container.querySelector('#audit-table-body');
    auditTbody.innerHTML = audits
      .slice(0, 6)
      .map(
        (log) => `
      <tr>
        <td><span class="action-log-badge">${log.action}</span></td>
        <td style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.75rem;">${log.actor}</td>
        <td style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">${log.ip_address}</td>
        <td style="color: var(--text-secondary); font-size: 0.75rem;">${log.time}</td>
      </tr>
    `
      )
      .join('');

    // Load Live Telemetry
    const telemetry = await apiRequest('/tracking/live-telemetry');
    const telemetryContainer = container.querySelector('#live-telemetry-container');
    if (telemetry.length === 0) {
      telemetryContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">
          No tracking sessions are currently active. Regular users or administrators can start tracking from the Tracking Sessions tab.
        </div>
      `;
    } else {
      telemetryContainer.innerHTML = `
        <table class="wb-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>TARGET POINT / PROJECT</th>
              <th>MONITORING STATUS</th>
              <th>RUNNING TIME</th>
            </tr>
          </thead>
          <tbody>
            ${telemetry
              .map(
                (s) => `
              <tr>
                <td><strong>${s.userName}</strong> <span style="color: var(--text-muted); font-size: 0.75rem;">(${s.userEmail})</span></td>
                <td>${s.targetName}</td>
                <td><span class="monitoring-active-pill"><span class="pulse-dot"></span> Authorized Active</span></td>
                <td style="font-family: var(--font-mono); font-weight: 700; color: #10b981;">${Math.floor(s.elapsedSeconds / 60)}m ${s.elapsedSeconds % 60}s</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    console.error('Admin dashboard error:', err);
  }

  // Add Product Modal
  container.querySelector('#btn-add-product')?.addEventListener('click', () => {
    openModal({
      title: 'Add New Catalog Product',
      contentHtml: `
        <form id="form-new-product" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Product Package Title *</label>
            <input name="title" required placeholder="e.g. Web Barracks Analytics Suite" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-sans);" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Version *</label>
              <input name="version" required value="v1.0.0" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-mono);" />
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Price Range</label>
              <input name="price_range" value="$0 - $0" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-mono);" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn-wb-primary">Publish to Catalog</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-new-product');
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
          renderAdminDashboardView(container);
        });
      }
    });
  });
}
