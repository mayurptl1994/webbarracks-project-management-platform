import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openModal } from '../components/modal.js';

export async function renderTeamView(container) {
  const canManage = store.hasPermission('workspace:manage_members');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Team & Access Control</h1>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
            Organization members, workspace-level roles, and project permissions.
          </p>
        </div>

        ${
          canManage
            ? `
          <button id="btn-invite-member" class="btn btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            <span>Invite Teammate</span>
          </button>
        `
            : ''
        }
      </div>

      <div class="card" style="padding: 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-subtle); text-align: left; font-size: 0.75rem; color: var(--text-muted);">
              <th style="padding: 0.75rem 1rem;">MEMBER</th>
              <th style="padding: 0.75rem 1rem;">EMAIL</th>
              <th style="padding: 0.75rem 1rem;">WORKSPACE ROLE</th>
              <th style="padding: 0.75rem 1rem;">TIMEZONE</th>
              <th style="padding: 0.75rem 1rem;">WEEKLY CAPACITY</th>
              ${canManage ? `<th style="padding: 0.75rem 1rem; text-align: right;">ACTION</th>` : ''}
            </tr>
          </thead>
          <tbody id="team-table-body">
            <tr><td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading members...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const loadMembers = async () => {
    try {
      const members = await apiRequest('/workspaces/members');
      const tbody = container.querySelector('#team-table-body');

      tbody.innerHTML = members
        .map((m) => {
          const user = m.user;
          return `
          <tr style="border-bottom: 1px solid var(--border-subtle);">
            <td style="padding: 0.75rem 1rem; font-weight: 600;">${user?.full_name || 'Member'}</td>
            <td style="padding: 0.75rem 1rem; color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.8125rem;">${user?.email || ''}</td>
            <td style="padding: 0.75rem 1rem;">
              ${
                canManage && m.role !== 'owner'
                  ? `
                <select class="select-member-role" data-user-id="${m.user_id}" style="padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-default); background: var(--bg-surface); font-size: 0.75rem; font-weight: 600;">
                  <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
                  <option value="manager" ${m.role === 'manager' ? 'selected' : ''}>Manager</option>
                  <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
                  <option value="client" ${m.role === 'client' ? 'selected' : ''}>Client</option>
                </select>
              `
                  : `<span class="badge ${m.role === 'owner' ? 'badge-done' : 'badge-todo'}">${m.role}</span>`
              }
            </td>
            <td style="padding: 0.75rem 1rem; color: var(--text-secondary);">${user?.timezone || 'UTC'}</td>
            <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">${user?.working_hours_per_week || 40}h/wk</td>
            ${
              canManage
                ? `
              <td style="padding: 0.75rem 1rem; text-align: right;">
                <button class="btn btn-sm btn-secondary btn-switch-user" data-user-id="${m.user_id}">
                  Switch To &rarr;
                </button>
              </td>
            `
                : ''
            }
          </tr>
        `;
        })
        .join('');

      // Role change
      tbody.querySelectorAll('.select-member-role').forEach((sel) => {
        sel.addEventListener('change', async (e) => {
          const uid = sel.getAttribute('data-user-id');
          try {
            await apiRequest(`/workspaces/members/${uid}/role`, {
              method: 'PUT',
              body: JSON.stringify({ role: e.target.value })
            });
            alert('Role updated successfully.');
          } catch (err) {
            alert('Failed to update role: ' + err.message);
          }
        });
      });

      // Quick switch button
      tbody.querySelectorAll('.btn-switch-user').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const uid = btn.getAttribute('data-user-id');
          await apiRequest('/auth/demo-switch', {
            method: 'POST',
            body: JSON.stringify({ userId: uid })
          });
          window.location.reload();
        });
      });
    } catch (err) {
      container.querySelector('#team-table-body').innerHTML = `
        <tr><td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--status-danger);">Failed to load team: ${err.message}</td></tr>
      `;
    }
  };

  await loadMembers();

  // Invite Modal
  container.querySelector('#btn-invite-member')?.addEventListener('click', () => {
    openModal({
      title: 'Invite Teammate',
      contentHtml: `
        <form id="form-invite-member" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Email Address *</label>
            <input name="email" type="email" required placeholder="colleague@company.com" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Workspace Role *</label>
            <select name="role" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">
              <option value="member" selected>Member (Standard contributor)</option>
              <option value="manager">Manager (Can approve timesheets)</option>
              <option value="admin">Admin (Full settings access)</option>
              <option value="client">Client (Restricted read-only)</option>
            </select>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn btn-primary">Send Invite</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-invite-member');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          alert('Invite dispatched via Resend / SMTP simulation.');
          close();
        });
      }
    });
  });
}

