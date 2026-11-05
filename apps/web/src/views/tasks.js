import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';

export async function renderTasksListView(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Tasks &amp; Backlog</h1>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Full searchable project backlog, priority matrix, estimates, and time controls.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <input id="input-task-search" type="search" placeholder="Search tasks by name or key..." style="padding: 0.45rem 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); background: var(--bg-surface); font-size: 0.875rem; width: 280px; font-family: var(--font-sans);" />
        </div>
      </div>

      <div class="wb-card" style="padding: 0; overflow-x: auto;">
        <table class="wb-table">
          <thead>
            <tr>
              <th>KEY</th>
              <th>CLIENT</th>
              <th>TASK TITLE</th>
              <th>STATUS</th>
              <th>PRIORITY</th>
              <th>ESTIMATE</th>
              <th>ASSIGNEE</th>
              <th style="text-align: right;">ACTION</th>
            </tr>
          </thead>
          <tbody id="tasks-table-body">
            <tr><td colspan="8" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">Loading tasks...</td></tr>
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
    const activeSession = store.getState('activeSession');
    if (!tasks || tasks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">No tasks found.</td></tr>`;
      return;
    }

    tbody.innerHTML = tasks
      .map((t) => {
        const isRunning = activeSession && activeSession.task_id === t.id && activeSession.status === 'active';
        const priorityBadge =
          t.priority === 'urgent'
            ? `<span style="color: #dc2626; font-weight: 700; text-transform: uppercase; font-size: 0.75rem;">Urgent</span>`
            : t.priority === 'high'
            ? `<span style="color: #ea580c; font-weight: 700; text-transform: uppercase; font-size: 0.75rem;">High</span>`
            : t.priority === 'medium'
            ? `<span style="color: #2563eb; font-weight: 600; text-transform: uppercase; font-size: 0.75rem;">Medium</span>`
            : `<span style="color: #64748b; font-weight: 500; text-transform: uppercase; font-size: 0.75rem;">Low</span>`;

        const assigneeInitial = (t.assignee_name || 'U').charAt(0);
        const assigneeDisplay = t.assignee_name
          ? `
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: #27272a; color: #ffffff; font-size: 0.625rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">
                ${assigneeInitial}
              </div>
              <span style="font-size: 0.8125rem; color: var(--text-primary); font-weight: 500;">${t.assignee_name}</span>
            </div>
          `
          : `<span style="font-size: 0.8125rem; color: var(--text-muted); font-style: italic;">Unassigned</span>`;

        return `
        <tr>
          <td style="font-weight: 700; color: var(--text-muted); font-size: 0.8125rem; font-family: var(--font-mono);">${t.key}</td>
          <td>
            <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); background: #f1f5f9; padding: 2px 6px; border-radius: var(--radius-sm);">
              ${t.client_name || 'Direct Client'}
            </span>
          </td>
          <td style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">${t.title}</td>
          <td>
            <select class="select-inline-status" data-task-id="${t.id}" style="padding: 0.25rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-strong); background: var(--bg-surface); font-size: 0.75rem; font-weight: 600;">
              <option value="backlog" ${t.status === 'backlog' ? 'selected' : ''}>Backlog</option>
              <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="in_review" ${t.status === 'in_review' ? 'selected' : ''}>In Review</option>
              <option value="done" ${t.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </td>
          <td>${priorityBadge}</td>
          <td style="font-family: var(--font-mono); font-size: 0.8125rem;">${t.estimate_hours || 0}h</td>
          <td>${assigneeDisplay}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm ${isRunning ? 'btn-danger' : 'btn-secondary'} btn-list-timer" data-task-id="${t.id}">
              ${isRunning ? '■ Stop' : '▶ Track'}
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
        await apiRequest(`/tasks/${taskId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: e.target.value })
        });
      });
    });

    // Timer trigger
    tbody.querySelectorAll('.btn-list-timer').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const taskId = btn.getAttribute('data-task-id');
        const active = store.getState('activeSession');
        if (active && active.task_id === taskId && active.status === 'active') {
          await apiRequest('/tracking/stop', { method: 'POST' });
          store.setState('activeSession', null);
        } else {
          const res = await apiRequest('/tracking/start', {
            method: 'POST',
            body: JSON.stringify({ taskId })
          });
          store.setState('activeSession', res);
        }
        loadTasks();
      });
    });
  };

  // Search filter
  container.querySelector('#input-task-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allTasks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q)
    );
    renderTable(filtered);
  });

  await loadTasks();
}

export const renderTasksView = renderTasksListView;
