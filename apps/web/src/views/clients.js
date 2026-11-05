import { apiRequest } from '../core/api.js';
import { openModal } from '../components/modal.js';
import { store } from '../core/store.js';

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  CHF: 'CHF ',
  AED: 'AED '
};

export function formatRateWithCurrency(rate, currency = 'USD') {
  const code = (currency || 'USD').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] || `${code} `;
  const num = Number(rate || 0);
  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / hr`;
}

export async function renderClientsView(container) {
  const currentUser = store.getState('currentUser');
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Page Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Clients</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Create and manage clients, define their price per hour, and configure billing currencies.
          </p>
        </div>

        <button id="btn-create-client" class="btn-wb-primary">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          <span>+ Create Client</span>
        </button>
      </div>

      <!-- Stat Cards -->
      <div class="grid-4-cols" id="clients-stat-cards">
        <div class="wb-stat-card">
          <div class="wb-stat-label">TOTAL CLIENTS</div>
          <div class="wb-stat-value" id="stat-total-clients">0</div>
          <div class="wb-stat-subtext">Registered billing accounts</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">ACTIVE CLIENTS</div>
          <div class="wb-stat-value" id="stat-active-clients" style="color: #10b981;">0</div>
          <div class="wb-stat-subtext">Available for time billing</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">CONFIGURED CURRENCIES</div>
          <div class="wb-stat-value" id="stat-currencies-count" style="font-size: 1.35rem;">USD, EUR, GBP</div>
          <div class="wb-stat-subtext">Multi-currency billing ready</div>
        </div>

        <div class="wb-stat-card">
          <div class="wb-stat-label">AVERAGE HOURLY RATE</div>
          <div class="wb-stat-value" id="stat-avg-rate" style="font-size: 1.35rem;">$0.00 / hr</div>
          <div class="wb-stat-subtext">Across active client tariffs</div>
        </div>
      </div>

      <!-- Search & Filters -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <input 
            id="input-client-search" 
            type="search" 
            placeholder="Search by client name, company, or email..." 
            style="padding: 0.45rem 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); background: var(--bg-surface); font-size: 0.875rem; width: 320px; font-family: var(--font-sans);" 
          />
          <select id="select-filter-currency" style="padding: 0.45rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); background: var(--bg-surface); font-size: 0.875rem;">
            <option value="">All Currencies</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="INR">INR (₹)</option>
            <option value="AUD">AUD (A$)</option>
            <option value="CAD">CAD (C$)</option>
            <option value="SGD">SGD (S$)</option>
            <option value="CHF">CHF (CHF)</option>
            <option value="AED">AED (AED)</option>
          </select>
          <select id="select-filter-status" style="padding: 0.45rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); background: var(--bg-surface); font-size: 0.875rem;">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <!-- Clients Table Card -->
      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <table class="wb-table">
          <thead>
            <tr>
              <th>CLIENT &amp; COMPANY</th>
              <th>CONTACT EMAIL</th>
              <th>BILLING CURRENCY</th>
              <th>PRICE PER HOUR</th>
              <th>STATUS</th>
              <th>TERMS / NOTES</th>
              <th style="text-align: right;">ACTIONS</th>
            </tr>
          </thead>
          <tbody id="clients-table-body">
            <tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">Loading clients...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  let allClients = [];

  const loadClients = async () => {
    try {
      allClients = await apiRequest('/clients');
      updateStats(allClients);
      renderTable(filterClients());
    } catch (err) {
      container.querySelector('#clients-table-body').innerHTML = `
        <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--status-danger);">Failed to load clients: ${err.message}</td></tr>
      `;
    }
  };

  const updateStats = (clients) => {
    const total = clients.length;
    const active = clients.filter((c) => c.status === 'active');
    const currencies = [...new Set(clients.map((c) => c.currency))];
    const totalRates = active.reduce((acc, c) => acc + (Number(c.hourly_rate) || 0), 0);
    const avgRate = active.length > 0 ? totalRates / active.length : 0;

    container.querySelector('#stat-total-clients').textContent = total;
    container.querySelector('#stat-active-clients').textContent = active.length;
    container.querySelector('#stat-currencies-count').textContent = currencies.length > 0 ? currencies.join(', ') : 'None';
    container.querySelector('#stat-avg-rate').textContent = `$${avgRate.toFixed(2)} / hr`;
  };

  const filterClients = () => {
    const query = (container.querySelector('#input-client-search')?.value || '').toLowerCase().trim();
    const curr = container.querySelector('#select-filter-currency')?.value || '';
    const status = container.querySelector('#select-filter-status')?.value || '';

    return allClients.filter((c) => {
      const matchQuery =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.company && c.company.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query));
      const matchCurr = !curr || c.currency === curr;
      const matchStatus = !status || c.status === status;
      return matchQuery && matchCurr && matchStatus;
    });
  };

  const renderTable = (clients) => {
    const tbody = container.querySelector('#clients-table-body');
    if (!clients || clients.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No clients found. Click <strong>+ Create Client</strong> above to add one.
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = clients
      .map((c) => {
        const initial = (c.name || 'C').charAt(0).toUpperCase();
        const statusBadge =
          c.status === 'active'
            ? `<span style="display: inline-flex; align-items: center; gap: 5px; color: #10b981; font-weight: 700; font-size: 0.75rem;"><span style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span> Active</span>`
            : `<span style="display: inline-flex; align-items: center; gap: 5px; color: #64748b; font-weight: 700; font-size: 0.75rem;"><span style="width: 6px; height: 6px; background: #64748b; border-radius: 50%;"></span> Inactive</span>`;

        const currencyBadge = `
          <span class="status-pill-published" style="background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; font-weight: 700; font-family: var(--font-mono);">
            ${c.currency} (${CURRENCY_SYMBOLS[c.currency] || c.currency})
          </span>
        `;

        const rateFormatted = formatRateWithCurrency(c.hourly_rate, c.currency);

        return `
          <tr data-client-id="${c.id}">
            <td>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 34px; height: 34px; border-radius: 8px; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem;">
                  ${initial}
                </div>
                <div>
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9375rem;">${c.name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">${c.company || 'Direct Client'}</div>
                </div>
              </div>
            </td>
            <td>
              <span style="font-size: 0.8125rem; font-family: var(--font-mono); color: var(--text-secondary);">${c.email || '—'}</span>
            </td>
            <td>${currencyBadge}</td>
            <td>
              <div style="font-family: var(--font-mono); font-weight: 700; font-size: 0.9375rem; color: #047857; background: #ecfdf5; padding: 4px 8px; border-radius: var(--radius-sm); display: inline-block;">
                ${rateFormatted}
              </div>
            </td>
            <td>${statusBadge}</td>
            <td style="max-width: 200px; font-size: 0.75rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${c.notes || '—'}
            </td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 0.35rem;">
                <button class="btn-wb-outline btn-wb-sm btn-edit-client" data-id="${c.id}">
                  Edit
                </button>
                <button class="btn-wb-outline btn-wb-sm btn-delete-client" data-id="${c.id}" style="color: var(--status-danger);">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Attach actions
    tbody.querySelectorAll('.btn-edit-client').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const client = allClients.find((c) => c.id === id);
        if (client) showClientModal(client, loadClients);
      });
    });

    tbody.querySelectorAll('.btn-delete-client').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const client = allClients.find((c) => c.id === id);
        if (!client) return;

        if (confirm(`Are you sure you want to delete client "${client.name}"?`)) {
          try {
            await apiRequest(`/clients/${id}`, { method: 'DELETE' });
            await loadClients();
          } catch (err) {
            alert('Failed to delete client: ' + err.message);
          }
        }
      });
    });
  };

  // Wire search & filter inputs
  container.querySelector('#input-client-search')?.addEventListener('input', () => {
    renderTable(filterClients());
  });
  container.querySelector('#select-filter-currency')?.addEventListener('change', () => {
    renderTable(filterClients());
  });
  container.querySelector('#select-filter-status')?.addEventListener('change', () => {
    renderTable(filterClients());
  });

  // Create Client Button
  container.querySelector('#btn-create-client')?.addEventListener('click', () => {
    showClientModal(null, loadClients);
  });

  // Initial Load
  loadClients();
}

