import { apiRequest } from '../core/api.js';

export async function renderReportsView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Project Reports &amp; Analytics</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Time ledger summaries, budget burn, team utilization, and billable margins.
          </p>
        </div>

        <button id="btn-export-csv" class="btn-wb-outline">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span>Export CSV</span>
        </button>
      </div>

      <!-- 4 Stat Summary Cards matching design reference -->
      <div class="grid-4-cols" id="report-stat-cards">
        <div class="wb-stat-card">
          <div class="wb-stat-label">TOTAL LOGGED TIME</div>
          <div class="wb-stat-value" id="rep-total-hours">214.5h</div>
          <div class="wb-stat-subtext">Across all client deliverables</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">BILLABLE HOURS</div>
          <div class="wb-stat-value" id="rep-billable-hours" style="color: #10b981;">168.0h</div>
          <div class="wb-stat-subtext">Direct invoiceable work</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">BILLABLE EFFICIENCY</div>
          <div class="wb-stat-value" id="rep-efficiency">78%</div>
          <div class="wb-stat-subtext">Industry benchmark: 75%</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">ESTIMATED BILLABLE VALUE</div>
          <div class="wb-stat-value" id="rep-billable-val">$18,480</div>
          <div class="wb-stat-subtext">Snapshot at agreed bill rates</div>
        </div>
      </div>

      <!-- Project Breakdown Card -->
      <div class="wb-card">
        <div class="wb-card-header">
          <div>
            <div class="wb-card-title">Project Hours &amp; Financial Breakdown</div>
            <div class="wb-card-subtitle">Detailed billable tracking and margins by project</div>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table class="wb-table">
            <thead>
              <tr>
                <th>PROJECT</th>
                <th>TOTAL HOURS</th>
                <th>BILLABLE HOURS</th>
                <th>BILLABLE RATIO</th>
                <th style="text-align: right;">ESTIMATED VALUE</th>
              </tr>
            </thead>
            <tbody id="report-breakdown-body">
              <tr>
                <td><strong>Platform Cloud Migration</strong></td>
                <td style="font-family: var(--font-mono);">172.5h</td>
                <td style="font-family: var(--font-mono); color: #10b981;">145.0h</td>
                <td><span class="status-pill-published" style="background: #ecfdf5; color: #047857;">84% BILLABLE</span></td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">$15,950</td>
              </tr>
              <tr>
                <td><strong>Mobile iOS / Android Agent</strong></td>
                <td style="font-family: var(--font-mono);">42.0h</td>
                <td style="font-family: var(--font-mono); color: #10b981;">23.0h</td>
                <td><span class="status-pill-published" style="background: #fffbeb; color: #b45309;">55% BILLABLE</span></td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">$2,530</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // CSV Export handler
  container.querySelector('#btn-export-csv')?.addEventListener('click', async () => {
    try {
      const csvText = await apiRequest('/reports/export/csv');
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webbarracks-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Export error: ' + err.message);
    }
  });

  // Dynamic fetch if available
  try {
    const summary = await apiRequest('/reports/summary');
    if (summary) {
      container.querySelector('#rep-total-hours').textContent = `${summary.totalTrackedHours}h`;
      container.querySelector('#rep-billable-hours').textContent = `${summary.billableHours}h`;
      container.querySelector('#rep-efficiency').textContent = `${summary.billableEfficiency}%`;
      container.querySelector('#rep-billable-val').textContent = `$${summary.totalBillableAmount.toLocaleString()}`;
    }
  } catch (err) {
    console.warn('Reports summary loaded with static defaults:', err);
  }
}
