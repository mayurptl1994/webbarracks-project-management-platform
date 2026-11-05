import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openModal } from '../components/modal.js';

export async function renderTeamView(container) {
  const user = store.getState('currentUser');
  const isAdmin = user?.role === 'admin';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Team Directory &amp; Access</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Organization members, project roles, billable rates, and capacity.
          </p>
        </div>

        ${
          isAdmin
            ? `
          <button id="btn-invite-member" class="btn-wb-primary">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            <span>+ Add Teammate</span>
          </button>
        `
            : ''
        }
      </div>

      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <table class="wb-table">
          <thead>
            <tr>
              <th>TEAM MEMBER</th>
              <th>WORKSPACE ROLE</th>
              <th>STATUS</th>
              <th>WEEKLY CAPACITY</th>
              <th>BILL RATE</th>
              <th style="text-align: right;">ACTION</th>
            </tr>
          </thead>
          <tbody id="team-table-body">
            <tr><td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading team members...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = container.querySelector('#team-table-body');

  const loadMembers = async () => {
    try {
      const users = await apiRequest('/users');
      if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">No members found.</td></tr>`;
        return;
      }

      tbody.innerHTML = users
        .map((u) => {
          const initial = (u.full_name || 'U').charAt(0);
          const roleBadge =
            u.role === 'admin'
              ? `<span class="status-pill-published" style="background: #2563eb;">SUPER ADMIN</span>`
              : u.role === 'manager'
              ? `<span class="status-pill-published" style="background: #7c3aed;">MANAGER</span>`
              : `<span class="status-pill-published" style="background: #475569;">MEMBER</span>`;

          const statusPill = u.is_active
            ? `<span style="color: #10b981; font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span> Active</span>`
            : `<span style="color: #ef4444; font-weight: 700; font-size: 0.75rem;">Deactivated</span>`;

          return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #27272a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem;">
                  ${initial}
                </div>
                <div>
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 0.875rem;">${u.full_name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); font-family: var(--font-mono);">${u.email}</div>
                </div>
              </div>
            </td>
            <td>${roleBadge}</td>
            <td>${statusPill}</td>
            <td style="font-family: var(--font-mono); font-size: 0.8125rem;">40h / week</td>
            <td style="font-family: var(--font-mono); font-weight: 600; font-size: 0.8125rem;">$${u.hourly_bill_rate || 110}/h</td>
            <td style="text-align: right;">
              <button class="btn-wb-outline btn-wb-sm btn-switch-persona" data-user-id="${u.id}">
                Switch Persona
              </button>
            </td>
          </tr>
        `;
        })
        .join('');

      tbody.querySelectorAll('.btn-switch-persona').forEach((btn) => {
        btn.addEventListener('click', () => {
          const uid = btn.getAttribute('data-user-id');
          localStorage.setItem('wb_user_id', uid);
          window.location.reload();
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--status-danger);">Failed to load team: ${err.message}</td></tr>`;
    }
  };

  await loadMembers();

  // Invite modal
  container.querySelector('#btn-invite-member')?.addEventListener('click', () => {
    openModal({
      title: 'Add Team Member',
      contentHtml: `
        <form id="form-add-team-member" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Full Name *</label>
            <input name="full_name" required placeholder="e.g. Sarah Jenkins" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Email Address *</label>
            <input name="email" type="email" required placeholder="sarah@webbarracks.com" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Role *</label>
              <select name="role" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);">
                <option value="member">Team Member</option>
                <option value="manager">Project Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Hourly Bill Rate ($)</label>
              <input name="hourly_bill_rate" type="number" value="110" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn-wb-primary">Add Member</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-add-team-member');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          await apiRequest('/users', {
            method: 'POST',
            body: JSON.stringify({
              full_name: fd.get('full_name'),
              email: fd.get('email'),
              role: fd.get('role'),
              hourly_bill_rate: Number(fd.get('hourly_bill_rate')) || 100
            })
          });
          close();
          loadMembers();
        });
      }
    });
  });
}
