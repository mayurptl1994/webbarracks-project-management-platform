import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';

export async function renderTasksListView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Tasks List</h1>
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
            Full searchable backlog, estimates, assignees, and timer controls.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <input id="input-task-search" type="search" placeholder="Search tasks..." style="padding: 0.4rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-surface); font-size: 0.875rem; width: 220px;" />
        </div>
      </div>

      <div class="card" style="padding: 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-subtle); text-align: left; font-size: 0.75rem; color: var(--text-muted);">
              <th style="padding: 0.75rem 1rem;">KEY</th>
              <th style="padding: 0.75rem 1rem;">TITLE</th>
              <th style="padding: 0.75rem 1rem;">STATUS</th>
              <th style="padding: 0.75rem 1rem;">PRIORITY</th>
              <th style="padding: 0.75rem 1rem;">ESTIMATE</th>
              <th style="padding: 0.75rem 1rem;">ASSIGNEES</th>
              <th style="padding: 0.75rem 1rem; text-align: right;">ACTION</th>
            </tr>
          </thead>
          <tbody id="tasks-table-body">
            <tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading tasks...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = container.querySelector('#tasks-table-body');
  let allTasks = [];

  const loadTasks = async () => {
    try {
      allTasks = await apiRequest('/tasks');
      renderTable(allTasks);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--status-danger);">Failed to load tasks: ${err.message}</td></tr>`;
    }
  };

  const renderTable = (tasks) => {
    const activeTimer = store.getState('activeTimer');
    if (tasks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-muted);">No tasks found.</td></tr>`;
      return;
    }

    tbody.innerHTML = tasks
      .map((t) => {
        const isRunning = activeTimer && activeTimer.task_id === t.id;
        return `
        <tr style="border-bottom: 1px solid var(--border-subtle);">
          <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--text-muted); font-size: 0.8125rem;">${t.key}</td>
          <td style="padding: 0.75rem 1rem; font-weight: 600;">${t.title}</td>
          <td style="padding: 0.75rem 1rem;">
            <select class="select-inline-status" data-task-id="${t.id}" style="padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-default); background: var(--bg-surface); font-size: 0.75rem; font-weight: 600;">
              <option value="backlog" ${t.status === 'backlog' ? 'selected' : ''}>Backlog</option>
              <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="in_review" ${t.status === 'in_review' ? 'selected' : ''}>In Review</option>
              <option value="done" ${t.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </td>
          <td style="padding: 0.75rem 1rem;">
            <span class="badge" style="background: var(--bg-muted);">${t.priority}</span>
          </td>
          <td style="padding: 0.75rem 1rem; font-family: var(--font-mono);">${t.estimate_hours || 0}h</td>
          <td style="padding: 0.75rem 1rem;">
            ${(t.assignees || []).map((a) => a.full_name).join(', ') || 'Unassigned'}
          </td>
          <td style="padding: 0.75rem 1rem; text-align: right;">
            <button class="btn btn-sm ${isRunning ? 'btn-danger' : 'btn-secondary'} btn-list-timer" data-task-id="${t.id}">
              ${isRunning ? 'Tracking' : 'Start'}
            </button>
          </td>
        </tr>
      `;
      })
      .join('');

    // Inline status change
    tbody.querySelectorAll('.select-inline-status').forEach((select) => {
      select.addEventListener('change', async (e) => {
        const taskId = select.getAttribute('data-task-id');
        await apiRequest(`/tasks/${taskId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: e.target.value })
        });
      });
    });

    // Timer trigger
    tbody.querySelectorAll('.btn-list-timer').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const taskId = btn.getAttribute('data-task-id');
        const active = store.getState('activeTimer');
        if (active && active.task_id === taskId) {
          await apiRequest('/time/stop', { method: 'POST' });
          store.setState('activeTimer', null);
        } else {
          const res = await apiRequest('/time/start', {
            method: 'POST',
            body: JSON.stringify({ task_id: taskId, switch_active: true })
          });
          store.setState('activeTimer', res.entry);
        }
        loadTasks();
      });
    });
  };

  // Search filter
  container.querySelector('#input-task-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allTasks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q)
    );
    renderTable(filtered);
  });

  await loadTasks();
}
