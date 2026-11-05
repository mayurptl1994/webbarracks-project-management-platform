import { randomUUID } from 'crypto';

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member' | 'client';
  is_active: boolean;
  avatar_url?: string | null;
  hourly_bill_rate: number;
  hourly_cost_rate: number;
  assigned_project_ids: string[];
  tracking_permissions: {
    can_track: boolean;
    screenshots_enabled: boolean;
    screenshot_interval_minutes: number;
    allow_user_delete: boolean;
  };
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientItem {
  id: string;
  name: string;
  company?: string;
  email: string;
  currency: string; // e.g. 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'
  hourly_rate: number; // defined price per hour
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  key: string;
  description: string;
  client_name: string;
  color: string;
  status: 'active' | 'on_track' | 'at_risk' | 'completed' | 'on_hold';
  budget_type: 'hours' | 'fixed_amount';
  budget_value: number; // e.g. 250 hours or $15,000
  budget_spent: number;
  health: 'on_track' | 'at_risk' | 'off_track';
  created_at: string;
  updated_at: string;
}

export interface TaskItem {
  id: string;
  project_id: string;
  client_id?: string;
  client_name?: string;
  key: string; // e.g. "CLOUD-1"
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string | null;
  assignee_name?: string | null;
  reporter_id: string;
  estimate_hours: number;
  billable: boolean;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveTimeSession {
  id: string;
  user_id: string;
  user_name: string;
  project_id: string;
  project_name: string;
  project_key: string;
  client_id?: string;
  client_name?: string;
  client_currency?: string;
  task_id: string;
  task_key: string;
  task_name?: string;
  task_title: string;
  task_url?: string;
  description?: string;
  started_at: string;
  paused_at?: string | null;
  ended_at?: string | null;
  duration_seconds: number;
  status: 'active' | 'paused' | 'completed';
  billable: boolean;
  hourly_rate_snapshot: number;
  cost_rate_snapshot: number;
  created_at: string;
}

export interface ScreenshotFrame {
  id: string;
  session_id: string;
  user_id: string;
  user_name: string;
  project_id: string;
  project_name: string;
  task_key: string;
  task_title: string;
  taken_at: string;
  storage_path: string;
  activity_percent: number;
  app_name?: string | null;
  window_title?: string | null;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actor: string;
  ip_address: string;
  time: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface TimesheetItem {
  id: string;
  user_id: string;
  user_name: string;
  week_start: string; // Monday YYYY-MM-DD
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_hours: number;
  billable_hours: number;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
}

// Initial Seed Data for Project Management Platform
const initialUsers: UserAccount[] = [
  {
    id: 'user-admin-1',
    email: 'webbarracks@gmail.com',
    passwordHash: 'admin123',
    full_name: 'WebBarracs Super Admin',
    role: 'admin',
    is_active: true,
    avatar_url: null,
    hourly_bill_rate: 150,
    hourly_cost_rate: 85,
    assigned_project_ids: ['proj-1', 'proj-2', 'proj-3'],
    tracking_permissions: {
      can_track: true,
      screenshots_enabled: true,
      screenshot_interval_minutes: 5,
      allow_user_delete: true
    },
    last_login_at: new Date(Date.now() - 15 * 60000).toISOString(),
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'user-regular-1',
    email: 'elena.dev@webbarracks.dev',
    passwordHash: 'user123',
    full_name: 'Elena Rostova',
    role: 'member',
    is_active: true,
    avatar_url: null,
    hourly_bill_rate: 110,
    hourly_cost_rate: 60,
    assigned_project_ids: ['proj-1', 'proj-2'],
    tracking_permissions: {
      can_track: true,
      screenshots_enabled: true,
      screenshot_interval_minutes: 5,
      allow_user_delete: true
    },
    last_login_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    created_at: '2025-01-10T00:00:00.000Z',
    updated_at: '2025-01-10T00:00:00.000Z'
  },
  {
    id: 'user-regular-2',
    email: 'david.manager@webbarracks.dev',
    passwordHash: 'user123',
    full_name: 'David Miller',
    role: 'manager',
    is_active: true,
    avatar_url: null,
    hourly_bill_rate: 125,
    hourly_cost_rate: 75,
    assigned_project_ids: ['proj-1', 'proj-2', 'proj-3'],
    tracking_permissions: {
      can_track: true,
      screenshots_enabled: true,
      screenshot_interval_minutes: 10,
      allow_user_delete: true
    },
    last_login_at: new Date(Date.now() - 7200 * 1000).toISOString(),
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2025-01-15T00:00:00.000Z'
  }
];

const initialProjects: ProjectItem[] = [
  {
    id: 'proj-1',
    name: 'Platform Cloud Migration',
    key: 'CLOUD',
    description: 'Migrating legacy monolithic architecture into Kubernetes microservices and VPC subnets.',
    client_name: 'Stripe Global Enterprise',
    color: '#2563eb',
    status: 'active',
    budget_type: 'hours',
    budget_value: 250,
    budget_spent: 172.5,
    health: 'on_track',
    created_at: '2025-01-05T00:00:00.000Z',
    updated_at: '2025-01-05T00:00:00.000Z'
  },
  {
    id: 'proj-2',
    name: 'NextGen Client Portal',
    key: 'PORTAL',
    description: 'High-performance real-time client analytics dashboard with dark theme and token variables.',
    client_name: 'Acme Digital Labs',
    color: '#059669',
    status: 'active',
    budget_type: 'fixed_amount',
    budget_value: 18000,
    budget_spent: 14200,
    health: 'at_risk',
    created_at: '2025-01-10T00:00:00.000Z',
    updated_at: '2025-01-10T00:00:00.000Z'
  },
  {
    id: 'proj-3',
    name: 'Mobile iOS / Android Agent',
    key: 'MOBILE',
    description: 'Native Electron & mobile device monitoring sidecar with offline sync queue.',
    client_name: 'Apex Mobility Group',
    color: '#7c3aed',
    status: 'active',
    budget_type: 'hours',
    budget_value: 120,
    budget_spent: 42.0,
    health: 'on_track',
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2025-01-15T00:00:00.000Z'
  }
];

const initialClients: ClientItem[] = [
  {
    id: 'client-1',
    name: 'Stripe Global Enterprise',
    company: 'Stripe, Inc.',
    email: 'billing@stripe.com',
    currency: 'USD',
    hourly_rate: 120.0,
    status: 'active',
    notes: 'Enterprise account. Monthly invoicing with Net-30 payment terms.',
    created_at: '2025-01-05T00:00:00.000Z',
    updated_at: '2025-01-05T00:00:00.000Z'
  },
  {
    id: 'client-2',
    name: 'Acme Digital Labs',
    company: 'Acme Corporation',
    email: 'accounts@acmedigital.io',
    currency: 'EUR',
    hourly_rate: 95.0,
    status: 'active',
    notes: 'European regional contract. Bi-weekly milestone billings in EUR.',
    created_at: '2025-01-10T00:00:00.000Z',
    updated_at: '2025-01-10T00:00:00.000Z'
  },
  {
    id: 'client-3',
    name: 'Apex Mobility Group',
    company: 'Apex Mobility Ltd',
    email: 'finance@apexmobility.co.uk',
    currency: 'GBP',
    hourly_rate: 85.0,
    status: 'active',
    notes: 'UK mobile development partner. Invoiced in GBP with VAT.',
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2025-01-15T00:00:00.000Z'
  }
];

const initialTasks: TaskItem[] = [
  {
    id: 'task-1',
    project_id: 'proj-1',
    client_id: 'client-1',
    client_name: 'Stripe Global Enterprise',
    key: 'CLOUD-1',
    title: 'Setup Terraform infrastructure modules for VPC and Kubernetes',
    description: 'Reusable Terraform modules for multi-AZ clusters with auto-scaling policies.',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'user-regular-1',
    assignee_name: 'Elena Rostova',
    reporter_id: 'user-admin-1',
    estimate_hours: 24,
    billable: true,
    due_date: '2025-02-18',
    created_at: '2025-01-12T00:00:00.000Z',
    updated_at: '2025-01-12T00:00:00.000Z'
  },
  {
    id: 'task-2',
    project_id: 'proj-1',
    client_id: 'client-1',
    client_name: 'Stripe Global Enterprise',
    key: 'CLOUD-2',
    title: 'Configure PostgreSQL replication and read-replicas failover',
    description: 'Set up high-availability database cluster with automated WAL archiving.',
    status: 'todo',
    priority: 'high',
    assignee_id: 'user-admin-1',
    assignee_name: 'WebBarracs Super Admin',
    reporter_id: 'user-regular-2',
    estimate_hours: 16,
    billable: true,
    due_date: '2025-02-22',
    created_at: '2025-01-14T00:00:00.000Z',
    updated_at: '2025-01-14T00:00:00.000Z'
  },
  {
    id: 'task-3',
    project_id: 'proj-2',
    client_id: 'client-2',
    client_name: 'Acme Digital Labs',
    key: 'PORTAL-1',
    title: 'High-fidelity UX mockups for client billing dashboard',
    description: 'Design responsive layout with Space Grotesk typography and CSS tokens.',
    status: 'in_review',
    priority: 'medium',
    assignee_id: 'user-regular-1',
    assignee_name: 'Elena Rostova',
    reporter_id: 'user-admin-1',
    estimate_hours: 12,
    billable: true,
    due_date: '2025-02-20',
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2025-01-15T00:00:00.000Z'
  },
  {
    id: 'task-4',
    project_id: 'proj-2',
    client_id: 'client-2',
    client_name: 'Acme Digital Labs',
    key: 'PORTAL-2',
    title: 'Client invoice PDF & CSV export engine',
    description: 'Group approved billable hours into printable invoice statements.',
    status: 'backlog',
    priority: 'low',
    assignee_id: null,
    assignee_name: 'Unassigned',
    reporter_id: 'user-regular-2',
    estimate_hours: 18,
    billable: true,
    due_date: '2025-02-28',
    created_at: '2025-01-16T00:00:00.000Z',
    updated_at: '2025-01-16T00:00:00.000Z'
  },
  {
    id: 'task-5',
    project_id: 'proj-3',
    client_id: 'client-3',
    client_name: 'Apex Mobility Group',
    key: 'MOBILE-1',
    title: 'Electron tray background process and powerMonitor idle detection',
    description: 'Implement tray icon with Quick Pause / Resume and 5-min screenshot deletion grace window.',
    status: 'todo',
    priority: 'high',
    assignee_id: 'user-admin-1',
    assignee_name: 'WebBarracs Super Admin',
    reporter_id: 'user-admin-1',
    estimate_hours: 20,
    billable: true,
    due_date: '2025-02-25',
    created_at: '2025-01-18T00:00:00.000Z',
    updated_at: '2025-01-18T00:00:00.000Z'
  }
];

const initialAuditLogs: AuditLogItem[] = [
  {
    id: 'audit-1',
    action: 'TASK.STATUS_CHANGE',
    actor: 'webbarracks@gmail.com',
    ip_address: '10.25.162.12',
    time: '15:45 5 Nov',
    details: { taskKey: 'CLOUD-1', status: 'in_progress' },
    created_at: new Date(Date.now() - 10 * 60000).toISOString()
  },
  {
    id: 'audit-2',
    action: 'TIMER.SESSION_START',
    actor: 'elena.dev@webbarracks.dev',
    ip_address: '10.31.96.88',
    time: '14:20 5 Nov',
    details: { taskKey: 'PORTAL-1' },
    created_at: new Date(Date.now() - 45 * 60000).toISOString()
  },
  {
    id: 'audit-3',
    action: 'PROJECT.BUDGET_ALERT',
    actor: 'system.audit',
    ip_address: '10.27.210.178',
    time: '12:10 5 Nov',
    details: { projectKey: 'PORTAL', burnPercent: 78.8 },
    created_at: new Date(Date.now() - 120 * 60000).toISOString()
  },
  {
    id: 'audit-4',
    action: 'TIMESHEET.APPROVED',
    actor: 'webbarracks@gmail.com',
    ip_address: '103.240.78.142',
    time: '11:05 5 Nov',
    details: { weekStart: '2025-11-03', member: 'Elena Rostova' },
    created_at: new Date(Date.now() - 240 * 60000).toISOString()
  }
];

export class ProjectManagementStore {
  users: UserAccount[] = [...initialUsers];
  clients: ClientItem[] = [...initialClients];
  projects: ProjectItem[] = [...initialProjects];
  tasks: TaskItem[] = [...initialTasks];
  activeSessions: ActiveTimeSession[] = [];
  screenshots: ScreenshotFrame[] = [];
  auditLogs: AuditLogItem[] = [...initialAuditLogs];

