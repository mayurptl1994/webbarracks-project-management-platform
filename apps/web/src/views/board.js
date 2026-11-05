import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openDrawer, openModal } from '../components/modal.js';

export async function renderBoardView(container) {
  const urlParams = new URLSearchParams(window.location.search);
  let currentProjectId = urlParams.get('projectId') || '';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <!-- Board Header & Project Selector -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Kanban Board</h1>
          <select id="select-board-project" style="padding: 0.4rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-surface); font-weight: 600;">
            <option value="">All Projects</option>
          </select>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button id="btn-create-task" class="btn btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            <span>New Task</span>
          </button>
        </div>
      </div>

      <!-- Kanban Columns Container -->
      <div id="kanban-container" class="kanban-board">
        <div class="kanban-column skeleton" style="height: 400px;"></div>
        <div class="kanban-column skeleton" style="height: 400px;"></div>
        <div class="kanban-column skeleton" style="height: 400px;"></div>
        <div class="kanban-column skeleton" style="height: 400px;"></div>
        <div class="kanban-column skeleton" style="height: 400px;"></div>
      </div>
    </div>
  `;

  // 1. Load Projects into selector
  const projects = await apiRequest('/projects');
  const projectSelect = container.querySelector('#select-board-project');
  projects.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.key} - ${p.name}`;
    if (p.id === currentProjectId) opt.selected = true;
    projectSelect.appendChild(opt);
  });

  projectSelect.addEventListener('change', (e) => {
    currentProjectId = e.target.value;
    loadBoardTasks();
  });

  const COLUMNS = [
    { id: 'backlog', label: 'Backlog', badgeClass: 'badge-backlog' },
    { id: 'todo', label: 'To Do', badgeClass: 'badge-todo' },
    { id: 'in_progress', label: 'In Progress', badgeClass: 'badge-in_progress' },
    { id: 'in_review', label: 'In Review', badgeClass: 'badge-in_review' },
    { id: 'done', label: 'Done', badgeClass: 'badge-done' }
  ];

  // 2. Load Tasks and Render Kanban Columns
  const loadBoardTasks = async () => {
    const endpoint = currentProjectId ? `/tasks?projectId=${currentProjectId}` : '/tasks';
    const tasks = await apiRequest(endpoint);
    const activeTimer = store.getState('activeTimer');
    const boardContainer = container.querySelector('#kanban-container');

    boardContainer.innerHTML = COLUMNS.map((col) => {
      const colTasks = tasks.filter((t) => t.status === col.id);
      return `
        <div class="kanban-column" data-status="${col.id}">
          <div class="kanban-column-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span>${col.label}</span>
              <span class="badge ${col.badgeClass}">${colTasks.length}</span>
            </div>
            <button class="btn btn-sm btn-secondary btn-quick-add" data-status="${col.id}" title="Quick add task" style="padding: 2px 6px;">+</button>
          </div>

          <div class="kanban-column-body" data-status="${col.id}">
            ${colTasks
              .map((t) => {
                const isRunningOnThis = activeTimer && activeTimer.task_id === t.id;
                const priorityColor =
                  t.priority === 'urgent'
                    ? 'var(--status-danger)'
                    : t.priority === 'high'
                    ? 'var(--status-warning)'
                    : 'var(--text-muted)';

                return `
                <div class="kanban-card" draggable="true" data-task-id="${t.id}">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                    <span style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted);">${t.key}</span>
                    <span style="font-size: 0.6875rem; font-weight: 600; color: ${priorityColor}; text-transform: uppercase;">${t.priority}</span>
                  </div>

                  <div style="font-size: 0.875rem; font-weight: 600; line-height: 1.35; margin-bottom: 0.5rem;">
                    ${t.title}
                  </div>

                  <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                      ${t.assignees
                        ?.slice(0, 2)
                        .map(
                          (a) => `
                        <div style="width: 20px; height: 20px; border-radius: 50%; background: var(--bg-muted); font-size: 0.625rem; font-weight: 700; display: flex; align-items: center; justify-content: center;" title="${a.full_name}">
                          ${a.full_name.charAt(0)}
                        </div>
                      `
                        )
                        .join('')}
                    </div>

                    <!-- Direct Timer Trigger Button -->
                    <button class="btn btn-sm ${isRunningOnThis ? 'btn-danger' : 'btn-secondary'} btn-card-timer" data-task-id="${t.id}" style="padding: 2px 8px; font-size: 0.6875rem;">
                      ${isRunningOnThis ? 'Tracking' : 'Start'}
                    </button>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      `;
    }).join('');

    // Attach Drag and Drop handlers
    attachDragAndDrop(boardContainer, loadBoardTasks);

    // Attach Task Detail Click handlers
    boardContainer.querySelectorAll('.kanban-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicked on the start timer button
        if (e.target.closest('.btn-card-timer')) return;
        const taskId = card.getAttribute('data-task-id');
        openTaskDetailDrawer(taskId, loadBoardTasks);
      });
    });

    // Attach Timer Trigger handlers
    boardContainer.querySelectorAll('.btn-card-timer').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        const active = store.getState('activeTimer');

        if (active && active.task_id === taskId) {
          // Stop timer
          try {
            await apiRequest('/time/stop', { method: 'POST' });
            store.setState('activeTimer', null);
            loadBoardTasks();
          } catch (err) {
            alert('Failed to stop timer: ' + err.message);
          }
        } else {
          // Start timer (switch if already active)
          try {
            const res = await apiRequest('/time/start', {
              method: 'POST',
              body: JSON.stringify({ task_id: taskId, switch_active: true })
            });
            store.setState('activeTimer', res.entry);
            loadBoardTasks();
          } catch (err) {
            alert('Failed to start timer: ' + err.message);
          }
        }
      });
    });

    // Quick add task in column
    boardContainer.querySelectorAll('.btn-quick-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const colStatus = btn.getAttribute('data-status');
        showCreateTaskModal(colStatus, loadBoardTasks);
      });
    });
  };

  await loadBoardTasks();

  // Create Task button
  container.querySelector('#btn-create-task')?.addEventListener('click', () => {
    showCreateTaskModal('todo', loadBoardTasks);
  });
}

// Drag & Drop implementation
function attachDragAndDrop(container, onDropSuccess) {
  let draggedCard = null;

  container.querySelectorAll('.kanban-card').forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.getAttribute('data-task-id'));
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedCard = null;
    });
  });

  container.querySelectorAll('.kanban-column-body').forEach((colBody) => {
    colBody.addEventListener('dragover', (e) => {
      e.preventDefault();
      colBody.style.background = 'var(--bg-muted)';
    });

    colBody.addEventListener('dragleave', () => {
      colBody.style.background = '';
    });

    colBody.addEventListener('drop', async (e) => {
      e.preventDefault();
      colBody.style.background = '';
      const taskId = e.dataTransfer.getData('text/plain');
      const targetStatus = colBody.getAttribute('data-status');

      if (taskId && targetStatus) {
        try {
          await apiRequest(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: targetStatus })
          });
          onDropSuccess();
        } catch (err) {
          alert('Failed to update task status: ' + err.message);
        }
      }
    });
  });
}

// Task Detail Drawer
async function openTaskDetailDrawer(taskId, onUpdate) {
  const data = await apiRequest(`/tasks/${taskId}`);
  const task = data.task;
  const isClient = store.getState('workspaceRole') === 'client';

  openDrawer({
    title: `${task.key}: ${task.title}`,
    contentHtml: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Status & Actions -->
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <select id="drawer-task-status" style="padding: 0.35rem 0.65rem; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-surface); font-weight: 600;">
              <option value="backlog" ${task.status === 'backlog' ? 'selected' : ''}>Backlog</option>
              <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="in_review" ${task.status === 'in_review' ? 'selected' : ''}>In Review</option>
              <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
            <span class="badge" style="background: var(--bg-muted);">${task.priority}</span>
          </div>

          <button id="drawer-btn-timer" class="btn btn-sm btn-primary">
            Start Timer
          </button>
        </div>

        <!-- Description -->
        <div>
          <h4 style="font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Description</h4>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.35rem; line-height: 1.5;">
            ${task.description || 'No description provided.'}
          </p>
        </div>

        <!-- Multi-User Time Breakdown -->
        <div class="card" style="padding: 1rem;">
          <h4 style="font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">
            Time Tracked by Teammates (${Math.round((data.totalSecondsTracked / 3600) * 10) / 10}h total)
          </h4>
          ${
            data.timeBreakdown.length === 0
              ? `<div style="font-size: 0.8125rem; color: var(--text-muted);">No time tracked on this task yet.</div>`
              : data.timeBreakdown
                  .map(
                    (tb) => `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8125rem; padding: 0.25rem 0;">
                  <span>${tb.fullName}</span>
                  <strong style="font-family: var(--font-mono);">${tb.hours}h</strong>
                </div>
              `
                  )
                  .join('')
          }
        </div>

        <!-- Comments Section -->
        <div>
          <h4 style="font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.75rem;">
            Activity & Discussion
          </h4>

          <div id="drawer-comments-list" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
            ${data.comments
              .map(
                (c) => `
              <div style="padding: 0.75rem; border-radius: var(--radius-md); background: var(--bg-subtle); border: 1px solid var(--border-subtle);">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.25rem;">
                  <strong>${c.user?.full_name || 'Team Member'}</strong>
                  ${c.is_internal ? `<span class="badge" style="background: var(--status-warning-bg); color: var(--status-warning); font-size: 0.625rem;">INTERNAL</span>` : ''}
                </div>
                <div style="font-size: 0.875rem; color: var(--text-primary);">${c.content}</div>
              </div>
            `
              )
              .join('')}
          </div>

          <form id="drawer-comment-form" style="display: flex; flex-direction: column; gap: 0.5rem;">
            <textarea name="content" required placeholder="Write a comment..." rows="2" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);"></textarea>
            ${
              !isClient
                ? `
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
                <input type="checkbox" name="is_internal" /> Mark as internal (hidden from clients)
              </label>
            `
                : ''
            }
            <button type="submit" class="btn btn-sm btn-secondary" style="align-self: flex-end;">Post Comment</button>
          </form>
        </div>
      </div>
    `,
    onMount: (overlay, close) => {
      // Status update
      overlay.querySelector('#drawer-task-status')?.addEventListener('change', async (e) => {
        await apiRequest(`/tasks/${taskId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: e.target.value })
        });
        onUpdate();
      });

      // Timer button
      overlay.querySelector('#drawer-btn-timer')?.addEventListener('click', async () => {
        try {
          const res = await apiRequest('/time/start', {
            method: 'POST',
            body: JSON.stringify({ task_id: taskId, switch_active: true })
          });
          store.setState('activeTimer', res.entry);
          close();
          onUpdate();
        } catch (err) {
          alert('Timer error: ' + err.message);
        }
      });

      // Post comment
      const commentForm = overlay.querySelector('#drawer-comment-form');
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(commentForm);
        try {
          await apiRequest(`/tasks/${taskId}/comments`, {
            method: 'POST',
            body: JSON.stringify({
              content: fd.get('content'),
              is_internal: fd.get('is_internal') === 'on'
            })
          });
          close();
          openTaskDetailDrawer(taskId, onUpdate);
        } catch (err) {
          alert('Failed to post comment: ' + err.message);
        }
      });
    }
  });
}

// Create Task Modal
async function showCreateTaskModal(defaultStatus = 'todo', onDone) {
  const projects = await apiRequest('/projects');
  if (projects.length === 0) {
    alert('Please create a project first before adding tasks.');
    return;
  }

  openModal({
    title: 'Create New Task',
    contentHtml: `
      <form id="form-create-task" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Project *</label>
          <select name="project_id" required style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">
            ${projects.map((p) => `<option value="${p.id}">${p.key} - ${p.name}</option>`).join('')}
          </select>
        </div>

        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Task Title *</label>
          <input name="title" required placeholder="e.g. Implement OAuth login provider" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
        </div>

        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Description</label>
          <textarea name="description" rows="3" placeholder="Acceptance criteria and technical notes..." style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);"></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Status</label>
            <select name="status" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">
              <option value="backlog" ${defaultStatus === 'backlog' ? 'selected' : ''}>Backlog</option>
              <option value="todo" ${defaultStatus === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${defaultStatus === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="in_review" ${defaultStatus === 'in_review' ? 'selected' : ''}>In Review</option>
              <option value="done" ${defaultStatus === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Priority</label>
            <select name="priority" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.25rem;">Estimate (hrs)</label>
            <input name="estimate_hours" type="number" step="0.5" value="8" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--bg-surface);" />
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
          <button type="submit" class="btn btn-primary">Save Task</button>
        </div>
      </form>
    `,
    onMount: (overlay, close) => {
      const form = overlay.querySelector('#form-create-task');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
          project_id: fd.get('project_id'),
          title: fd.get('title'),
          description: fd.get('description'),
          status: fd.get('status'),
          priority: fd.get('priority'),
          estimate_hours: parseFloat(fd.get('estimate_hours') || '0')
        };

        try {
          await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          close();
          onDone();
        } catch (err) {
          alert('Failed to create task: ' + err.message);
        }
      });
    }
  });
}
