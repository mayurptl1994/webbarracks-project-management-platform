-- ==============================================================================
-- 001_initial_schema.sql
-- Complete schema for Webbarracks Project Management & Time Monitoring Platform
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  working_hours_per_week NUMERIC(4, 1) NOT NULL DEFAULT 40.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. WORKSPACES (Tenants)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  logo_url TEXT,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  settings JSONB NOT NULL DEFAULT '{
    "round_rule": "none",
    "auto_stop_hours": 12,
    "require_task_for_timer": true,
    "screenshots_enabled": true,
    "idle_timeout_minutes": 5
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ROLES & CUSTOM PERMISSIONS
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  PRIMARY KEY (role_id, permission)
);

-- 4. WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'client')),
  custom_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- 5. TEAMS & TEAM MEMBERS
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

-- 6. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key VARCHAR(10) NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  color VARCHAR(9) NOT NULL DEFAULT '#0f172a',
  icon VARCHAR(50) NOT NULL DEFAULT 'folder',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
  start_date DATE,
  end_date DATE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  visibility VARCHAR(20) NOT NULL DEFAULT 'workspace_public' CHECK (visibility IN ('workspace_public', 'private')),
  budget_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (budget_type IN ('none', 'hours', 'fixed_amount')),
  budget_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  billable_default BOOLEAN NOT NULL DEFAULT TRUE,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, key)
);

-- 7. PROJECT MEMBERS
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL CHECK (role IN ('project_owner', 'project_manager', 'contributor', 'reviewer', 'viewer', 'client')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 8. PROJECT SETTINGS
CREATE TABLE IF NOT EXISTS public.project_settings (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  time_tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  screenshots_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  screenshot_interval_minutes INT NOT NULL DEFAULT 10,
  blur_screenshots BOOLEAN NOT NULL DEFAULT FALSE,
  allow_user_delete_window_minutes INT NOT NULL DEFAULT 5,
  allowed_task_statuses TEXT[] NOT NULL DEFAULT '{"backlog","todo","in_progress","in_review","done","cancelled"}'
);

-- 9. MILESTONES
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SPRINTS
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  task_number INT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'todo',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  type VARCHAR(20) NOT NULL DEFAULT 'task' CHECK (type IN ('task', 'bug', 'story', 'epic')),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  due_date DATE,
  start_date DATE,
  estimate_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  story_points INT,
  billable BOOLEAN NOT NULL DEFAULT TRUE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, task_number)
);

-- 12. TASK ASSIGNEES & WATCHERS
CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.task_watchers (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- 13. TASK DEPENDENCIES & SUBTASKS
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(20) NOT NULL DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'blocked_by')),
  PRIMARY KEY (task_id, depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0
);

-- 14. COMMENTS & ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. RATES & BUDGETS
CREATE TABLE IF NOT EXISTS public.rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_type VARCHAR(20),
  bill_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  cost_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. TIME ENTRIES (Core Time Tracking)
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT NOT NULL DEFAULT 0,
  billable BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  cost_rate_snapshot NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  source VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'agent', 'manual', 'import')),
  note TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'invoiced', 'locked')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  edited_by UUID REFERENCES public.profiles(id),
  edit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_time_entry_chronology CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT check_time_entry_duration_nonneg CHECK (duration_seconds >= 0)
);

-- 17. TIME ENTRY EDITS AUDIT
CREATE TABLE IF NOT EXISTS public.time_entry_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES public.profiles(id),
  old_started_at TIMESTAMPTZ NOT NULL,
  old_ended_at TIMESTAMPTZ,
  old_duration_seconds INT NOT NULL,
  new_started_at TIMESTAMPTZ NOT NULL,
  new_ended_at TIMESTAMPTZ,
  new_duration_seconds INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. TIMESHEETS & APPROVALS
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  total_seconds INT NOT NULL DEFAULT 0,
  billable_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id, period_start)
);

-- 19. LOCKED PERIODS (Payroll closes)
CREATE TABLE IF NOT EXISTS public.locked_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  locked_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. SCREENSHOTS & ACTIVITY SAMPLES
CREATE TABLE IF NOT EXISTS public.screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  storage_path TEXT NOT NULL,
  activity_percent INT NOT NULL DEFAULT 100 CHECK (activity_percent >= 0 AND activity_percent <= 100),
  blurred BOOLEAN NOT NULL DEFAULT FALSE,
  app_name TEXT,
  window_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  keyboard_events INT NOT NULL DEFAULT 0,
  mouse_events INT NOT NULL DEFAULT 0,
  activity_percent INT NOT NULL DEFAULT 0
);

-- 21. CONSENTS (Explicit user screenshot consent audit)
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL DEFAULT 'screen_capture',
  consent_text TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  UNIQUE(workspace_id, user_id, consent_type)
);

-- 22. NOTIFICATIONS & PREFERENCES
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_assignments BOOLEAN NOT NULL DEFAULT TRUE,
  email_mentions BOOLEAN NOT NULL DEFAULT TRUE,
  email_timesheet_approvals BOOLEAN NOT NULL DEFAULT TRUE,
  email_weekly_digest BOOLEAN NOT NULL DEFAULT TRUE
);

-- 23. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
