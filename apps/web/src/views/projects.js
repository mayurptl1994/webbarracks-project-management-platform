import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openModal } from '../components/modal.js';

export async function renderProjectsView(container) {
  const canCreate = store.hasPermission('project:create');

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Projects</h1>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
            Manage client deliverables, budget hours, milestones, and workflows.
          </p>
        </div>
        ${
          canCreate
            ? `
          <button id="btn-create-project" class="btn btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            <span>New Project</span>
          </button>
        `
            : ''
        }
      </div>

      <!-- Project Cards Grid -->
      <div id="projects-grid" class="grid-cols-2">
        <div class="card skeleton" style="height: 180px;"></div>
        <div class="card skeleton" style="height: 180px;"></div>
      </div>
    </div>
  `;

  const loadProjects = async () => {
    try {
      const projects = await apiRequest('/projects');
      const grid = container.querySelector('#projects-grid');

      if (projects.length === 0) {
        grid.innerHTML = `
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <p style="color: var(--text-muted);">No projects found in this workspace.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = projects
        .map((p) => {
          const healthBadge =
            p.health === 'on_track'
              ? `<span class="badge badge-done">On Track</span>`
              : p.health === 'at_risk'
              ? `<span class="badge badge-in_review">At Risk</span>`
              : `<span class="badge badge-todo" style="background: var(--status-danger-bg); color: var(--status-danger);">Over Budget</span>`;

          const burnPercent = Math.min(100, p.burnPercent || 0);

          return `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 1.25rem; border-top: 4px solid ${p.color};">
            <div>
              <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                <div>
                  <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em;">${p.key}</span>
                  <h3 style="font-size: 1.125rem; font-weight: 700; margin-top: 0.25rem;">${p.name}</h3>
                </div>
                <div>${healthBadge}</div>
              </div>
              <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.4;">
                ${p.description || 'No description provided.'}
              </p>
            </div>

            <!-- Budget & Progress Bar -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem;">
                <span>Budget Burn: ${burnPercent}%</span>
                <span>${p.trackedHours || 0}h of ${p.budget_value} ${p.budget_type}</span>
              </div>
              <div style="width: 100%; height: 6px; background: var(--bg-muted); border-radius: 9999px; overflow: hidden;">
                <div style="width: ${burnPercent}%; height: 100%; background: ${burnPercent > 90 ? 'var(--status-danger)' : 'var(--text-primary)'};"></div>
              </div>
            </div>

            <!-- Footer Action links -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">
                ${p.tasksCount || 0} Tasks • ${p.membersCount || 0} Members
              </span>
              <div style="display: flex; gap: 0.5rem;">
                <a href="/board?projectId=${p.id}" data-link class="btn btn-sm btn-secondary">
                  Open Board &rarr;
                </a>
              </div>
            </div>
          </div>
        `;
        })
        .join('');
    } catch (err) {
      container.querySelector('#projects-grid').innerHTML = `
        <div class="card" style="grid-column: 1 / -1; color: var(--status-danger);">Failed to load projects: ${err.message}</div>
      `;
    }
  };

  await loadProjects();

  // Create Project Modal trigger
  container.querySelector('#btn-create-project')?.addEventListener('click', () => {
    openModal({
      title: 'Create New Project',
      contentHtml: `
        <form id="form-create-project" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Project Name *</label>
            <input name="name" required placeholder="e.g. Mobile Redesign" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Key (2-10 chars) *</label>
              <input name="key" required uppercase maxlength="8" placeholder="e.g. MOB" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface); text-transform: uppercase;" />
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Color</label>
              <input name="color" type="color" value="#0f172a" style="width: 100%; height: 38px; padding: 2px; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Description</label>
            <textarea name="description" rows="2" placeholder="Brief scope and deliverables..." style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);"></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Budget Type</label>
              <select name="budget_type" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">
                <option value="none">No Budget</option>
                <option value="hours" selected>Total Hours</option>
                <option value="fixed_amount">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Budget Target</label>
              <input name="budget_value" type="number" step="1" value="100" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="submit" class="btn btn-primary">Create Project</button>
          </div>
        </form>
      `,
      onMount: (overlay, close) => {
        const form = overlay.querySelector('#form-create-project');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const payload = {
            name: fd.get('name'),
            key: fd.get('key').toString().toUpperCase(),
            color: fd.get('color'),
            description: fd.get('description'),
            budget_type: fd.get('budget_type'),
            budget_value: parseFloat(fd.get('budget_value') || '0')
          };

          try {
            await apiRequest('/projects', {
              method: 'POST',
              body: JSON.stringify(payload)
            });
            close();
            loadProjects();
          } catch (err) {
            alert('Failed to create project: ' + err.message);
          }
        });
      }
    });
  });
}

