import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openModal } from '../components/modal.js';

export async function renderProjectsView(container) {
  const user = store.getState('currentUser');
  const isAdmin = user?.role === 'admin';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Projects</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Manage client deliverables, budget allocations, milestones, and workflows.
          </p>
        </div>

        ${
          isAdmin
            ? `
          <button id="btn-create-project" class="btn-wb-primary">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            <span>+ New Project</span>
          </button>
        `
            : ''
        }
      </div>

      <!-- Project Cards Grid -->
      <div id="projects-grid" class="projects-grid">
        <div class="card skeleton" style="height: 240px;"></div>
        <div class="card skeleton" style="height: 240px;"></div>
        <div class="card skeleton" style="height: 240px;"></div>
      </div>
    </div>
  `;

  const loadProjects = async () => {
    try {
      const [projects, allTasks] = await Promise.all([
        apiRequest('/projects'),
        apiRequest('/tasks').catch(() => [])
      ]);

      const grid = container.querySelector('#projects-grid');

      if (!projects || projects.length === 0) {
        grid.innerHTML = `
          <div class="wb-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
            <p style="color: var(--text-muted); font-size: 0.9375rem;">No projects found in this workspace.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = projects
        .map((p) => {
          const projectTasks = (allTasks || []).filter((t) => t.project_id === p.id);
          const tasksCount = projectTasks.length;

          const healthBadge =
            p.health === 'on_track'
              ? `<span class="status-pill-published" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">ON TRACK</span>`
              : p.health === 'at_risk'
              ? `<span class="status-pill-published" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a;">AT RISK</span>`
              : `<span class="status-pill-published" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;">OVER BUDGET</span>`;

          const budgetVal = p.budget_value || 1;
          const spentVal = p.budget_spent || 0;
          const burnPercent = Math.min(100, Math.round((spentVal / budgetVal) * 100));

          const burnLabel =
            p.budget_type === 'hours'
              ? `${spentVal}h of ${budgetVal} hours (${burnPercent}%)`
              : `$${spentVal.toLocaleString()} of $${budgetVal.toLocaleString()} (${burnPercent}%)`;

          const barColor = burnPercent > 90 ? '#ef4444' : burnPercent > 70 ? '#f59e0b' : '#10b981';

          return `
          <div class="project-card">
            <div class="project-card-accent" style="background: ${p.color || '#2563eb'};"></div>

            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #475569; font-family: var(--font-mono); background: #f1f5f9; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
                  ${p.key}
                </span>
                <div>${healthBadge}</div>
              </div>

              <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em;">${p.name}</h3>

              <div style="display: flex; align-items: center; gap: 0.35rem; color: var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem;">
                <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <span>${p.client_name || 'Internal Product'}</span>
              </div>

              <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.65rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${p.description || 'No project description provided.'}
              </p>
            </div>

            <!-- Budget & Progress Bar -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.4rem; font-weight: 600;">
                <span>Budget Burn</span>
                <span style="font-family: var(--font-mono);">${burnLabel}</span>
              </div>
              <div style="width: 100%; height: 7px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
                <div style="width: ${burnPercent}%; height: 100%; background: ${barColor}; border-radius: 9999px; transition: width 300ms ease;"></div>
              </div>
            </div>

            <!-- Footer Action links -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-default); padding-top: 0.875rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
                ${tasksCount} Tasks • Active
              </span>
              <a href="/board?projectId=${p.id}" data-link class="btn-wb-outline btn-wb-sm" style="font-weight: 600;">
                Open Kanban &rarr;
              </a>
            </div>
          </div>
        `;
        })
        .join('');
    } catch (err) {
      container.querySelector('#projects-grid').innerHTML = `
        <div class="wb-card" style="grid-column: 1 / -1; color: var(--status-danger);">Failed to load projects: ${err.message}</div>
      `;
    }
  };

  await loadProjects();

  // Create Project Modal
  container.querySelector('#btn-create-project')?.addEventListener('click', () => {
    openModal({
      title: 'Create New Project',
      contentHtml: `
        <form id="form-create-project" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Project Name *</label>
            <input name="name" required placeholder="e.g. AI Workflow Engine" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-sans);" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Project Key (2-5 letters) *</label>
              <input name="key" required maxlength="5" placeholder="e.g. AIE" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-mono); text-transform: uppercase;" />
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Client Name</label>
              <input name="client_name" placeholder="e.g. TechCorp Labs" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Description</label>
            <textarea name="description" rows="2" placeholder="Brief technical summary..." style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-sans);"></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Budget Type</label>
              <select name="budget_type" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);">
                <option value="hours">Hours</option>
                <option value="fixed_amount">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Budget Allocation</label>
              <input name="budget_value" type="number" required value="200" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn-wb-primary">Create Project</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-create-project');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          try {
            await apiRequest('/projects', {
              method: 'POST',
              body: JSON.stringify({
                name: fd.get('name'),
                key: (fd.get('key') || '').toString().toUpperCase(),
                client_name: fd.get('client_name') || 'Internal',
                description: fd.get('description'),
                budget_type: fd.get('budget_type'),
                budget_value: Number(fd.get('budget_value')) || 100,
                color: '#2563eb'
              })
            });
            close();
            loadProjects();
          } catch (err) {
            alert('Error creating project: ' + err.message);
          }
        });
      }
    });
  });
}
