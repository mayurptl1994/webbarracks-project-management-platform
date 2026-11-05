import type { WorkspaceRole, ProjectRole, Permission } from './permissions.js';

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'bug' | 'story' | 'epic';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type BudgetType = 'none' | 'hours' | 'fixed_amount';
export type TimeEntrySource = 'web' | 'agent' | 'manual' | 'import';
export type TimeEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'invoiced' | 'locked';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  timezone: string;
  working_hours_per_week: number;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url?: string | null;
  currency: string;
  settings: {
    round_rule?: 'none' | '5' | '10' | '15' | '30';
    auto_stop_hours?: number;
    require_task_for_timer?: boolean;
    screenshots_enabled?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  custom_role_id?: string | null;
  is_active: boolean;
  joined_at: string;
  user?: UserProfile;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  key: string;
  description?: string | null;
  client_id?: string | null;
  color: string;
  icon: string;
  status: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  owner_id: string;
  visibility: 'workspace_public' | 'private';
  budget_type: BudgetType;
  budget_value: number;
  billable_default: boolean;
  currency: string;
  tags: string[];
  custom_workflow?: TaskStatus[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
  user?: UserProfile;
}

export interface Task {
  id: string;
  workspace_id: string;
  project_id: string;
  key: string; // e.g. "WEB-1"
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  reporter_id: string;
  due_date?: string | null;
  start_date?: string | null;
  estimate_hours: number;
  billable: boolean;
  tags: string[];
  assignees?: UserProfile[];
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface TimeEntry {
  id: string;
  workspace_id: string;
  project_id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  billable: boolean;
  hourly_rate_snapshot: number;
  cost_rate_snapshot: number;
  source: TimeEntrySource;
  note?: string | null;
  tags: string[];
  status: TimeEntryStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  edited_by?: string | null;
  edit_reason?: string | null;
  created_at: string;
  updated_at: string;
  task?: Task;
  project?: Project;
  user?: UserProfile;
}

export interface Screenshot {
  id: string;
  time_entry_id?: string | null;
  workspace_id: string;
  project_id: string;
  task_id: string;
  user_id: string;
  taken_at: string;
  storage_path: string;
  activity_percent: number;
  blurred: boolean;
  app_name?: string | null;
  window_title?: string | null;
  preview_url?: string;
  created_at: string;
}

export interface Timesheet {
  id: string;
  workspace_id: string;
  user_id: string;
  period_start: string; // Monday YYYY-MM-DD
  period_end: string;   // Sunday YYYY-MM-DD
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  total_seconds: number;
  billable_seconds: number;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
  user?: UserProfile;
}

export interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  task_id: string;
  task_title: string;
  task_key: string;
  project_id: string;
  project_name: string;
  project_color: string;
  started_at: string;
  elapsed_seconds: number;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  workspace: Workspace;
  workspaceRole: WorkspaceRole;
  effectivePermissions: Permission[];
}

