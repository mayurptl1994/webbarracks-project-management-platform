import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { renderBarChart, renderDonutChart } from '../components/charts.js';

export async function renderReportsView(container) {
  const role = store.getState('workspaceRole');
  const isClient = role === 'client';
  const canViewFinancial = store.hasPermission('reports:view_financial');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Reports & Analytics Hub</h1>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
            Time ledger summaries, team utilization, budget burn, and financial margins.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button id="btn-export-csv" class="btn btn-secondary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Tab Buttons -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">
        <button class="btn btn-sm btn-primary tab-btn" data-tab="summary">Summary Report</button>
        ${canViewFinancial ? `<button class="btn btn-sm btn-secondary tab-btn" data-tab="profitability">Project Profitability</button>` : ''}
        ${!isClient ? `<button class="btn btn-sm btn-secondary tab-btn" data-tab="utilization">Team Utilization</button>` : ''}
      </div>

      <!-- Report Content Container -->
      <div id="report-content" style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="card skeleton" style="height: 320px;"></div>
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

  const contentEl = container.querySelector('#report-content');

  const loadSummaryReport = async () => {
    contentEl.innerHTML = `<div class="card skeleton" style="height: 320px;"></div>`;
    const data = await apiRequest('/reports/summary?groupBy=project');

    const chartData = data.rows.map((r) => ({
      label: r.name,
      value: r.totalHours
    }));

    contentEl.innerHTML = `
      <div class="grid-cols-2">
        <div class="card">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem;">Hours by Project</h3>
          <div>${renderBarChart(chartData, { width: 440, height: 200 })}</div>
        </div>

        <div class="card" style="display: flex; flex-direction: column; justify-content: center;">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem;">Hours Distribution</h3>
          <div>
            ${renderDonutChart(
              data.rows.map((r) => ({ label: r.name, value: r.totalHours })),
              { size: 160 }
            )}
          </div>
        </div>
      </div>

      <div class="card" style="padding: 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-subtle); text-align: left; font-size: 0.75rem; color: var(--text-muted);">
              <th style="padding: 0.75rem 1rem;">PROJECT</th>
              <th style="padding: 0.75rem 1rem;">TOTAL HOURS</th>
              <th style="padding: 0.75rem 1rem;">BILLABLE HOURS</th>
              <th style="padding: 0.75rem 1rem;">BILLABLE AMOUNT</th>
              ${!isClient ? `<th style="padding: 0.75rem 1rem;">INTERNAL COST</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${data.rows
              .map(
                (r) => `
              <tr style="border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 0.75rem 1rem; font-weight: 600;">${r.name}</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">${r.totalHours}h</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">${r.billableHours}h</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-weight: 600;">$${r.billableAmount.toLocaleString()}</td>
                ${!isClient ? `<td style="padding: 0.75rem 1rem; font-family: var(--font-mono); color: var(--text-muted);">$${r.costAmount.toLocaleString()}</td>` : ''}
              </tr>
            `
              )
              .join('')}
            <tr style="background: var(--bg-subtle); font-weight: 700;">
              <td style="padding: 0.75rem 1rem;">TOTAL</td>
              <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">${data.totals.totalHours}h</td>
              <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">${data.totals.billableHours}h</td>
              <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">$${data.totals.billableAmount.toLocaleString()}</td>
              ${!isClient ? `<td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">$${data.totals.costAmount.toLocaleString()}</td>` : ''}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  };

  const loadProfitabilityReport = async () => {
    contentEl.innerHTML = `<div class="card skeleton" style="height: 320px;"></div>`;
    const rows = await apiRequest('/reports/profitability');

    contentEl.innerHTML = `
      <div class="card" style="padding: 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-subtle); text-align: left; font-size: 0.75rem; color: var(--text-muted);">
              <th style="padding: 0.75rem 1rem;">PROJECT</th>
              <th style="padding: 0.75rem 1rem;">TRACKED HOURS</th>
              <th style="padding: 0.75rem 1rem;">REVENUE</th>
              <th style="padding: 0.75rem 1rem;">COST</th>
              <th style="padding: 0.75rem 1rem;">PROFIT MARGIN</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr style="border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 0.75rem 1rem; font-weight: 600;">${r.projectName} (${r.projectKey})</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">${r.totalHours}h</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-weight: 600;">$${r.revenue.toLocaleString()}</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); color: var(--text-muted);">$${r.cost.toLocaleString()}</td>
                <td style="padding: 0.75rem 1rem;">
                  <span class="badge ${r.marginPercent >= 30 ? 'badge-done' : 'badge-in_review'}">
                    ${r.marginPercent}% ($${r.profit.toLocaleString()})
                  </span>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const loadUtilizationReport = async () => {
    contentEl.innerHTML = `<div class="card skeleton" style="height: 320px;"></div>`;
    const rows = await apiRequest('/reports/utilization');

    contentEl.innerHTML = `
      <div class="card" style="padding: 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-subtle); text-align: left; font-size: 0.75rem; color: var(--text-muted);">
              <th style="padding: 0.75rem 1rem;">MEMBER</th>
              <th style="padding: 0.75rem 1rem;">ROLE</th>
              <th style="padding: 0.75rem 1rem;">CAPACITY</th>
              <th style="padding: 0.75rem 1rem;">TRACKED HOURS</th>
              <th style="padding: 0.75rem 1rem;">UTILIZATION %</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr style="border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 0.75rem 1rem; font-weight: 600;">${r.fullName}</td>
                <td style="padding: 0.75rem 1rem; text-transform: capitalize;">${r.role}</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">${r.weeklyCapacity}h/wk</td>
                <td style="padding: 0.75rem 1rem; font-family: var(--font-mono); font-weight: 600;">${r.totalHours}h</td>
                <td style="padding: 0.75rem 1rem;">
                  <span class="badge ${r.utilizationPercent > 100 ? 'badge-todo' : r.utilizationPercent > 70 ? 'badge-done' : 'badge-in_review'}">
                    ${r.utilizationPercent}%
                  </span>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach((b) => {
        b.className = 'btn btn-sm btn-secondary tab-btn';
      });
      btn.className = 'btn btn-sm btn-primary tab-btn';

      const tab = btn.getAttribute('data-tab');
      if (tab === 'summary') loadSummaryReport();
      else if (tab === 'profitability') loadProfitabilityReport();
      else if (tab === 'utilization') loadUtilizationReport();
    });
  });

  // Initial load
  await loadSummaryReport();
}