/**
 * Modal to Create or Edit a Client
 */
export function showClientModal(client = null, onSuccess) {
  const isEditing = Boolean(client && client.id);
  const title = isEditing ? 'Edit Client & Hourly Rate' : 'Create New Client';

  const defaultCurrency = client?.currency || 'USD';
  const defaultRate = client?.hourly_rate !== undefined ? client.hourly_rate : 100.0;

  const contentHtml = `
    <form id="form-client-editor" style="display: flex; flex-direction: column; gap: 1.15rem;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
            Client Name *
          </label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="e.g. Stripe Global Enterprise" 
            value="${client?.name || ''}"
            style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem;" 
          />
        </div>

        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
            Company / Organization
          </label>
          <input 
            type="text" 
            name="company" 
            placeholder="e.g. Stripe, Inc." 
            value="${client?.company || ''}"
            style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem;" 
          />
        </div>
      </div>

      <div>
        <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
          Billing Contact Email (Optional)
        </label>
        <input 
          type="text" 
          name="email" 
          placeholder="e.g. billing@company.com" 
          value="${client?.email || ''}"
          style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem;" 
        />
      </div>

      <!-- Pricing & Currency Definition -->
      <div style="background: #f8fafc; border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 1rem;">
        <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.04em;">
          Billing Tariff &amp; Hourly Rate
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
              Currency *
            </label>
            <select 
              name="currency" 
              id="modal-select-currency" 
              required 
              style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem; background: #ffffff;"
            >
              <option value="USD" ${defaultCurrency === 'USD' ? 'selected' : ''}>USD ($ - United States Dollar)</option>
              <option value="EUR" ${defaultCurrency === 'EUR' ? 'selected' : ''}>EUR (€ - Euro)</option>
              <option value="GBP" ${defaultCurrency === 'GBP' ? 'selected' : ''}>GBP (£ - British Pound)</option>
              <option value="INR" ${defaultCurrency === 'INR' ? 'selected' : ''}>INR (₹ - Indian Rupee)</option>
              <option value="AUD" ${defaultCurrency === 'AUD' ? 'selected' : ''}>AUD (A$ - Australian Dollar)</option>
              <option value="CAD" ${defaultCurrency === 'CAD' ? 'selected' : ''}>CAD (C$ - Canadian Dollar)</option>
              <option value="SGD" ${defaultCurrency === 'SGD' ? 'selected' : ''}>SGD (S$ - Singapore Dollar)</option>
              <option value="CHF" ${defaultCurrency === 'CHF' ? 'selected' : ''}>CHF (CHF - Swiss Franc)</option>
              <option value="AED" ${defaultCurrency === 'AED' ? 'selected' : ''}>AED (AED - UAE Dirham)</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
              Price Per Hour *
            </label>
            <div style="position: relative; display: flex; align-items: center;">
              <span id="modal-currency-indicator" style="position: absolute; left: 10px; font-weight: 700; color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.875rem;">
                ${CURRENCY_SYMBOLS[defaultCurrency] || '$'}
              </span>
              <input 
                type="number" 
                name="hourly_rate" 
                id="modal-input-hourly-rate" 
                min="0" 
                step="0.5" 
                required 
                placeholder="100.00" 
                value="${defaultRate}"
                style="width: 100%; padding: 0.5rem 0.75rem 0.5rem 2.25rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem; font-weight: 600; font-family: var(--font-mono); background: #ffffff;" 
              />
              <span style="position: absolute; right: 10px; font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">/ hr</span>
            </div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
            Account Status
          </label>
          <select 
            name="status" 
            style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem;"
          >
            <option value="active" ${client?.status !== 'inactive' ? 'selected' : ''}>Active (Eligible for billing and tracking)</option>
            <option value="inactive" ${client?.status === 'inactive' ? 'selected' : ''}>Inactive (Archived)</option>
          </select>
        </div>

        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary);">
            Payment Terms &amp; Invoicing Notes
          </label>
          <textarea 
            name="notes" 
            rows="3" 
            placeholder="e.g. Net 30 payment terms. Invoiced bi-weekly via PDF statement." 
            style="width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem; resize: vertical;"
          >${client?.notes || ''}</textarea>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
        <button type="button" id="btn-modal-cancel" class="btn-wb-outline">Cancel</button>
        <button type="submit" id="btn-modal-submit" class="btn-wb-primary">
          ${isEditing ? 'Save Changes' : 'Create Client'}
        </button>
      </div>
    </form>
  `;

  openModal({
    title,
    contentHtml,
    onMount: (overlay, close) => {
      const form = overlay.querySelector('#form-client-editor');
      const currencySelect = overlay.querySelector('#modal-select-currency');
      const currencyIndicator = overlay.querySelector('#modal-currency-indicator');

      currencySelect?.addEventListener('change', (e) => {
        const curr = e.target.value;
        if (currencyIndicator) {
          currencyIndicator.textContent = CURRENCY_SYMBOLS[curr] || `${curr} `;
        }
      });

      overlay.querySelector('#btn-modal-cancel')?.addEventListener('click', close);

      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = overlay.querySelector('#btn-modal-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const fd = new FormData(form);
        const payload = {
          name: fd.get('name'),
          company: fd.get('company'),
          email: fd.get('email'),
          currency: fd.get('currency'),
          hourly_rate: parseFloat(fd.get('hourly_rate')) || 0,
          status: fd.get('status'),
          notes: fd.get('notes')
        };

        try {
          let res;
          if (isEditing) {
            res = await apiRequest(`/clients/${client.id}`, {
              method: 'PUT',
              body: JSON.stringify(payload)
            });
          } else {
            res = await apiRequest('/clients', {
              method: 'POST',
              body: JSON.stringify(payload)
            });
          }
          close();
          if (onSuccess) onSuccess(res);
        } catch (err) {
          alert('Error saving client: ' + err.message);
          submitBtn.disabled = false;
          submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Client';
        }
      });
    }
  });
}