  getUserById(id: string) {
    return this.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  // Clients & Hourly Rate Management
  getClients() {
    return this.clients;
  }

  getClientById(id: string) {
    return this.clients.find((c) => c.id === id);
  }

  createClient(data: Partial<ClientItem>) {
    const rawRate = typeof data.hourly_rate === 'number' ? data.hourly_rate : parseFloat(String(data.hourly_rate || '0')) || 0;
    const client: ClientItem = {
      id: 'client-' + (this.clients.length + 1) + '-' + Date.now().toString(36),
      name: data.name || 'New Client',
      company: data.company || '',
      email: data.email || '',
      currency: (data.currency || 'USD').toUpperCase(),
      hourly_rate: Math.max(0, rawRate),
      status: data.status === 'inactive' ? 'inactive' : 'active',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.clients.push(client);
    this.addAuditLog('CLIENT.CREATE', 'webbarracks@gmail.com', `Created client "${client.name}" (${client.currency} ${client.hourly_rate}/hr)`);
    return client;
  }

  updateClient(id: string, data: Partial<ClientItem>) {
    const client = this.getClientById(id);
    if (!client) return null;
    if (data.name !== undefined && data.name.trim()) client.name = data.name.trim();
    if (data.company !== undefined) client.company = data.company;
    if (data.email !== undefined) client.email = data.email;
    if (data.currency !== undefined && data.currency.trim()) client.currency = data.currency.trim().toUpperCase();
    if (data.hourly_rate !== undefined) {
      const rate = typeof data.hourly_rate === 'number' ? data.hourly_rate : parseFloat(String(data.hourly_rate || '0')) || 0;
      client.hourly_rate = Math.max(0, rate);
    }
    if (data.status !== undefined) client.status = data.status === 'inactive' ? 'inactive' : 'active';
    if (data.notes !== undefined) client.notes = data.notes;
    client.updated_at = new Date().toISOString();
    this.addAuditLog('CLIENT.UPDATE', 'webbarracks@gmail.com', `Updated client "${client.name}" (${client.currency} ${client.hourly_rate}/hr)`);
    return client;
  }

  deleteClient(id: string) {
    const idx = this.clients.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    const [removed] = this.clients.splice(idx, 1);
    this.addAuditLog('CLIENT.DELETE', 'webbarracks@gmail.com', `Deleted client "${removed.name}"`);
    return true;
  }

  // Projects
  getProjects() {
    return this.projects;
  }

  getProjectById(id: string) {
    return this.projects.find((p) => p.id === id);
  }

  createProject(data: Partial<ProjectItem>) {
    const proj: ProjectItem = {
      id: 'proj-' + (this.projects.length + 1),
      name: data.name || 'New Project',
      key: (data.key || 'PRJ').toUpperCase(),
      description: data.description || '',
      client_name: data.client_name || 'Internal Workspace',
      color: data.color || '#2563eb',
      status: 'active',
      budget_type: data.budget_type || 'hours',
      budget_value: data.budget_value || 100,
      budget_spent: 0,
      health: 'on_track',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.projects.push(proj);
    this.addAuditLog('PROJECT.CREATE', 'webbarracks@gmail.com', `Created project ${proj.name} (${proj.key})`);
    return proj;
  }

  // Tasks
  getTasks(projectId?: string) {
    if (projectId) return this.tasks.filter((t) => t.project_id === projectId);
    return this.tasks;
  }

  getTaskById(id: string) {
    return this.tasks.find((t) => t.id === id);
  }

  createTask(data: Partial<TaskItem>) {
    const proj = this.getProjectById(data.project_id || '') || this.projects[0];
    const client = data.client_id ? this.getClientById(data.client_id) : (this.clients[0] || null);
    const taskNumber = this.tasks.filter((t) => t.project_id === proj.id).length + 1;
    const task: TaskItem = {
      id: 'task-' + (this.tasks.length + 1),
      project_id: proj.id,
      client_id: client ? client.id : undefined,
      client_name: client ? client.name : undefined,
      key: `${proj.key}-${taskNumber}`,
      title: data.title || 'Untitled Task',
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      assignee_id: data.assignee_id || null,
      assignee_name: data.assignee_name || 'Unassigned',
      reporter_id: data.reporter_id || 'user-admin-1',
      estimate_hours: data.estimate_hours || 8,
      billable: data.billable !== false,
      due_date: data.due_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.tasks.push(task);
    this.addAuditLog('TASK.CREATE', 'webbarracks@gmail.com', `Created task ${task.key} - ${task.title}`);
    return task;
  }

  updateTaskStatus(taskId: string, status: TaskItem['status']) {
    const task = this.getTaskById(taskId);
    if (!task) return null;
    task.status = status;
    task.updated_at = new Date().toISOString();
    this.addAuditLog('TASK.STATUS_CHANGE', 'webbarracks@gmail.com', `Updated ${task.key} status to ${status}`);
    return task;
  }

  // Tracking Sessions on Tasks
  getActiveSession(userId: string) {
    return this.activeSessions.find(
      (s) => s.user_id === userId && (s.status === 'active' || s.status === 'paused')
    );
  }

  startTaskTimer(
    userId: string,
    params: string | { taskId?: string; description?: string; taskName?: string; taskUrl?: string; clientId?: string; billable?: boolean }
  ) {
    const isString = typeof params === 'string';
    const taskId = isString ? params : params.taskId;
    const task = taskId ? this.getTaskById(taskId) : null;

    const clientId = (!isString && params.clientId) ? params.clientId : (task?.client_id || this.clients[0]?.id);
    const client = clientId ? this.getClientById(clientId) : (this.clients[0] || null);

    const proj = task ? this.getProjectById(task.project_id) : this.projects[0];
    const user = this.getUserById(userId);

    // Stop active if running
    const existing = this.getActiveSession(userId);
    if (existing) {
      this.stopTaskTimer(userId);
    }

    const taskName = (!isString && params.taskName && params.taskName.trim())
      ? params.taskName.trim()
      : (task?.title || (!isString && params.description && params.description.trim()) || 'General Client Work');

    const taskUrl = (!isString && params.taskUrl) ? params.taskUrl.trim() : '';

    const description = (!isString && params.description && params.description.trim())
      ? params.description.trim()
      : `<p>${taskName}</p>`;

    const billable = (!isString && typeof params.billable === 'boolean')
      ? params.billable
      : (task?.billable !== false);

    const taskKey = task ? task.key : (client ? client.name.slice(0, 4).toUpperCase() + '-1' : 'TRK-1');

    const session: ActiveTimeSession = {
      id: randomUUID(),
      user_id: userId,
      user_name: user?.full_name || 'Member',
      project_id: task?.project_id || proj?.id || 'proj-1',
      project_name: proj?.name || 'Client Engagement',
      project_key: proj?.key || 'PRJ',
      client_id: client ? client.id : undefined,
      client_name: client ? client.name : undefined,
      client_currency: client ? client.currency : 'USD',
      task_id: task?.id || 'custom-task',
      task_key: taskKey,
      task_name: taskName,
      task_title: taskName,
      task_url: taskUrl,
      description: description,
      started_at: new Date().toISOString(),
      duration_seconds: 0,
      status: 'active',
      billable,
      hourly_rate_snapshot: client?.hourly_rate || user?.hourly_bill_rate || 110,
      cost_rate_snapshot: user?.hourly_cost_rate || 65,
      created_at: new Date().toISOString()
    };

    this.activeSessions.push(session);
    this.addAuditLog('TIMER.START', user?.email || 'user', `Started timer on ${session.task_title}`);
    return session;
  }

  pauseTaskTimer(userId: string) {
    const session = this.getActiveSession(userId);
    if (!session || session.status !== 'active') return null;

    const now = Date.now();
    const elapsed = Math.floor((now - new Date(session.started_at).getTime()) / 1000);
    session.duration_seconds += elapsed;
    session.status = 'paused';
    session.paused_at = new Date().toISOString();
    return session;
  }

  resumeTaskTimer(userId: string) {
    const session = this.getActiveSession(userId);
    if (!session || session.status !== 'paused') return null;

    session.status = 'active';
    session.started_at = new Date().toISOString();
    session.paused_at = null;
    return session;
  }

  stopTaskTimer(userId: string) {
    const session = this.getActiveSession(userId);
    if (!session) return null;

    if (session.status === 'active') {
      const now = Date.now();
      const elapsed = Math.floor((now - new Date(session.started_at).getTime()) / 1000);
      session.duration_seconds += elapsed;
    }

    session.ended_at = new Date().toISOString();
    session.status = 'completed';

    // Update project budget spent
    const proj = this.getProjectById(session.project_id);
    if (proj) {
      const hours = session.duration_seconds / 3600.0;
      proj.budget_spent = Math.round((proj.budget_spent + hours) * 10) / 10;
      if (proj.budget_type === 'hours' && proj.budget_spent > proj.budget_value) {
        proj.health = 'off_track';
      }
    }

    this.addAuditLog('TIMER.STOP', session.user_name, `Logged ${session.duration_seconds}s on ${session.task_key}`);
    return session;
  }

  addScreenshot(data: Omit<ScreenshotFrame, 'id' | 'created_at'>) {
    const record: ScreenshotFrame = {
      ...data,
      id: randomUUID(),
      created_at: new Date().toISOString()
    };
    this.screenshots.unshift(record);
    return record;
  }

  addAuditLog(action: string, actor: string, message?: string) {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString('en', { month: 'short' });
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const log: AuditLogItem = {
      id: randomUUID(),
      action,
      actor,
      ip_address: '10.25.162.12',
      time: `${hours}:${minutes} ${day} ${month}`,
      details: message ? { message } : {},
      created_at: now.toISOString()
    };

    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 50) this.auditLogs.pop();
    return log;
  }
}

export const db = new ProjectManagementStore();
export { ProjectManagementStore as DatabaseStore };
