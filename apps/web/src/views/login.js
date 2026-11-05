import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';

export function renderLoginView(container) {
  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-app); padding: 1.5rem;">
      <div class="wb-card" style="width: 100%; max-width: 420px; padding: 2.25rem; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        <!-- Logo -->
        <div style="display: flex; align-items: center; gap: 0.625rem; margin-bottom: 1.5rem;">
          <div style="width: 32px; height: 32px; background: #2563eb; color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.125rem;">
            w
          </div>
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">
            Web Barracks
          </div>
          <span class="sidebar-badge-pro" style="color: #64748b; border-color: #cbd5e1;">PRO</span>
        </div>

        <h2 style="font-size: 1.25rem; font-weight: 700; letter-spacing: -0.01em;">Sign in to your account</h2>
        <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem; margin-bottom: 1.5rem;">
          Enter your assigned administrator or user credentials.
        </p>

        <form id="form-login" style="display: flex; flex-direction: column; gap: 1rem;">
          <div id="login-error" style="display: none; padding: 0.65rem 0.75rem; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: var(--radius-md); font-size: 0.8125rem;"></div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Email Address</label>
            <input id="input-email" type="email" required value="webbarracks@gmail.com" style="width: 100%; padding: 0.55rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Password</label>
            <input id="input-password" type="password" required value="admin123" style="width: 100%; padding: 0.55rem 0.75rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 0.875rem;" />
          </div>

          <button type="submit" class="btn-wb-primary" style="width: 100%; padding: 0.65rem; justify-content: center; font-size: 0.875rem; margin-top: 0.5rem;">
            Authenticate &amp; Enter &rarr;
          </button>
        </form>

        <!-- Quick 1-Click Demo Login Shortcuts -->
        <div style="margin-top: 1.75rem; border-top: 1px solid var(--border-default); padding-top: 1.25rem;">
          <div style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
            One-Click Demo Credentials:
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button id="btn-fill-admin" class="btn-wb-outline btn-wb-sm" style="flex: 1; font-size: 0.75rem;">
              Fill Admin Account
            </button>
            <button id="btn-fill-user" class="btn-wb-outline btn-wb-sm" style="flex: 1; font-size: 0.75rem;">
              Fill Regular User
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const emailInput = container.querySelector('#input-email');
  const pwdInput = container.querySelector('#input-password');
  const errorEl = container.querySelector('#login-error');

  container.querySelector('#btn-fill-admin')?.addEventListener('click', () => {
    emailInput.value = 'webbarracks@gmail.com';
    pwdInput.value = 'admin123';
  });

  container.querySelector('#btn-fill-user')?.addEventListener('click', () => {
    emailInput.value = 'elena.dev@webbarracks.dev';
    pwdInput.value = 'user123';
  });

  container.querySelector('#form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: emailInput.value,
          password: pwdInput.value
        })
      });

      localStorage.setItem('wb_user_id', res.user.id);
      store.setState('currentUser', res.user);
      window.location.pathname = '/';
      window.location.reload();
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed. Check your credentials.';
      errorEl.style.display = 'block';
    }
  });
}
