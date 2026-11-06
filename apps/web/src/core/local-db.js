/**
 * Local Browser Database Storage Engine
 * 100% Client-Side Persistence via window.localStorage
 * No backend server, Supabase, Render, or external database required.
 */

const STORAGE_KEYS = {
  CLIENTS: 'wb_db_clients',
  ENTRIES: 'wb_db_time_entries',
  TASKS: 'wb_db_tasks',
  USERS: 'wb_db_users',
  PROJECTS: 'wb_db_projects',
  AUDIT: 'wb_db_audit_logs',
  SCREENSHOTS: 'wb_db_screenshots',
  ACTIVE_TIMER: 'wb_db_active_timer',
  TIMESHEETS: 'wb_db_timesheet_status',
  CURRENT_USER: 'wb_db_current_user',
  INITIALIZED: 'wb_db_initialized_v2'
};

function getItem(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function setItem(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    // Trigger storage event for same-window listeners
    window.dispatchEvent(new CustomEvent('wb-local-storage-sync', { detail: { key, val } }));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export class LocalDatabase {
  constructor() {
    this.initSeedData();
  }

  initSeedData(force = false) {
    if (!force && localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // 1. Current User
    const defaultUser = {
      id: 'user-admin-1',
      full_name: 'Mayur Patel',
      name: 'Mayur Patel',
      email: 'mayur@webbarracks.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      tracking_permissions: {
        screenshot_interval_minutes: 5,
        allow_manual_time: true
      }
    };
    setItem(STORAGE_KEYS.CURRENT_USER, defaultUser);

    // 2. Team Members
    const defaultUsers = [
      defaultUser,
      {
        id: 'user-member-2',
        full_name: 'Suraj Sharma',
        name: 'Suraj Sharma',
        email: 'suraj@webbarracks.com',
        role: 'member',
        avatar: '',
        hourly_rate: 450,
        currency: 'INR'
      },
      {
        id: 'user-member-3',
        full_name: 'Alex Rivera',
        name: 'Alex Rivera',
        email: 'alex@webbarracks.com',
        role: 'manager',
        avatar: '',
        hourly_rate: 85,
        currency: 'USD'
      }
    ];
    setItem(STORAGE_KEYS.USERS, defaultUsers);

    // 3. Clients
    const defaultClients = [
      {
        id: 'client-1',
        name: 'Suraj',
        company: 'Suraj Enterprises',
        currency: 'INR',
        hourly_rate: 450.0,
        color: '#10b981',
        status: 'active',
        contact_email: 'suraj@client.com',
        terms: 'Net 15 terms for design & engineering deliverables',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: 'client-2',
        name: 'Web Barracks',
        company: 'Web Barracks Ltd',
        currency: 'USD',
        hourly_rate: 75.0,
        color: '#6366f1',
        status: 'active',
        contact_email: 'billing@webbarracks.com',
        terms: 'Internal product development & infrastructure',
        created_at: new Date(Date.now() - 86400000 * 10).toISOString()
      },
      {
        id: 'client-3',
        name: 'Acme Corporation',
        company: 'Acme Global Inc',
        currency: 'EUR',
        hourly_rate: 65.0,
        color: '#f59e0b',
        status: 'active',
        contact_email: 'accounts@acme.com',
        terms: 'Monthly retainer invoice billed on 1st of month',
        created_at: new Date(Date.now() - 86400000 * 15).toISOString()
      }
    ];
    setItem(STORAGE_KEYS.CLIENTS, defaultClients);

    // 4. Projects
    const defaultProjects = [
      { id: 'proj-1', name: 'Web Barracks Core Platform', client_id: 'client-2', status: 'active', budget_hours: 120 },
      { id: 'proj-2', name: 'Suraj Client Engineering', client_id: 'client-1', status: 'active', budget_hours: 80 },
      { id: 'proj-3', name: 'Acme Portal Integration', client_id: 'client-3', status: 'active', budget_hours: 60 }
    ];
    setItem(STORAGE_KEYS.PROJECTS, defaultProjects);

    // 5. Tasks
    const defaultTasks = [
      {
        id: 'task-1',
        key: 'WB-101',
        title: 'General Client Work',
        description: 'Ongoing design, consultation, and platform engineering.',
        project_id: 'proj-2',
        project_title: 'Suraj Client Engineering',
        client_id: 'client-1',
        client_name: 'Suraj',
        status: 'done',
        priority: 'high',
        assignee_name: 'Mayur Patel',
        logged_hours: 4.5,
        due_date: todayStr
      },
      {
        id: 'task-2',
        key: 'WB-102',
        title: 'Task Link & Rich Text Description',
        description: 'Provide task name, clickable task URL, and rich text note formatting.',
        project_id: 'proj-2',
        project_title: 'Suraj Client Engineering',
        client_id: 'client-1',
        client_name: 'Suraj',
        status: 'in_progress',
        priority: 'urgent',
        assignee_name: 'Mayur Patel',
        logged_hours: 2.0,
        due_date: todayStr
      },
      {
        id: 'task-3',
        key: 'WB-103',
        title: 'Local Browser Database Storage Engine',
        description: 'Standalone local persistence via browser localStorage with full CRUD.',
        project_id: 'proj-1',
        project_title: 'Web Barracks Core Platform',
        client_id: 'client-2',
        client_name: 'Web Barracks',
        status: 'in_progress',
        priority: 'high',
        assignee_name: 'Mayur Patel',
        logged_hours: 1.5,
        due_date: todayStr
      },
      {
        id: 'task-4',
        key: 'WB-104',
        title: 'Timesheets & Ledger Invoicing',
        description: 'Generate multi-currency summary reports and timesheet approvals.',
        project_id: 'proj-3',
        project_title: 'Acme Portal Integration',
        client_id: 'client-3',
        client_name: 'Acme Corporation',
        status: 'todo',
        priority: 'medium',
        assignee_name: 'Alex Rivera',
        logged_hours: 0,
        due_date: todayStr
      }
    ];
    setItem(STORAGE_KEYS.TASKS, defaultTasks);

    // 6. Time Entries (matching reference screenshot and initial entries)
    const defaultEntries = [
      {
        id: 'entry-seed-1',
        user_id: 'user-admin-1',
        user_name: 'Mayur Patel',
        client_id: 'client-1',
        client_name: 'Suraj',
        client_color: '#10b981',
        client_currency: 'INR',
        client_rate: 450,
        task_name: 'General Client Work',
        task_title: 'General Client Work',
        task_url: 'https://github.com/mayurptl1994/webbarracks-project-management-platform',
        description: '<p>Implemented custom client tariffs and click-to-edit time interval modal.</p>',
        date: todayStr,
        start_time: '07:55 pm',
        end_time: '07:55 pm',
        duration_seconds: 2,
        hours: 0.001,
        billable: true,
        billable_amount: 0.0,
        created_at: new Date().toISOString()
      },
      {
        id: 'entry-seed-2',
        user_id: 'user-admin-1',
        user_name: 'Mayur Patel',
        client_id: 'client-1',
        client_name: 'Suraj',
        client_color: '#10b981',
        client_currency: 'INR',
        client_rate: 450,
        task_name: 'Implement Client Tariff Billing System',
        task_title: 'Implement Client Tariff Billing System',
        task_url: 'https://github.com/mayurptl1994/webbarracks-project-management-platform/issues/1',
        description: '<p>Engineered multi-currency client rate configuration and active tracker selector.</p>',
        date: todayStr,
        start_time: '04:15 pm',
        end_time: '06:45 pm',
        duration_seconds: 9000,
        hours: 2.5,
        billable: true,
        billable_amount: 1125.0,
        created_at: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 'entry-seed-3',
        user_id: 'user-admin-1',
        user_name: 'Mayur Patel',
        client_id: 'client-2',
        client_name: 'Web Barracks',
        client_color: '#6366f1',
        client_currency: 'USD',
        client_rate: 75,
        task_name: 'Navigation & Dashboard Shell',
        task_title: 'Navigation & Dashboard Shell',
        task_url: '',
        description: '<p>Refactored sidebar, breadcrumbs, and metrics cards.</p>',
        date: yesterdayStr,
        start_time: '01:00 pm',
        end_time: '03:30 pm',
        duration_seconds: 9000,
        hours: 2.5,
        billable: true,
        billable_amount: 187.5,
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    setItem(STORAGE_KEYS.ENTRIES, defaultEntries);

    // 7. Audit Logs
    const defaultAudit = [
      {
        id: 'audit-1',
        action: 'CLIENT_CREATED',
        entity_type: 'Client',
        user_name: 'Mayur Patel',
        details: 'Configured client Suraj with tariff ₹450.00/hr (INR)',
        created_at: new Date().toISOString()
      },
      {
        id: 'audit-2',
        action: 'TIME_ENTRY_LOGGED',
        entity_type: 'TimeEntry',
        user_name: 'Mayur Patel',
        details: 'Logged General Client Work for Suraj',
        created_at: new Date().toISOString()
      }
    ];
    setItem(STORAGE_KEYS.AUDIT, defaultAudit);

    // 8. Screenshots
    setItem(STORAGE_KEYS.SCREENSHOTS, []);

    // 9. Active Timer
    setItem(STORAGE_KEYS.ACTIVE_TIMER, null);

    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // --- Audit Logger ---
  logAudit(action, entityType, details) {
    const user = this.getCurrentUser();
    const audits = getItem(STORAGE_KEYS.AUDIT, []);
    const newRecord = {
      id: generateId('audit'),
      action,
      entity_type: entityType,
      user_name: user?.name || user?.full_name || 'Mayur Patel',
      details,
      created_at: new Date().toISOString()
    };
    audits.unshift(newRecord);
    // Keep last 100
    if (audits.length > 100) audits.length = 100;
    setItem(STORAGE_KEYS.AUDIT, audits);
  }

  // --- Auth / User ---
  getCurrentUser() {
    return getItem(STORAGE_KEYS.CURRENT_USER, {
      id: 'user-admin-1',
      name: 'Mayur Patel',
      full_name: 'Mayur Patel',
      email: 'mayur@webbarracks.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    });
  }

  getUsers() {
    return getItem(STORAGE_KEYS.USERS, []);
  }

  createUser(data) {
    const users = this.getUsers();
    const newUser = {
      id: generateId('user'),
      full_name: data.full_name || data.name || 'New Member',
      name: data.name || data.full_name || 'New Member',
      email: data.email || 'user@example.com',
      role: data.role || 'member',
      hourly_rate: Number(data.hourly_rate) || 50,
      currency: data.currency || 'USD',
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    setItem(STORAGE_KEYS.USERS, users);
    this.logAudit('USER_CREATED', 'User', `Created user ${newUser.full_name}`);
    return newUser;
  }

  updateUser(id, data) {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      setItem(STORAGE_KEYS.USERS, users);
      return users[index];
    }
    return null;
  }

  deleteUser(id) {
    let users = this.getUsers();
    users = users.filter((u) => u.id !== id);
    setItem(STORAGE_KEYS.USERS, users);
    return { success: true };
  }

  // --- Clients ---
  getClients() {
    return getItem(STORAGE_KEYS.CLIENTS, []);
  }

  getClientById(id) {
    return this.getClients().find((c) => c.id === id) || null;
  }

  createClient(data) {
    const clients = this.getClients();
    const newClient = {
      id: generateId('client'),
      name: (data.name || 'New Client').trim(),
      company: (data.company || '').trim(),
      currency: (data.currency || 'USD').toUpperCase(),
      hourly_rate: Number(data.hourly_rate) || 0,
      color: data.color || '#10b981',
      status: data.status || 'active',
      contact_email: (data.contact_email || '').trim(),
      terms: (data.terms || '').trim(),
      created_at: new Date().toISOString()
    };
    clients.push(newClient);
    setItem(STORAGE_KEYS.CLIENTS, clients);
    this.logAudit('CLIENT_CREATED', 'Client', `Added client ${newClient.name} (${newClient.currency} ${newClient.hourly_rate}/hr)`);
    return newClient;
  }

  updateClient(id, data) {
    const clients = this.getClients();
    const index = clients.findIndex((c) => c.id === id);
    if (index !== -1) {
      clients[index] = {
        ...clients[index],
        ...data,
        hourly_rate: data.hourly_rate !== undefined ? Number(data.hourly_rate) : clients[index].hourly_rate,
        currency: data.currency ? data.currency.toUpperCase() : clients[index].currency
      };
      setItem(STORAGE_KEYS.CLIENTS, clients);
      this.logAudit('CLIENT_UPDATED', 'Client', `Updated client ${clients[index].name}`);
      return clients[index];
    }
    throw new Error('Client not found');
  }

  deleteClient(id) {
    let clients = this.getClients();
    const existing = clients.find((c) => c.id === id);
    clients = clients.filter((c) => c.id !== id);
    setItem(STORAGE_KEYS.CLIENTS, clients);
    if (existing) {
      this.logAudit('CLIENT_DELETED', 'Client', `Deleted client ${existing.name}`);
    }
    return { success: true };
  }

  // --- Time Entries ---
  getTimeEntries() {
    const entries = getItem(STORAGE_KEYS.ENTRIES, []);
    // Sort descending by date, then by start_time/created_at
    return entries.sort((a, b) => {
      const dateDiff = (b.date || '').localeCompare(a.date || '');
      if (dateDiff !== 0) return dateDiff;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }

  createTimeEntry(data) {
    const entries = getItem(STORAGE_KEYS.ENTRIES, []);
    const client = data.client_id ? this.getClientById(data.client_id) : null;
    const user = this.getCurrentUser();

    const durationSec = Number(data.duration_seconds) || (data.hours ? Math.round(Number(data.hours) * 3600) : 0);
    const hours = Math.round((durationSec / 3600) * 1000) / 1000;
    const rate = client ? client.hourly_rate : (Number(data.client_rate) || 0);
    const currency = client ? client.currency : (data.client_currency || 'USD');
    const billable = data.billable !== undefined ? Boolean(data.billable) : true;
    const billableAmount = billable ? Math.round((durationSec / 3600) * rate * 100) / 100 : 0;

    const newEntry = {
      id: generateId('entry'),
      user_id: user?.id || 'user-admin-1',
      user_name: user?.name || user?.full_name || 'Mayur Patel',
      client_id: client?.id || data.client_id || null,
      client_name: client?.name || data.client_name || '',
      client_color: client?.color || data.client_color || '#10b981',
      client_currency: currency,
      client_rate: rate,
      task_name: data.task_name || data.task_title || data.description || 'General Client Work',
      task_title: data.task_name || data.task_title || data.description || 'General Client Work',
      task_url: data.task_url || '',
      description: data.description || data.task_name || '',
      date: data.date || new Date().toISOString().slice(0, 10),
      start_time: data.start_time || '09:00 am',
      end_time: data.end_time || '09:00 am',
      duration_seconds: durationSec,
      hours: hours,
      billable: billable,
      billable_amount: billableAmount,
      created_at: new Date().toISOString()
    };

    entries.unshift(newEntry);
    setItem(STORAGE_KEYS.ENTRIES, entries);
    this.logAudit('TIME_ENTRY_CREATED', 'TimeEntry', `Logged ${newEntry.task_name} (${newEntry.start_time} - ${newEntry.end_time})`);
    return newEntry;
  }

  updateTimeEntry(id, data) {
    const entries = getItem(STORAGE_KEYS.ENTRIES, []);
    const index = entries.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error('Time entry not found');
    }

    const current = entries[index];
    const client = data.client_id !== undefined ? this.getClientById(data.client_id) : (current.client_id ? this.getClientById(current.client_id) : null);

    const durationSec = data.duration_seconds !== undefined
      ? Number(data.duration_seconds)
      : (data.hours !== undefined ? Math.round(Number(data.hours) * 3600) : current.duration_seconds);

    const hours = Math.round((durationSec / 3600) * 1000) / 1000;
    const rate = client ? client.hourly_rate : (data.client_rate !== undefined ? Number(data.client_rate) : current.client_rate);
    const currency = client ? client.currency : (data.client_currency || current.client_currency || 'USD');
    const billable = data.billable !== undefined ? Boolean(data.billable) : current.billable;
    const billableAmount = billable ? Math.round((durationSec / 3600) * (rate || 0) * 100) / 100 : 0;

    const taskName = data.task_name !== undefined ? data.task_name : (data.task_title !== undefined ? data.task_title : current.task_name);

    entries[index] = {
      ...current,
      ...data,
      task_name: taskName,
      task_title: taskName,
      task_url: data.task_url !== undefined ? data.task_url : current.task_url,
      description: data.description !== undefined ? data.description : current.description,
      date: data.date || current.date,
      start_time: data.start_time || current.start_time,
      end_time: data.end_time || current.end_time,
      duration_seconds: durationSec,
      hours: hours,
      client_id: client ? client.id : (data.client_id !== undefined ? data.client_id : current.client_id),
      client_name: client ? client.name : (data.client_name !== undefined ? data.client_name : current.client_name),
      client_color: client ? client.color : (data.client_color !== undefined ? data.client_color : current.client_color),
      client_currency: currency,
      client_rate: rate,
      billable: billable,
      billable_amount: billableAmount,
      updated_at: new Date().toISOString()
    };

    setItem(STORAGE_KEYS.ENTRIES, entries);
    this.logAudit('TIME_ENTRY_UPDATED', 'TimeEntry', `Updated ${entries[index].task_name} (date: ${entries[index].date}, ${entries[index].start_time} - ${entries[index].end_time})`);
    return entries[index];
  }

  deleteTimeEntry(id) {
    let entries = getItem(STORAGE_KEYS.ENTRIES, []);
    const existing = entries.find((e) => e.id === id);
    entries = entries.filter((e) => e.id !== id);
    setItem(STORAGE_KEYS.ENTRIES, entries);
    if (existing) {
      this.logAudit('TIME_ENTRY_DELETED', 'TimeEntry', `Deleted time entry ${existing.task_name}`);
    }
    return { success: true };
  }

  // --- Active Timer Console ---
  getActiveTimer() {
    return getItem(STORAGE_KEYS.ACTIVE_TIMER, null);
  }

  startTimer(data = {}) {
    const client = data.client_id ? this.getClientById(data.client_id) : null;
    const user = this.getCurrentUser();

    const activeSession = {
      id: generateId('session'),
      user_id: user?.id || 'user-admin-1',
      task_name: data.task_name || data.task_title || data.description || 'General Client Work',
      task_title: data.task_name || data.task_title || data.description || 'General Client Work',
      task_url: data.task_url || '',
      description: data.description || data.task_name || '',
      client_id: client?.id || data.client_id || null,
      client_name: client?.name || data.client_name || '',
      client_currency: client?.currency || 'USD',
      client_rate: client?.hourly_rate || 0,
      client_color: client?.color || '#10b981',
      billable: data.billable !== undefined ? Boolean(data.billable) : true,
      start_time_iso: new Date().toISOString(),
      start_time_formatted: this.formatTime12H(new Date())
    };

    setItem(STORAGE_KEYS.ACTIVE_TIMER, activeSession);
    this.logAudit('TIMER_STARTED', 'Tracking', `Started timer for ${activeSession.task_name}`);
    return { session: activeSession };
  }

  stopTimer() {
    const active = this.getActiveTimer();
    if (!active) {
      return { entry: null, message: 'No active session' };
    }

    const startIso = active.start_time_iso ? new Date(active.start_time_iso) : new Date(Date.now() - 2000);
    const endIso = new Date();
    const durationSeconds = Math.max(1, Math.round((endIso.getTime() - startIso.getTime()) / 1000));

    const startTimeFormatted = active.start_time_formatted || this.formatTime12H(startIso);
    const endTimeFormatted = this.formatTime12H(endIso);
    const dateFormatted = endIso.toISOString().slice(0, 10);

    const newEntry = this.createTimeEntry({
      task_name: active.task_name,
      task_title: active.task_title,
      task_url: active.task_url,
      description: active.description,
      client_id: active.client_id,
      client_name: active.client_name,
      client_currency: active.client_currency,
      client_rate: active.client_rate,
      billable: active.billable,
      date: dateFormatted,
      start_time: startTimeFormatted,
      end_time: endTimeFormatted,
      duration_seconds: durationSeconds
    });

    setItem(STORAGE_KEYS.ACTIVE_TIMER, null);
    this.logAudit('TIMER_STOPPED', 'Tracking', `Stopped timer: logged ${durationSeconds}s on ${newEntry.task_name}`);
    return { entry: newEntry };
  }

  formatTime12H(date) {
    let h = date.getHours();
    const m = date.getMinutes();
    const period = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }

  // --- Live Telemetry ---
  getLiveTelemetry() {
    const active = this.getActiveTimer();
    const user = this.getCurrentUser();
    if (!active) return [];

    const elapsed = Math.round((Date.now() - new Date(active.start_time_iso).getTime()) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');

    return [
      {
        user_id: user.id,
        user_name: user.name || user.full_name,
        user_email: user.email,
        user_avatar: user.avatar,
        project_name: active.client_name || 'Client Project',
        task_name: active.task_name,
        monitoring_enabled: true,
        elapsed_seconds: elapsed,
        elapsed_str: `${h}:${m}:${s}`
      }
    ];
  }

  // --- Tasks & Kanban Board ---
  getTasks() {
    return getItem(STORAGE_KEYS.TASKS, []);
  }

  createTask(data) {
    const tasks = this.getTasks();
    const client = data.client_id ? this.getClientById(data.client_id) : null;
    const newTask = {
      id: generateId('task'),
      key: `WB-${Math.floor(100 + Math.random() * 900)}`,
      title: data.title || 'New Task',
      description: data.description || '',
      project_id: data.project_id || '',
      project_title: data.project_title || client?.name || 'Workspace Project',
      client_id: client?.id || data.client_id || '',
      client_name: client?.name || data.client_name || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assignee_name: data.assignee_name || this.getCurrentUser().name,
      logged_hours: Number(data.logged_hours) || 0,
      due_date: data.due_date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString()
    };
    tasks.push(newTask);
    setItem(STORAGE_KEYS.TASKS, tasks);
    this.logAudit('TASK_CREATED', 'Task', `Created task ${newTask.title}`);
    return newTask;
  }

  updateTask(id, data) {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...data };
      setItem(STORAGE_KEYS.TASKS, tasks);
      return tasks[index];
    }
    throw new Error('Task not found');
  }

  updateTaskStatus(id, status) {
    return this.updateTask(id, { status });
  }

  deleteTask(id) {
    let tasks = this.getTasks();
    tasks = tasks.filter((t) => t.id !== id);
    setItem(STORAGE_KEYS.TASKS, tasks);
    return { success: true };
  }

  // --- Projects ---
  getProjects() {
    return getItem(STORAGE_KEYS.PROJECTS, []);
  }

  createProject(data) {
    const projects = this.getProjects();
    const newProj = {
      id: generateId('proj'),
      name: data.name || 'New Project',
      client_id: data.client_id || '',
      status: data.status || 'active',
      budget_hours: Number(data.budget_hours) || 100,
      created_at: new Date().toISOString()
    };
    projects.push(newProj);
    setItem(STORAGE_KEYS.PROJECTS, projects);
    return newProj;
  }

  // --- Dashboard Stats & Summary ---
  getDashboardStats() {
    const clients = this.getClients();
    const tasks = this.getTasks();
    const entries = this.getTimeEntries();
    const audits = getItem(STORAGE_KEYS.AUDIT, []);

    const totalSeconds = entries.reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);
    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
    const activeClientsCount = clients.filter((c) => c.status === 'active').length;
    const openTasksCount = tasks.filter((t) => t.status !== 'done').length;

    return {
      activeClients: activeClientsCount,
      openTasks: openTasksCount,
      totalTrackedHours: totalHours,
      totalAuditRecords: audits.length
    };
  }

  getDashboardSummary() {
    const entries = this.getTimeEntries();
    const tasks = this.getTasks();
    const clients = this.getClients();

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayEntries = entries.filter((e) => e.date === todayStr);
    const todaySeconds = todayEntries.reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);

    const totalBillable = entries.reduce((acc, e) => acc + (Number(e.billable_amount) || 0), 0);

    return {
      todayTrackedHours: Math.round((todaySeconds / 3600) * 10) / 10,
      totalTrackedHours: Math.round((entries.reduce((a, b) => a + (b.duration_seconds || 0), 0) / 3600) * 10) / 10,
      totalBillableValue: totalBillable,
      activeProjectsCount: clients.length,
      tasksCompletedCount: tasks.filter((t) => t.status === 'done').length,
      recentEntries: entries.slice(0, 5)
    };
  }

  // --- Reports Summary & CSV Export ---
  getReportsSummary() {
    const entries = this.getTimeEntries();
    const clients = this.getClients();

    const totalSeconds = entries.reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);
    const billableSeconds = entries.filter((e) => e.billable).reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);

    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
    const billableHours = Math.round((billableSeconds / 3600) * 10) / 10;
    const efficiency = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 100;
    const totalBillableAmount = entries.reduce((acc, e) => acc + (Number(e.billable_amount) || 0), 0);

    // Group by Client
    const clientBreakdown = clients.map((cl) => {
      const clientEntries = entries.filter((e) => e.client_id === cl.id || e.client_name === cl.name);
      const clSec = clientEntries.reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);
      const clBillableSec = clientEntries.filter((e) => e.billable).reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);
      const clAmount = clientEntries.reduce((acc, e) => acc + (Number(e.billable_amount) || 0), 0);

      return {
        id: cl.id,
        name: cl.name,
        currency: cl.currency,
        hourlyRate: cl.hourly_rate,
        hours: Math.round((clSec / 3600) * 10) / 10,
        billable: Math.round((clBillableSec / 3600) * 10) / 10,
        amount: Math.round(clAmount * 100) / 100
      };
    });

    return {
      totalTrackedHours: totalHours,
      billableHours: billableHours,
      billableEfficiency: efficiency,
      totalBillableAmount: Math.round(totalBillableAmount * 100) / 100,
      clientBreakdown
    };
  }

  exportCsv() {
    const entries = this.getTimeEntries();
    const headers = ['Date', 'User', 'Client', 'Currency', 'Hourly Rate', 'Task Name', 'Task URL', 'Description', 'Start Time', 'End Time', 'Duration (h:m:s)', 'Hours', 'Billable', 'Billable Amount'];
    const rows = entries.map((e) => {
      const sec = Number(e.duration_seconds) || 0;
      const h = String(Math.floor(sec / 3600)).padStart(2, '0');
      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      const cleanDesc = (e.description || '').replace(/<[^>]*>/g, '').replace(/"/g, '""');
      const cleanTask = (e.task_name || '').replace(/"/g, '""');

      return [
        `"${e.date || ''}"`,
        `"${e.user_name || ''}"`,
        `"${e.client_name || ''}"`,
        `"${e.client_currency || 'USD'}"`,
        `"${e.client_rate || 0}"`,
        `"${cleanTask}"`,
        `"${e.task_url || ''}"`,
        `"${cleanDesc}"`,
        `"${e.start_time || ''}"`,
        `"${e.end_time || ''}"`,
        `"${h}:${m}:${s}"`,
        `"${e.hours || 0}"`,
        `"${e.billable ? 'Yes' : 'No'}"`,
        `"${(e.billable_amount || 0).toFixed(2)}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // --- Timesheets Grid ---
  getTimesheetsGrid(periodStart) {
    const entries = this.getTimeEntries();
    const tasks = this.getTasks();
    const clients = this.getClients();
    const statusMap = getItem(STORAGE_KEYS.TIMESHEETS, {});
    const periodKey = periodStart || new Date().toISOString().slice(0, 10);

    const rows = tasks.map((task) => {
      const client = clients.find((c) => c.id === task.client_id) || { name: task.client_name || 'General' };
      const taskEntries = entries.filter((e) => e.task_name === task.title || e.task_title === task.title);
      const totalSec = taskEntries.reduce((acc, e) => acc + (Number(e.duration_seconds) || 0), 0);
      const totalH = Math.round((totalSec / 3600) * 10) / 10;

      // 7-day distribution
      const days = [0, 0, 0, 0, 0, 0, 0];
      if (totalH > 0) {
        days[0] = Math.round((totalH * 0.4) * 10) / 10;
        days[1] = Math.round((totalH * 0.6) * 10) / 10;
      }

      return {
        task: { id: task.id, key: task.key, title: task.title },
        project: { name: client.name },
        days,
        total: totalH
      };
    });

    return {
      status: statusMap[periodKey] || 'draft',
      periodStart: periodKey,
      rows: rows.filter((r) => r.total > 0 || r.task.id === 'task-1' || r.task.id === 'task-2')
    };
  }

  submitTimesheet(periodStart) {
    const statusMap = getItem(STORAGE_KEYS.TIMESHEETS, {});
    const periodKey = periodStart || new Date().toISOString().slice(0, 10);
    statusMap[periodKey] = 'submitted';
    setItem(STORAGE_KEYS.TIMESHEETS, statusMap);
    this.logAudit('TIMESHEET_SUBMITTED', 'Timesheet', `Submitted timesheet for period ${periodKey}`);
    return { success: true, status: 'submitted' };
  }

  approveTimesheet(periodStart) {
    const statusMap = getItem(STORAGE_KEYS.TIMESHEETS, {});
    const periodKey = periodStart || new Date().toISOString().slice(0, 10);
    statusMap[periodKey] = 'approved';
    setItem(STORAGE_KEYS.TIMESHEETS, statusMap);
    this.logAudit('TIMESHEET_APPROVED', 'Timesheet', `Approved timesheet for period ${periodKey}`);
    return { success: true, status: 'approved' };
  }

  // --- Audit Logs ---
  getAuditLogs() {
    return getItem(STORAGE_KEYS.AUDIT, []);
  }

  // --- Screenshots ---
  getScreenshots() {
    return getItem(STORAGE_KEYS.SCREENSHOTS, []);
  }

  deleteScreenshot(id) {
    let shots = this.getScreenshots();
    shots = shots.filter((s) => s.id !== id);
    setItem(STORAGE_KEYS.SCREENSHOTS, shots);
    return { success: true };
  }
}

export const localDb = new LocalDatabase();
