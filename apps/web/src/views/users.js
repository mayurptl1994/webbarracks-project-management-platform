import { apiRequest } from '../core/api.js';
import { openModal } from '../components/modal.js';

export async function renderUsersView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">User Management &amp; Provisioning</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Administrator control: Register users, generate login credentials, manage tracking permissions, and monitor accounts.
          </p>
        </div>

        <button id="btn-create-user" class="btn-wb-primary">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
          <span>+ Create New User</span>
        </button>
      </div>

      <!-- Users Table Card -->
      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <table class="wb-table">
          <thead>
            <tr>
              <th>USER</th>
              <th>ROLE</th>
              <th>ACCOUNT STATUS</th>
              <th>ASSIGNED TRACKING TARGETS</th>
              <th>MONITORING PERMISSIONS</th>
              <th>LAST LOGIN</th>
              <th style="text-align: right;">ACTIONS</th>
            </tr>
          </thead>
          <tbody id="users-table-body">
            <tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">Loading users...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const loadUsers = async () => {
    try {
      const users = await apiRequest('/users');
      const tbody = container.querySelector('#users-table-body');

      tbody.innerHTML = users
        .map((u) => {
          const statusBadge = u.is_active
            ? `<span style="display: inline-flex; align-items: center; gap: 5px; color: #10b981; font-weight: 700; font-size: 0.75rem;"><span style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span> Active</span>`
            : `<span style="display: inline-flex; align-items: center; gap: 5px; color: #ef4444; font-weight: 700; font-size: 0.75rem;"><span style="width: 6px; height: 6px; background: #ef4444; border-radius: 50%;"></span> Deactivated</span>`;

          const roleBadge = u.role === 'admin'
            ? `<span class="status-pill-published" style="background: #2563eb;">ADMINISTRATOR</span>`
            : `<span class="status-pill-published">REGULAR USER</span>`;

          const targetsStr = (u.assigned_targets || []).slice(0, 2).join(', ') + ((u.assigned_targets || []).length > 2 ? '...' : '');

          return `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--text-primary);">${u.full_name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${u.email}</div>
            </td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td style="max-width: 200px; font-size: 0.75rem; color: var(--text-secondary);">${targetsStr || 'All General Projects'}</td>
            <td>
              <div style="font-size: 0.75rem;">
                ${u.tracking_permissions?.screenshots_enabled ? '✓ Screenshots' : '✗ No Screens'} • Every ${u.tracking_permissions?.screenshot_interval_minutes || 5}m
              </div>
            </td>
            <td style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
              ${u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
            </td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 0.35rem;">
                <button class="btn-wb-outline btn-wb-sm btn-toggle-status" data-id="${u.id}" data-active="${u.is_active}">
                  ${u.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn-wb-outline btn-wb-sm btn-reset-pwd" data-id="${u.id}" data-email="${u.email}">
                  Reset Password
                </button>
                ${u.role !== 'admin' ? `<button class="btn-wb-outline btn-wb-sm btn-delete-user" data-id="${u.id}" style="color: var(--status-danger);">Delete</button>` : ''}
              </div>
            </td>
          </tr>
        `;
        })
        .join('');

      // Wire status toggle
      tbody.querySelectorAll('.btn-toggle-status').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const currentActive = btn.getAttribute('data-active') === 'true';
          try {
            await apiRequest(`/users/${id}`, {
              method: 'PUT',
              body: JSON.stringify({ is_active: !currentActive })
            });
            loadUsers();
          } catch (err) {
            alert('Error updating status: ' + err.message);
          }
        });
      });

      // Wire password reset
      tbody.querySelectorAll('.btn-reset-pwd').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const email = btn.getAttribute('data-email');
          if (!confirm(`Reset credentials for ${email}?`)) return;

          try {
            const res = await apiRequest(`/users/${id}/reset-password`, { method: 'POST' });
            openModal({
              title: 'Login Credentials Generated',
              contentHtml: `
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                  <p style="font-size: 0.875rem; color: var(--text-secondary);">
                    Share these new credentials securely with the user:
                  </p>
                  <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 0.875rem;">
                    <div><strong>Username / Email:</strong> ${email}</div>
                    <div style="margin-top: 0.5rem;"><strong>New Password:</strong> ${res.newPassword}</div>
                  </div>
                </div>
              `
            });
          } catch (err) {
            alert('Reset error: ' + err.message);
          }
        });
      });

      // Wire delete user
      tbody.querySelectorAll('.btn-delete-user').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!confirm('Are you sure you want to permanently delete this user account?')) return;
          try {
            await apiRequest(`/users/${id}`, { method: 'DELETE' });
            loadUsers();
          } catch (err) {
            alert('Delete error: ' + err.message);
          }
        });
      });
    } catch (err) {
      container.querySelector('#users-table-body').innerHTML = `
        <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--status-danger);">Failed to load users: ${err.message}</td></tr>
      `;
    }
  };

  await loadUsers();

  // Create User Modal with credential generation
  container.querySelector('#btn-create-user')?.addEventListener('click', () => {
    openModal({
      title: 'Provision New User Account',
      contentHtml: `
        <form id="form-create-new-user" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Full Name *</label>
            <input name="full_name" required placeholder="e.g. David Vance" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Email Address *</label>
            <input name="email" type="email" required placeholder="user@company.com" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Role *</label>
              <select name="role" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--bg-surface);">
                <option value="user" selected>Regular User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Custom Password (optional)</label>
              <input name="password" placeholder="Leave empty to auto-generate" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Authorized Tracking Targets</label>
            <input name="assigned_targets" value="Web Barracks Login Branding Studio, Web Barracks Speed Engine" placeholder="Comma-separated points or projects" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
          </div>

          <div style="border: 1px solid var(--border-default); padding: 0.75rem; border-radius: var(--radius-md); background: var(--bg-subtle);">
            <div style="font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.5rem;">Tracking &amp; Monitoring Configuration</div>
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; margin-bottom: 0.35rem;">
              <input type="checkbox" name="screenshots_enabled" checked /> Enable transparent background screenshot capture
            </label>
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
              <span>Capture interval:</span>
              <select name="screenshot_interval_minutes" style="padding: 0.25rem; border: 1px solid var(--border-strong); border-radius: 4px;">
                <option value="5">Every 5 minutes</option>
                <option value="10" selected>Every 10 minutes</option>
                <option value="15">Every 15 minutes</option>
              </select>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn-wb-primary">Create User &amp; Generate Credentials</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-create-new-user');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const targets = fd.get('assigned_targets').toString().split(',').map((t) => t.trim()).filter(Boolean);

          try {
            const res = await apiRequest('/users', {
              method: 'POST',
              body: JSON.stringify({
                full_name: fd.get('full_name'),
                email: fd.get('email'),
                role: fd.get('role'),
                password: fd.get('password') || undefined,
                assigned_targets: targets,
                tracking_permissions: {
                  can_track: true,
                  screenshots_enabled: fd.get('screenshots_enabled') === 'on',
                  screenshot_interval_minutes: parseInt(fd.get('screenshot_interval_minutes'), 10),
                  allow_user_delete: true
                }
              })
            });

            close();
            openModal({
              title: 'User Successfully Provisioned',
              contentHtml: `
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                  <p style="font-size: 0.875rem; color: var(--text-secondary);">
                    User account <strong>${res.user.email}</strong> is ready. Share these login credentials through a secure channel:
                  </p>
                  <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 0.875rem;">
                    <div><strong>Username / Email:</strong> ${res.user.email}</div>
                    <div style="margin-top: 0.5rem;"><strong>Password:</strong> ${res.temporaryPassword}</div>
                  </div>
                </div>
              `
            });
            loadUsers();
          } catch (err) {
            alert('Failed to create user: ' + err.message);
          }
        });
      }
    });
  });
}
