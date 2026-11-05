import { randomUUID } from 'crypto';
import type {
  UserProfile,
  Workspace,
  WorkspaceMember,
  Project,
  ProjectMember,
  Task,
  TaskComment,
  TimeEntry,
  Screenshot,
  Timesheet,
  AuditLog,
  WorkspaceRole,
  ProjectRole
} from '@webbarracks/shared';

// Initial Seed Users
const initialUsers: UserProfile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'alex.owner@webbarracks.dev',
    full_name: 'Alex Mercer (Owner)',
    avatar_url: null,
    timezone: 'America/New_York',
    working_hours_per_week: 40.0,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'sarah.admin@webbarracks.dev',
    full_name: 'Sarah Connor (Admin)',
    avatar_url: null,
    timezone: 'America/Los_Angeles',
    working_hours_per_week: 40.0,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'david.manager@webbarracks.dev',
    full_name: 'David Miller (Manager)',
    avatar_url: null,
    timezone: 'Europe/London',
    working_hours_per_week: 38.0,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'elena.dev@webbarracks.dev',
    full_name: 'Elena Rostova (Dev)',
    avatar_url: null,
    timezone: 'Europe/Berlin',
    working_hours_per_week: 40.0,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'liam.design@webbarracks.dev',
    full_name: 'Liam Vance (Designer)',
    avatar_url: null,
    timezone: 'America/Chicago',
    working_hours_per_week: 35.0,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    email: 'rachel.client@clientcorp.com',
    full_name: 'Rachel Zane (Client)',
    avatar_url: null,
    timezone: 'America/New_York',
    working_hours_per_week: 0.0,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  }
];

const initialWorkspace: Workspace = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Acme Technologies',
  slug: 'acme-tech',
  owner_id: '11111111-1111-1111-1111-111111111111',
  currency: 'USD',
  settings: {
    round_rule: 'none',
    auto_stop_hours: 12,
    require_task_for_timer: true,
    screenshots_enabled: true
  },
  created_at: new Date('2025-01-01').toISOString(),
  updated_at: new Date('2025-01-01').toISOString()
};

const initialMembers: WorkspaceMember[] = [
  { id: 'wm-1', workspace_id: initialWorkspace.id, user_id: '11111111-1111-1111-1111-111111111111', role: 'owner', is_active: true, joined_at: new Date('2025-01-01').toISOString() },
  { id: 'wm-2', workspace_id: initialWorkspace.id, user_id: '22222222-2222-2222-2222-222222222222', role: 'admin', is_active: true, joined_at: new Date('2025-01-01').toISOString() },
  { id: 'wm-3', workspace_id: initialWorkspace.id, user_id: '33333333-3333-3333-3333-333333333333', role: 'manager', is_active: true, joined_at: new Date('2025-01-01').toISOString() },
  { id: 'wm-4', workspace_id: initialWorkspace.id, user_id: '44444444-4444-4444-4444-444444444444', role: 'member', is_active: true, joined_at: new Date('2025-01-01').toISOString() },
  { id: 'wm-5', workspace_id: initialWorkspace.id, user_id: '55555555-5555-5555-5555-555555555555', role: 'member', is_active: true, joined_at: new Date('2025-01-01').toISOString() },
  { id: 'wm-6', workspace_id: initialWorkspace.id, user_id: '66666666-6666-6666-6666-666666666666', role: 'client', is_active: true, joined_at: new Date('2025-01-01').toISOString() }
];

const initialProjects: Project[] = [
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    workspace_id: initialWorkspace.id,
    name: 'Platform Cloud Migration',
    key: 'CLOUD',
    description: 'Migrate monolith services into microservices and serverless infrastructure',
    color: '#2563eb',
    icon: 'server',
    status: 'active',
    owner_id: '11111111-1111-1111-1111-111111111111',
    visibility: 'workspace_public',
    budget_type: 'hours',
    budget_value: 200,
    billable_default: true,
    currency: 'USD',
    tags: ['infra', 'devops', 'backend'],
    created_at: new Date('2025-01-05').toISOString(),
    updated_at: new Date('2025-01-05').toISOString()
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    workspace_id: initialWorkspace.id,
    name: 'NextGen Client Portal',
    key: 'PORTAL',
    description: 'Self-service client dashboard and reporting analytics',
    color: '#059669',
    icon: 'layout',
    status: 'active',
    owner_id: '33333333-3333-3333-3333-333333333333',
    visibility: 'workspace_public',
    budget_type: 'fixed_amount',
    budget_value: 15000,
    billable_default: true,
    currency: 'USD',
    tags: ['frontend', 'client-facing'],
    created_at: new Date('2025-01-10').toISOString(),
    updated_at: new Date('2025-01-10').toISOString()
  }
];

