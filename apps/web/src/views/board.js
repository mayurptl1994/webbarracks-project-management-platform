import { apiRequest } from '../core/api.js';
import { store } from '../core/store.js';
import { openDrawer, openModal } from '../components/modal.js';

export async function renderBoardView(container) {
  const urlParams = new URLSearchParams(window.location.search);
  let currentClientId = urlParams.get('clientId') || '';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Board Header & Client Selector -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <h1 style="font-size: 1.625rem; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em;">Kanban Board</h1>
            <select id="select-board-client" style="padding: 0.4rem 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); background: var(--bg-surface); font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">
              <option value="">All Clients</option>
            </select>
          </div>
          <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
            Interactive drag-and-drop task pipeline across development stages.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button id="btn-create-task" class="btn-wb-primary">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            <span>+ New Task</span>
          </button>
        </div>
      </div>

      <!-- Kanban Columns Horizontal Container -->
      <div id="kanban-container" class="kanban-board">
        <div class="kanban-column skeleton" style="height: 480px;"></div>
        <div class="kanban-column skeleton" style="height: 480px;"></div>
        <div class="kanban-column skeleton" style="height: 480px;"></div>
        <div class="kanban-column skeleton" style="height: 480px;"></div>
        <div class="kanban-column skeleton" style="height: 480px;"></div>
      </div>
    </div>
  `;

  // 1. Load Clients into selector
  try {
    const clients = await apiRequest('/clients');
    const clientSelect = container.querySelector('#select-board-client');
    if (clients && clients.length > 0) {
      clients.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.currency} ${c.hourly_rate}/hr)`;
        if (c.id === currentClientId) opt.selected = true;
        clientSelect.appendChild(opt);
      });
    }

    clientSelect.addEventListener('change', (e) => {
      currentClientId = e.target.value;
      const newUrl = currentClientId ? `/board?clientId=${currentClientId}` : '/board';
      window.history.pushState(null, '', newUrl);
      loadBoardTasks();
    });
  } catch (err) {
    console.error('Failed to load clients for board:', err);
  }

  const COLUMNS = [
    { id: 'backlog', label: 'Backlog', badgeClass: 'badge-backlog' },
    { id: 'todo', label: 'To Do', badgeClass: 'badge-todo' },
    { id: 'in_progress', label: 'In Progress', badgeClass: 'badge-in_progress' },
    { id: 'in_review', label: 'In Review', badgeClass: 'badge-in_review' },
    { id: 'done', label: 'Done', badgeClass: 'badge-done' }
  ];

  // 2. Load Tasks and Render Kanban Columns
  const loadBoardTasks = async () => {
    try {
      let tasks = await apiRequest('/tasks');
      if (currentClientId) {
        tasks = tasks.filter((t) => t.client_id === currentClientId);
      }
      const activeSession = store.getState('activeSession');
      const boardContainer = container.querySelector('#kanban-container');

      boardContainer.innerHTML = COLUMNS.map((col) => {
        const colTasks = (tasks || []).filter((t) => t.status === col.id);
        return `
          <div class="kanban-column" data-status="${col.id}">
            <div class="kanban-column-header">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${col.label}</span>
                <span class="badge ${col.badgeClass}">${colTasks.length}</span>
              </div>
              <button class="btn btn-sm btn-secondary btn-quick-add" data-status="${col.id}" title="Quick add task" style="padding: 2px 8px; font-weight: 700; font-size: 0.8125rem;">+</button>
            </div>

            <div class="kanban-column-body" data-status="${col.id}">
              ${colTasks
                .map((t) => {
                  const isRunningOnThis = activeSession && activeSession.task_id === t.id && activeSession.status === 'active';
                  const priorityClass =
                    t.priority === 'urgent'
                      ? 'priority-urgent'
                      : t.priority === 'high'
                      ? 'priority-high'
                      : t.priority === 'medium'
                      ? 'priority-medium'
                      : 'priority-low';

                  const assigneeInitial = (t.assignee_name || 'U').charAt(0);
                  const assigneeDisplay = t.assignee_name
                    ? `
                      <div style="display: flex; align-items: center; gap: 0.35rem;">
                        <div style="width: 22px; height: 22px; border-radius: 50%; background: #27272a; color: #ffffff; font-size: 0.625rem; font-weight: 700; display: flex; align-items: center; justify-content: center;" title="${t.assignee_name}">
                          ${assigneeInitial}
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">${t.assignee_name}</span>
                      </div>
                    `
                    : `<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">Unassigned</span>`;

                  return `
                  <div class="kanban-card" draggable="true" data-task-id="${t.id}">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
                      <span style="font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">${t.key}</span>
                      <span class="${priorityClass}" style="font-size: 0.6875rem; text-transform: uppercase;">${t.priority}</span>
                    </div>

                    <div style="font-size: 0.875rem; font-weight: 600; line-height: 1.4; color: var(--text-primary); margin-bottom: 0.625rem;">
                      ${t.title}
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem; border-top: 1px solid var(--border-default); padding-top: 0.625rem;">
                      ${assigneeDisplay}

                      <!-- Direct Timer Trigger Button -->
                      <button class="btn btn-sm ${isRunningOnThis ? 'btn-danger' : 'btn-secondary'} btn-card-timer" data-task-id="${t.id}" style="padding: 2px 8px; font-size: 0.6875rem; font-weight: 600;">
                        ${isRunningOnThis ? '■ Tracking' : '▶ Track'}
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
          const active = store.getState('activeSession');

          if (active && active.task_id === taskId && active.status === 'active') {
            try {
              await apiRequest('/tracking/stop', { method: 'POST' });
              store.setState('activeSession', null);
              loadBoardTasks();
            } catch (err) {
              alert('Failed to stop timer: ' + err.message);
            }
          } else {
            try {
              const session = await apiRequest('/tracking/start', {
                method: 'POST',
                body: JSON.stringify({ taskId })
              });
              store.setState('activeSession', session);
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
          showCreateTaskModal(colStatus, currentClientId, loadBoardTasks);
        });
      });
    } catch (err) {
      console.error('Error rendering board tasks:', err);
    }
  };

  await loadBoardTasks();

  // Create Task button
  container.querySelector('#btn-create-task')?.addEventListener('click', () => {
    showCreateTaskModal('todo', currentClientId, loadBoardTasks);
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
      colBody.classList.add('drag-over');
    });

    colBody.addEventListener('dragleave', () => {
      colBody.classList.remove('drag-over');
    });

    colBody.addEventListener('drop', async (e) => {
      e.preventDefault();
      colBody.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      const targetStatus = colBody.getAttribute('data-status');

      if (taskId && targetStatus) {
        try {
          await apiRequest(`/tasks/${taskId}/status`, {
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
  try {
    const data = await apiRequest(`/tasks/${taskId}`);
    const task = data.task || data;

    openDrawer({
      title: `${task.key}: ${task.title}`,
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Status & Actions -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <select id="drawer-task-status" style="padding: 0.4rem 0.65rem; border-radius: var(--radius-md); border: 1px solid var(--border-strong); background: var(--bg-surface); font-weight: 600; font-size: 0.8125rem;">
                <option value="backlog" ${task.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="in_review" ${task.status === 'in_review' ? 'selected' : ''}>In Review</option>
                <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
              </select>
              <span class="badge badge-${task.status}">${task.status.replace('_', ' ')}</span>
            </div>

            <button id="drawer-btn-timer" class="btn btn-sm btn-primary">
              Track Time
            </button>
          </div>

          <!-- Description -->
          <div>
            <h4 style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Description</h4>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.35rem; line-height: 1.5;">
              ${task.description || 'No description provided.'}
            </p>
          </div>

          <!-- Task Metadata -->
          <div class="wb-card" style="padding: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.8125rem;">
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">ASSIGNEE</span>
              <strong style="color: var(--text-primary);">${task.assignee_name || 'Unassigned'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">PRIORITY</span>
              <strong style="text-transform: uppercase;">${task.priority || 'medium'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">ESTIMATE</span>
              <strong>${task.estimate_hours || 4} hours</strong>
            </div>
            <div>
              <span style="color: var(--text-muted); display: block; font-size: 0.75rem;">BILLABLE</span>
              <strong>${task.billable !== false ? 'Yes (Billable)' : 'No (Non-billable)'}</strong>
            </div>
          </div>
        </div>
      `,
      onMount: (overlay, close) => {
        // Status update
        overlay.querySelector('#drawer-task-status')?.addEventListener('change', async (e) => {
          await apiRequest(`/tasks/${taskId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: e.target.value })
          });
          onUpdate();
        });

        // Timer button
        overlay.querySelector('#drawer-btn-timer')?.addEventListener('click', async () => {
          try {
            const session = await apiRequest('/tracking/start', {
              method: 'POST',
              body: JSON.stringify({ taskId })
            });
            store.setState('activeSession', session);
            close();
            onUpdate();
          } catch (err) {
            alert('Error starting timer: ' + err.message);
          }
        });
      }
    });
  } catch (err) {
    alert('Failed to load task details: ' + err.message);
  }
}

// Create Task Modal
async function showCreateTaskModal(defaultStatus, defaultClientId, onSuccess) {
  let clients = [];
  try {
    clients = await apiRequest('/clients');
  } catch {
    clients = [];
  }

  const clientOptions = clients.length > 0
    ? clients.map((c) => `<option value="${c.id}" ${defaultClientId === c.id ? 'selected' : ''}>${c.name} (${c.currency} ${c.hourly_rate}/hr)</option>`).join('')
    : '<option value="">No clients configured</option>';

  openModal({
    title: 'Create New Task',
    contentHtml: `
      <form id="form-modal-create-task" style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Task Title *</label>
          <input name="title" required placeholder="e.g. Implement client portal SSO" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-sans);" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Client (Tariff) *</label>
            <select name="client_id" required style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);">
              ${clientOptions}
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Priority</label>
            <select name="priority" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium" selected>Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Description</label>
          <textarea name="description" rows="3" placeholder="Provide technical scope and acceptance criteria..." style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-family: var(--font-sans);"></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Estimate (Hours)</label>
            <input name="estimate_hours" type="number" value="6" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);" />
          </div>
          <div>
            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 0.25rem;">Status</label>
            <select name="status" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md);">
              <option value="backlog" ${defaultStatus === 'backlog' ? 'selected' : ''}>Backlog</option>
              <option value="todo" ${defaultStatus === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${defaultStatus === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="in_review" ${defaultStatus === 'in_review' ? 'selected' : ''}>In Review</option>
              <option value="done" ${defaultStatus === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
          <button type="submit" class="btn-wb-primary">Create Task</button>
        </div>
      </form>
    `,
    onMount: (overlay, close) => {
      const form = overlay.querySelector('#form-modal-create-task');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        await apiRequest('/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: fd.get('title'),
            client_id: fd.get('client_id'),
            priority: fd.get('priority'),
            description: fd.get('description'),
            estimate_hours: Number(fd.get('estimate_hours')) || 4,
            status: fd.get('status') || 'todo'
          })
        });
        close();
        onSuccess();
      });
    }
  });
}
