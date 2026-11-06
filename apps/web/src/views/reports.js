import { apiRequest } from '../core/api.js';
import { CURRENCY_SYMBOLS, formatRateWithCurrency } from './clients.js';

export async function renderReportsView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Client Billing Reports &amp; Analytics</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Time ledger summaries, client hourly tariffs, currency breakdowns, and billable margins.
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
          <div class="wb-stat-value" id="rep-billable-val">—</div>
          <div class="wb-stat-subtext">Snapshot at agreed client rates</div>
        </div>
      </div>

      <!-- Client Breakdown Card -->
      <div class="wb-card">
        <div class="wb-card-header">
          <div>
            <div class="wb-card-title">Client Hours &amp; Financial Breakdown</div>
            <div class="wb-card-subtitle">Detailed billable tracking and margins by client tariff</div>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table class="wb-table">
            <thead>
              <tr>
                <th>CLIENT</th>
                <th>CURRENCY &amp; HOURLY RATE</th>
                <th>TOTAL HOURS</th>
                <th>BILLABLE HOURS</th>
                <th>BILLABLE RATIO</th>
                <th style="text-align: right;">ESTIMATED VALUE</th>
              </tr>
            </thead>
            <tbody id="report-breakdown-body">
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading billing breakdown...</td></tr>
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

  // Dynamic fetch
  try {
    const summary = await apiRequest('/reports/summary');
    if (summary) {
      container.querySelector('#rep-total-hours').textContent = `${summary.totalTrackedHours}h`;
      container.querySelector('#rep-billable-hours').textContent = `${summary.billableHours}h`;
      container.querySelector('#rep-efficiency').textContent = `${summary.billableEfficiency}%`;
      const breakdown = summary.clientBreakdown || [];
      const currencies = [...new Set(breakdown.filter((b) => b.amount > 0).map((b) => (b.currency || 'INR').toUpperCase()).filter(Boolean))];
      if (currencies.length === 1) {
        const sym = CURRENCY_SYMBOLS[currencies[0]] || `${currencies[0]} `;
        container.querySelector('#rep-billable-val').textContent = `${sym}${summary.totalBillableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else if (currencies.length > 1) {
        const text = breakdown
          .filter((b) => b.amount > 0)
          .map((b) => `${CURRENCY_SYMBOLS[b.currency] || b.currency + ' '}${b.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          .join(' + ');
        container.querySelector('#rep-billable-val').textContent = text;
      } else {
        const firstCurr = (breakdown[0]?.currency || 'INR').toUpperCase();
        const sym = CURRENCY_SYMBOLS[firstCurr] || '₹';
        container.querySelector('#rep-billable-val').textContent = `${sym}${Number(summary.totalBillableAmount || 0).toFixed(2)}`;
      }

      if (breakdown.length > 0) {
        tbody.innerHTML = breakdown
          .map((item) => {
            const sym = CURRENCY_SYMBOLS[item.currency] || '$';
            const ratio = item.hours > 0 ? Math.round((item.billable / item.hours) * 100) : 0;
            const rateStr = formatRateWithCurrency(item.hourlyRate, item.currency);

            return `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>
                  <span style="font-family: var(--font-mono); font-weight: 700; color: #047857; background: #ecfdf5; padding: 2px 6px; border-radius: var(--radius-sm); font-size: 0.8125rem;">
                    ${rateStr}
                  </span>
                </td>
                <td style="font-family: var(--font-mono);">${item.hours}h</td>
                <td style="font-family: var(--font-mono); color: #10b981;">${item.billable}h</td>
                <td>
                  <span class="status-pill-published" style="background: ${ratio >= 75 ? '#ecfdf5' : '#fffbeb'}; color: ${ratio >= 75 ? '#047857' : '#b45309'};">
                    ${ratio}% BILLABLE
                  </span>
                </td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">
                  ${sym}${item.amount.toLocaleString()}
                </td>
              </tr>
            `;
          })
          .join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No client billing records found.</td></tr>`;
      }
    }
  } catch (err) {
    console.warn('Reports summary loaded with static defaults:', err);
  }
}