const initialProjectMembers: ProjectMember[] = [
  { id: 'pm-1', project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', user_id: '11111111-1111-1111-1111-111111111111', role: 'project_owner', created_at: new Date().toISOString() },
  { id: 'pm-2', project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', user_id: '33333333-3333-3333-3333-333333333333', role: 'project_manager', created_at: new Date().toISOString() },
  { id: 'pm-3', project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', user_id: '44444444-4444-4444-4444-444444444444', role: 'contributor', created_at: new Date().toISOString() },
  { id: 'pm-4', project_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', user_id: '33333333-3333-3333-3333-333333333333', role: 'project_owner', created_at: new Date().toISOString() },
  { id: 'pm-5', project_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', user_id: '55555555-5555-5555-5555-555555555555', role: 'contributor', created_at: new Date().toISOString() },
  { id: 'pm-6', project_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', user_id: '66666666-6666-6666-6666-666666666666', role: 'client', created_at: new Date().toISOString() }
];

const initialRates: Record<string, { bill_rate: number; cost_rate: number }> = {
  '11111111-1111-1111-1111-111111111111': { bill_rate: 150.0, cost_rate: 90.0 },
  '22222222-2222-2222-2222-222222222222': { bill_rate: 135.0, cost_rate: 80.0 },
  '33333333-3333-3333-3333-333333333333': { bill_rate: 125.0, cost_rate: 75.0 },
  '44444444-4444-4444-4444-444444444444': { bill_rate: 110.0, cost_rate: 60.0 },
  '55555555-5555-5555-5555-555555555555': { bill_rate: 95.0, cost_rate: 55.0 }
};

const initialTasks: Task[] = [
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    workspace_id: initialWorkspace.id,
    project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    key: 'CLOUD-1',
    title: 'Setup Terraform infrastructure modules for VPC and Kubernetes',
    description: 'Prepare reusable Terraform templates for EKS/GKE cluster orchestration and private subnets.',
    status: 'in_progress',
    priority: 'high',
    type: 'task',
    reporter_id: '11111111-1111-1111-1111-111111111111',
    due_date: '2025-02-15',
    start_date: '2025-02-01',
    estimate_hours: 16.0,
    billable: true,
    tags: ['terraform', 'aws', 'k8s'],
    created_at: new Date('2025-01-12').toISOString(),
    updated_at: new Date('2025-01-12').toISOString()
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    workspace_id: initialWorkspace.id,
    project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    key: 'CLOUD-2',
    title: 'Configure PostgreSQL replication and automated backups',
    description: 'Set up high-availability database cluster with failover policies and WAL archiving.',
    status: 'todo',
    priority: 'urgent',
    type: 'task',
    reporter_id: '33333333-3333-3333-3333-333333333333',
    due_date: '2025-02-20',
    start_date: '2025-02-10',
    estimate_hours: 24.0,
    billable: true,
    tags: ['database', 'postgres'],
    created_at: new Date('2025-01-14').toISOString(),
    updated_at: new Date('2025-01-14').toISOString()
  },
  {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    workspace_id: initialWorkspace.id,
    project_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    key: 'PORTAL-1',
    title: 'High-fidelity UX mockups for client billing dashboard',
    description: 'Design interactive prototypes in dark and light modes with tokens for invoice reviews.',
    status: 'in_review',
    priority: 'medium',
    type: 'story',
    reporter_id: '33333333-3333-3333-3333-333333333333',
    due_date: '2025-02-18',
    start_date: '2025-02-05',
    estimate_hours: 12.0,
    billable: true,
    tags: ['design', 'figma'],
    created_at: new Date('2025-01-15').toISOString(),
    updated_at: new Date('2025-01-15').toISOString()
  },
  {
    id: '12121212-1212-1212-1212-121212121212',
    workspace_id: initialWorkspace.id,
    project_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    key: 'PORTAL-2',
    title: 'Export time reports to CSV & PDF format',
    description: 'Provide downloadable CSV and PDF reports with client-friendly summaries.',
    status: 'backlog',
    priority: 'low',
    type: 'task',
    reporter_id: '33333333-3333-3333-3333-333333333333',
    due_date: '2025-02-28',
    start_date: null,
    estimate_hours: 8.0,
    billable: true,
    tags: ['export', 'reporting'],
    created_at: new Date('2025-01-16').toISOString(),
    updated_at: new Date('2025-01-16').toISOString()
  }
];

const initialTaskAssignees: Record<string, string[]> = {
  'dddddddd-dddd-dddd-dddd-dddddddddddd': ['44444444-4444-4444-4444-444444444444'],
  'ffffffff-ffff-ffff-ffff-ffffffffffff': ['55555555-5555-5555-5555-555555555555']
};

const initialTimeEntries: TimeEntry[] = [
  {
    id: '77777777-7777-7777-7777-777777777771',
    workspace_id: initialWorkspace.id,
    project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    task_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    user_id: '44444444-4444-4444-4444-444444444444',
    started_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 44 * 3600 * 1000).toISOString(),
    duration_seconds: 14400,
    billable: true,
    hourly_rate_snapshot: 110.0,
    cost_rate_snapshot: 60.0,
    source: 'web',
    note: 'Terraform VPC and security group configuration',
    tags: ['devops'],
    status: 'approved',
    approved_by: '33333333-3333-3333-3333-333333333333',
    approved_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: '77777777-7777-7777-7777-777777777772',
    workspace_id: initialWorkspace.id,
    project_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    task_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    user_id: '55555555-5555-5555-5555-555555555555',
    started_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 19.5 * 3600 * 1000).toISOString(),
    duration_seconds: 16200,
    billable: true,
    hourly_rate_snapshot: 95.0,
    cost_rate_snapshot: 55.0,
    source: 'web',
    note: 'Dashboard design exploration in Figma and token variables',
    tags: ['figma'],
    status: 'submitted',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }
];

const initialScreenshots: Screenshot[] = [
  {
    id: 'ss-1',
    time_entry_id: '77777777-7777-7777-7777-777777777771',
    workspace_id: initialWorkspace.id,
    project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    task_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    user_id: '44444444-4444-4444-4444-444444444444',
    taken_at: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
    storage_path: 'screenshots/demo-k8s.webp',
    activity_percent: 94,
    blurred: false,
    app_name: 'VS Code',
    window_title: 'terraform/vpc.tf - Visual Studio Code',
    created_at: new Date(Date.now() - 46 * 3600 * 1000).toISOString()
  },
  {
    id: 'ss-2',
    time_entry_id: '77777777-7777-7777-7777-777777777772',
    workspace_id: initialWorkspace.id,
    project_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    task_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    user_id: '55555555-5555-5555-5555-555555555555',
    taken_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    storage_path: 'screenshots/demo-figma.webp',
    activity_percent: 88,
    blurred: false,
    app_name: 'Figma',
    window_title: 'Client Portal Design System - Figma',
    created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString()
  }
];

const initialComments: TaskComment[] = [
  {
    id: 'comm-1',
    task_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    user_id: '11111111-1111-1111-1111-111111111111',
    content: 'Initial modules look great. Please make sure we have multi-AZ redundancy on the RDS cluster.',
    is_internal: true,
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
  },
  {
    id: 'comm-2',
    task_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    user_id: '66666666-6666-6666-6666-666666666666',
    content: 'Loving the clean monochromatic design direction! Excited for the interactive demo.',
    is_internal: false,
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
  }
];

const initialAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    workspace_id: initialWorkspace.id,
    user_id: '11111111-1111-1111-1111-111111111111',
    action: 'project.create',
    entity_type: 'project',
    entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    details: { name: 'Platform Cloud Migration', key: 'CLOUD' },
    created_at: new Date('2025-01-05').toISOString()
  }
];

/**
 * In-memory Store Singleton for immediate high-fidelity local dev & tests
 */
export class DatabaseStore {
  users: UserProfile[] = [...initialUsers];
  workspaces: Workspace[] = [initialWorkspace];
  workspaceMembers: WorkspaceMember[] = [...initialMembers];
  projects: Project[] = [...initialProjects];
  projectMembers: ProjectMember[] = [...initialProjectMembers];
  tasks: Task[] = [...initialTasks];
  taskAssignees: Record<string, string[]> = { ...initialTaskAssignees };
  timeEntries: TimeEntry[] = [...initialTimeEntries];
  screenshots: Screenshot[] = [...initialScreenshots];
  comments: TaskComment[] = [...initialComments];
  auditLogs: AuditLog[] = [...initialAuditLogs];
  rates: Record<string, { bill_rate: number; cost_rate: number }> = { ...initialRates };
  timesheets: Timesheet[] = [];

  // ==================== AUTH & USERS ====================
  getUserById(id: string): UserProfile | undefined {
    return this.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): UserProfile | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(profile: UserProfile): UserProfile {
    this.users.push(profile);
    return profile;
  }

  // ==================== WORKSPACE & MEMBERS ====================
  getWorkspaceById(id: string): Workspace | undefined {
    return this.workspaces.find((w) => w.id === id);
  }

  getWorkspaceMembers(workspaceId: string): (WorkspaceMember & { user?: UserProfile })[] {
    return this.workspaceMembers
      .filter((m) => m.workspace_id === workspaceId && m.is_active)
      .map((m) => ({
        ...m,
        user: this.getUserById(m.user_id)
      }));
  }

  getWorkspaceMember(workspaceId: string, userId: string): WorkspaceMember | undefined {
    return this.workspaceMembers.find((m) => m.workspace_id === workspaceId && m.user_id === userId && m.is_active);
  }

  setWorkspaceMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): WorkspaceMember {
    let member = this.workspaceMembers.find((m) => m.workspace_id === workspaceId && m.user_id === userId);
    if (!member) {
      member = {
        id: randomUUID(),
        workspace_id: workspaceId,
        user_id: userId,
        role,
        is_active: true,
        joined_at: new Date().toISOString()
      };
      this.workspaceMembers.push(member);
    } else {
      member.role = role;
    }
    return member;
  }

  // ==================== PROJECTS ====================
  getProjects(workspaceId: string, userId?: string, isClient = false): (Project & { membersCount?: number; tasksCount?: number })[] {
    let list = this.projects.filter((p) => p.workspace_id === workspaceId && p.status !== 'archived');
    if (isClient && userId) {
      // Clients only see projects they are assigned to
      const allowedProjectIds = new Set(
        this.projectMembers.filter((pm) => pm.user_id === userId).map((pm) => pm.project_id)
      );
      list = list.filter((p) => allowedProjectIds.has(p.id));
    }

    return list.map((p) => {
      const pmCount = this.projectMembers.filter((pm) => pm.project_id === p.id).length;
      const tCount = this.tasks.filter((t) => t.project_id === p.id).length;
      return {
        ...p,
        membersCount: pmCount,
        tasksCount: tCount
      };
    });
  }

  getProjectById(projectId: string): Project | undefined {
    return this.projects.find((p) => p.id === projectId);
  }

  getProjectMemberRole(projectId: string, userId: string): ProjectRole | undefined {
    const pm = this.projectMembers.find((m) => m.project_id === projectId && m.user_id === userId);
    return pm?.role;
  }

  createProject(project: Project): Project {
    this.projects.push(project);
    return project;
  }

  updateProject(projectId: string, patch: Partial<Project>): Project | undefined {
    const p = this.projects.find((proj) => proj.id === projectId);
    if (!p) return undefined;
    Object.assign(p, patch, { updated_at: new Date().toISOString() });
    return p;
  }

  // ==================== TASKS ====================
  getTasks(workspaceId: string, projectId?: string): (Task & { assignees: UserProfile[] })[] {
    let list = this.tasks.filter((t) => t.workspace_id === workspaceId);
    if (projectId) {
      list = list.filter((t) => t.project_id === projectId);
    }
    return list.map((t) => {
      const assigneeIds = this.taskAssignees[t.id] || [];
      const assignees = assigneeIds.map((uid) => this.getUserById(uid)).filter(Boolean) as UserProfile[];
      return {
        ...t,
        assignees
      };
    });
  }

  getTaskById(taskId: string): (Task & { assignees: UserProfile[] }) | undefined {
    const t = this.tasks.find((task) => task.id === taskId);
    if (!t) return undefined;
    const assigneeIds = this.taskAssignees[t.id] || [];
    const assignees = assigneeIds.map((uid) => this.getUserById(uid)).filter(Boolean) as UserProfile[];
    return { ...t, assignees };
  }

  createTask(task: Task, assigneeIds: string[] = []): Task & { assignees: UserProfile[] } {
    this.tasks.push(task);
    this.taskAssignees[task.id] = assigneeIds;
    const assignees = assigneeIds.map((uid) => this.getUserById(uid)).filter(Boolean) as UserProfile[];
    return { ...task, assignees };
  }

  updateTask(taskId: string, patch: Partial<Task>, assigneeIds?: string[]): (Task & { assignees: UserProfile[] }) | undefined {
    const t = this.tasks.find((task) => task.id === taskId);
    if (!t) return undefined;
    Object.assign(t, patch, { updated_at: new Date().toISOString() });
    if (assigneeIds !== undefined) {
      this.taskAssignees[taskId] = assigneeIds;
    }
    const currentAssigneeIds = this.taskAssignees[taskId] || [];
    const assignees = currentAssigneeIds.map((uid) => this.getUserById(uid)).filter(Boolean) as UserProfile[];
    return { ...t, assignees };
  }

  // ==================== TIME TRACKING ====================
  getActiveTimer(userId: string): TimeEntry | undefined {
    return this.timeEntries.find((entry) => entry.user_id === userId && entry.ended_at === null);
  }

  startTimer(params: {
    workspace_id: string;
    project_id: string;
    task_id: string;
    user_id: string;
    billable?: boolean;
    note?: string;
    switch_active?: boolean;
    source?: 'web' | 'agent' | 'manual';
  }): { entry: TimeEntry; stoppedPrevious?: TimeEntry } {
    const currentActive = this.getActiveTimer(params.user_id);
    let stoppedPrevious: TimeEntry | undefined;

    if (currentActive) {
      if (params.switch_active) {
        // Auto-stop previous timer
        const now = new Date();
        const duration = Math.max(1, Math.floor((now.getTime() - new Date(currentActive.started_at).getTime()) / 1000));
        currentActive.ended_at = now.toISOString();
        currentActive.duration_seconds = duration;
        currentActive.updated_at = now.toISOString();
        stoppedPrevious = currentActive;
      } else {
        throw new Error('An active timer is already running for this user. Switch or stop it first.');
      }
    }

    // Snapshot rates
    const userRates = this.rates[params.user_id] || { bill_rate: 100.0, cost_rate: 60.0 };

    const newEntry: TimeEntry = {
      id: randomUUID(),
      workspace_id: params.workspace_id,
      project_id: params.project_id,
      task_id: params.task_id,
      user_id: params.user_id,
      started_at: new Date().toISOString(),
      ended_at: null,
      duration_seconds: 0,
      billable: params.billable ?? true,
      hourly_rate_snapshot: userRates.bill_rate,
      cost_rate_snapshot: userRates.cost_rate,
      source: params.source || 'web',
      note: params.note || null,
      tags: [],
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.timeEntries.push(newEntry);
    return { entry: newEntry, stoppedPrevious };
  }

  stopTimer(userId: string): TimeEntry | undefined {
    const active = this.getActiveTimer(userId);
    if (!active) return undefined;

    const now = new Date();
    const duration = Math.max(1, Math.floor((now.getTime() - new Date(active.started_at).getTime()) / 1000));
    active.ended_at = now.toISOString();
    active.duration_seconds = duration;
    active.updated_at = now.toISOString();
    return active;
  }

  addManualTimeEntry(params: {
    workspace_id: string;
    project_id: string;
    task_id: string;
    user_id: string;
    started_at: string;
    ended_at: string;
    duration_seconds?: number;
    billable?: boolean;
    note?: string;
    tags?: string[];
  }): TimeEntry {
    const started = new Date(params.started_at);
    const ended = new Date(params.ended_at);
    const duration = params.duration_seconds || Math.max(1, Math.floor((ended.getTime() - started.getTime()) / 1000));
    const userRates = this.rates[params.user_id] || { bill_rate: 100.0, cost_rate: 60.0 };

    const entry: TimeEntry = {
      id: randomUUID(),
      workspace_id: params.workspace_id,
      project_id: params.project_id,
      task_id: params.task_id,
      user_id: params.user_id,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_seconds: duration,
      billable: params.billable ?? true,
      hourly_rate_snapshot: userRates.bill_rate,
      cost_rate_snapshot: userRates.cost_rate,
      source: 'manual',
      note: params.note || null,
      tags: params.tags || [],
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.timeEntries.push(entry);
    return entry;
  }

  getTimeEntries(workspaceId: string, filter?: { projectId?: string; userId?: string; taskId?: string }): (TimeEntry & { task?: Task; project?: Project; user?: UserProfile })[] {
    let list = this.timeEntries.filter((e) => e.workspace_id === workspaceId);
    if (filter?.projectId) list = list.filter((e) => e.project_id === filter.projectId);
    if (filter?.userId) list = list.filter((e) => e.user_id === filter.userId);
    if (filter?.taskId) list = list.filter((e) => e.task_id === filter.taskId);

    return list
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .map((entry) => ({
        ...entry,
        task: this.tasks.find((t) => t.id === entry.task_id),
        project: this.projects.find((p) => p.id === entry.project_id),
        user: this.getUserById(entry.user_id)
      }));
  }

  // ==================== SCREENSHOTS ====================
  addScreenshot(data: Omit<Screenshot, 'id' | 'created_at'>): Screenshot {
    const item: Screenshot = {
      ...data,
      id: randomUUID(),
      created_at: new Date().toISOString()
    };
    this.screenshots.push(item);
    return item;
  }

  getScreenshots(workspaceId: string, filter?: { projectId?: string; userId?: string }): Screenshot[] {
    let list = this.screenshots.filter((s) => s.workspace_id === workspaceId);
    if (filter?.projectId) list = list.filter((s) => s.project_id === filter.projectId);
    if (filter?.userId) list = list.filter((s) => s.user_id === filter.userId);
    return list.sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
  }

  deleteScreenshot(id: string, userId: string, isAdmin = false): boolean {
    const index = this.screenshots.findIndex((s) => s.id === id);
    if (index === -1) return false;
    const shot = this.screenshots[index];
    if (!isAdmin && shot.user_id !== userId) return false;
    this.screenshots.splice(index, 1);
    return true;
  }

  // ==================== COMMENTS ====================
  getComments(taskId: string, isClient = false): (TaskComment & { user?: UserProfile })[] {
    let list = this.comments.filter((c) => c.task_id === taskId);
    if (isClient) {
      list = list.filter((c) => !c.is_internal); // Client cannot see internal comments
    }
    return list.map((c) => ({
      ...c,
      user: this.getUserById(c.user_id)
    }));
  }

  addComment(comment: TaskComment): TaskComment {
    this.comments.push(comment);
    return comment;
  }

  // ==================== AUDIT LOGS ====================
  logAudit(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const entry: AuditLog = {
      ...log,
      id: randomUUID(),
      created_at: new Date().toISOString()
    };
    this.auditLogs.unshift(entry);
    return entry;
  }

  getAuditLogs(workspaceId: string): (AuditLog & { user?: UserProfile })[] {
    return this.auditLogs
      .filter((l) => l.workspace_id === workspaceId)
      .slice(0, 50)
      .map((l) => ({
        ...l,
        user: this.getUserById(l.user_id)
      }));
  }
}

// Global instance for local server lifecycle
export const db = new DatabaseStore();
