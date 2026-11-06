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

-- ==============================================================================
-- 002_rls_and_functions.sql
-- Row Level Security (RLS) Helper Functions and Policies
-- ==============================================================================

-- 1. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_role(p_workspace_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
    AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_project_role(p_project_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.project_members
  WHERE project_id = p_project_id
    AND user_id = p_user_id
  LIMIT 1;
$$;

-- 2. ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locked_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES POLICIES
CREATE POLICY "Profiles are viewable by authenticated users in same workspace"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = public.profiles.id
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 4. WORKSPACES POLICIES
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (
    public.is_workspace_member(id, auth.uid()) OR owner_id = auth.uid()
  );

CREATE POLICY "Owners and admins can update workspace"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (
    public.get_workspace_role(id, auth.uid()) IN ('owner', 'admin')
  );

-- 5. WORKSPACE MEMBERS POLICIES
CREATE POLICY "Members can view membership in their workspace"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Owners and admins can manage members"
  ON public.workspace_members FOR ALL
  TO authenticated
  USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

-- 6. PROJECTS POLICIES
CREATE POLICY "Projects viewable by workspace members"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid()) AND (
      visibility = 'workspace_public' OR
      owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = id AND pm.user_id = auth.uid()) OR
      public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    )
  );

CREATE POLICY "Projects manageable by managers, admins, owners"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager'));

CREATE POLICY "Projects editable by project managers and workspace admins"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin') OR
    public.get_project_role(id, auth.uid()) IN ('project_owner', 'project_manager')
  );

-- 7. TASKS POLICIES
CREATE POLICY "Tasks viewable by workspace members with project access"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Tasks creatable by contributors, managers and admins"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager', 'member')
  );

CREATE POLICY "Tasks updatable by assignees, managers and admins"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager') OR
    reporter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = id AND user_id = auth.uid())
  );

-- 8. TASK COMMENTS (With strict client restriction on internal comments)
CREATE POLICY "Comments viewable by allowed users"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_workspace_member(t.workspace_id, auth.uid())
    ) AND (
      -- If comment is internal, client role CANNOT see it
      NOT is_internal OR (
        SELECT public.get_workspace_role(t.workspace_id, auth.uid())
        FROM public.tasks t WHERE t.id = task_id
      ) NOT IN ('client')
    )
  );

CREATE POLICY "Comments insertable by project contributors"
  ON public.task_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 9. TIME ENTRIES POLICIES
CREATE POLICY "Time entries viewable by owner or managers/admins"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager') OR
    public.get_project_role(project_id, auth.uid()) IN ('project_owner', 'project_manager')
  );

CREATE POLICY "Users can insert own time entries"
  ON public.time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    public.is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "Users can update own unlocked time entries"
  ON public.time_entries FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid() AND status NOT IN ('approved', 'locked')) OR
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- 10. SCREENSHOTS POLICIES (Client strictly blocked)
CREATE POLICY "Screenshots viewable by owner or managers/admins"
  ON public.screenshots FOR SELECT
  TO authenticated
  USING (
    -- Clients NEVER see screenshots
    public.get_workspace_role(workspace_id, auth.uid()) != 'client' AND (
      user_id = auth.uid() OR
      public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager') OR
      public.get_project_role(project_id, auth.uid()) IN ('project_owner', 'project_manager')
    )
  );

CREATE POLICY "Users can insert own screenshots"
  ON public.screenshots FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    public.is_workspace_member(workspace_id, auth.uid()) AND
    public.get_workspace_role(workspace_id, auth.uid()) != 'client'
  );

CREATE POLICY "Users can delete own screenshots within allowed window or admins"
  ON public.screenshots FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- 11. TIMESHEETS POLICIES
CREATE POLICY "Timesheets viewable by owner, managers, or admins"
  ON public.timesheets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "Timesheets manageable by owner"
  ON public.timesheets FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'manager')
  );

-- 12. AUDIT LOG POLICIES
CREATE POLICY "Audit logs viewable by workspace admins and owners"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Audit logs insertable by system/authenticated"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 13. STORAGE BUCKET CONFIGURATION FOR SCREENSHOTS
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Screenshot storage download policy"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'screenshots' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Screenshot storage upload policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'screenshots' AND
    auth.role() = 'authenticated'
  );

-- ==============================================================================
-- 003_views_and_indexes.sql
-- Indexes, Unique Constraints, and Analytical Views
-- ==============================================================================

-- 1. CRITICAL CONSTRAINTS & INDEXES
-- Exactly one running timer per user globally
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_timer_per_user
  ON public.time_entries (user_id)
  WHERE ended_at IS NULL;

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_workspace_id ON public.time_entries (workspace_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_started ON public.time_entries (project_id, started_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_started ON public.time_entries (user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON public.time_entries (task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON public.time_entries (status);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_project ON public.tasks (workspace_id, project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_reporter ON public.tasks (reporter_id);

-- Full-text search index on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_fts ON public.tasks
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_screenshots_user_taken ON public.screenshots (user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_project_taken ON public.screenshots (project_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_time_entry ON public.screenshots (time_entry_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_time ON public.audit_logs (workspace_id, created_at DESC);

-- 2. REPORTING VIEWS

-- A. Daily Time Summary View
CREATE OR REPLACE VIEW public.daily_time_summary AS
SELECT
  te.workspace_id,
  te.user_id,
  te.project_id,
  DATE(te.started_at AT TIME ZONE 'UTC') AS date,
  COUNT(te.id) AS entries_count,
  SUM(te.duration_seconds) AS total_seconds,
  SUM(CASE WHEN te.billable THEN te.duration_seconds ELSE 0 END) AS billable_seconds,
  SUM(CASE WHEN NOT te.billable THEN te.duration_seconds ELSE 0 END) AS non_billable_seconds,
  SUM((te.duration_seconds::numeric / 3600.0) * te.hourly_rate_snapshot) AS billable_amount,
  SUM((te.duration_seconds::numeric / 3600.0) * te.cost_rate_snapshot) AS cost_amount
FROM public.time_entries te
WHERE te.ended_at IS NOT NULL
GROUP BY te.workspace_id, te.user_id, te.project_id, DATE(te.started_at AT TIME ZONE 'UTC');

-- B. Project Time & Budget Summary View
CREATE OR REPLACE VIEW public.project_time_summary AS
SELECT
  p.id AS project_id,
  p.workspace_id,
  p.name AS project_name,
  p.key AS project_key,
  p.budget_type,
  p.budget_value,
  COALESCE(SUM(te.duration_seconds), 0) AS total_tracked_seconds,
  COALESCE(SUM(CASE WHEN te.billable THEN te.duration_seconds ELSE 0 END), 0) AS billable_seconds,
  COALESCE(SUM((te.duration_seconds::numeric / 3600.0) * te.hourly_rate_snapshot), 0) AS total_billable_amount,
  COALESCE(SUM((te.duration_seconds::numeric / 3600.0) * te.cost_rate_snapshot), 0) AS total_cost_amount,
  COUNT(DISTINCT te.user_id) AS active_members_count,
  COUNT(DISTINCT t.id) AS total_tasks_count,
  COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS completed_tasks_count
FROM public.projects p
LEFT JOIN public.tasks t ON t.project_id = p.id
LEFT JOIN public.time_entries te ON te.project_id = p.id AND te.ended_at IS NOT NULL
GROUP BY p.id, p.workspace_id, p.name, p.key, p.budget_type, p.budget_value;

-- C. User Utilization & Capacity View
CREATE OR REPLACE VIEW public.user_utilization AS
SELECT
  wm.workspace_id,
  wm.user_id,
  p.full_name,
  p.email,
  p.working_hours_per_week,
  DATE_TRUNC('week', te.started_at AT TIME ZONE 'UTC') AS week_start,
  COALESCE(SUM(te.duration_seconds), 0) / 3600.0 AS total_hours_tracked,
  COALESCE(SUM(CASE WHEN te.billable THEN te.duration_seconds ELSE 0 END), 0) / 3600.0 AS billable_hours,
  ROUND(
    (COALESCE(SUM(te.duration_seconds), 0) / 3600.0) /
    NULLIF(p.working_hours_per_week, 0) * 100.0,
    1
  ) AS capacity_utilization_percent
FROM public.workspace_members wm
JOIN public.profiles p ON p.id = wm.user_id
LEFT JOIN public.time_entries te ON te.user_id = wm.user_id AND te.workspace_id = wm.workspace_id AND te.ended_at IS NOT NULL
GROUP BY wm.workspace_id, wm.user_id, p.full_name, p.email, p.working_hours_per_week, DATE_TRUNC('week', te.started_at AT TIME ZONE 'UTC');

-- ==============================================================================
-- seed.sql
-- Seed script for Webbarracks Development & Demo
-- ==============================================================================

-- 0. Ensure Demo Users exist in Supabase auth.users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex.owner@webbarracks.dev', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alex Mercer (Owner)"}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.admin@webbarracks.dev', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sarah Connor (Admin)"}', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'david.manager@webbarracks.dev', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"David Miller (Manager)"}', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'elena.dev@webbarracks.dev', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Elena Rostova (Dev)"}', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'liam.design@webbarracks.dev', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Liam Vance (Designer)"}', NOW(), NOW()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rachel.client@clientcorp.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rachel Zane (Client)"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 1. Create Demo Profiles
INSERT INTO public.profiles (id, email, full_name, timezone, working_hours_per_week)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alex.owner@webbarracks.dev', 'Alex Mercer (Owner)', 'America/New_York', 40.0),
  ('22222222-2222-2222-2222-222222222222', 'sarah.admin@webbarracks.dev', 'Sarah Connor (Admin)', 'America/Los_Angeles', 40.0),
  ('33333333-3333-3333-3333-333333333333', 'david.manager@webbarracks.dev', 'David Miller (Manager)', 'Europe/London', 38.0),
  ('44444444-4444-4444-4444-444444444444', 'elena.dev@webbarracks.dev', 'Elena Rostova (Dev)', 'Europe/Berlin', 40.0),
  ('55555555-5555-5555-5555-555555555555', 'liam.design@webbarracks.dev', 'Liam Vance (Designer)', 'America/Chicago', 35.0),
  ('66666666-6666-6666-6666-666666666666', 'rachel.client@clientcorp.com', 'Rachel Zane (Client)', 'America/New_York', 0.0)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 2. Create Workspace
INSERT INTO public.workspaces (id, name, slug, owner_id, currency)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Engineering', 'acme-eng', '11111111-1111-1111-1111-111111111111', 'USD')
ON CONFLICT (id) DO NOTHING;

-- 3. Workspace Members
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'manager'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'client')
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- 4. Projects
INSERT INTO public.projects (id, workspace_id, name, key, description, color, owner_id, budget_type, budget_value, billable_default)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Platform Cloud Migration',
    'CLOUD',
    'Migrate monolith services into micro-services and serverless infrastructure',
    '#2563eb',
    '11111111-1111-1111-1111-111111111111',
    'hours',
    250.00,
    TRUE
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'NextGen Client Portal',
    'PORTAL',
    'Self-service client dashboard and reporting analytics',
    '#10b981',
    '33333333-3333-3333-3333-333333333333',
    'fixed_amount',
    18000.00,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Project Members
INSERT INTO public.project_members (project_id, user_id, role)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'project_owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'project_manager'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'contributor'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'project_owner'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'contributor'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 'client')
ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- 6. Rates
INSERT INTO public.rates (workspace_id, user_id, bill_rate, cost_rate, currency)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 150.00, 90.00, 'USD'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 125.00, 75.00, 'USD'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 110.00, 60.00, 'USD'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 95.00,  55.00, 'USD');

-- 7. Tasks
INSERT INTO public.tasks (id, workspace_id, project_id, task_number, key, title, description, status, priority, type, reporter_id, estimate_hours, billable)
VALUES
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    1,
    'CLOUD-1',
    'Setup Terraform infrastructure modules for VPC and Kubernetes',
    'Prepare reusable Terraform templates for EKS/GKE cluster orchestration.',
    'in_progress',
    'high',
    'task',
    '11111111-1111-1111-1111-111111111111',
    16.0,
    TRUE
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    2,
    'CLOUD-2',
    'Configure PostgreSQL replication and read-replicas',
    'Set up high-availability database cluster with failover policies.',
    'todo',
    'urgent',
    'task',
    '33333333-3333-3333-3333-333333333333',
    24.0,
    TRUE
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    1,
    'PORTAL-1',
    'High-fidelity UX mockups for client billing dashboard',
    'Design interactive prototypes in dark and light modes with tokens.',
    'in_review',
    'medium',
    'story',
    '33333333-3333-3333-3333-333333333333',
    12.0,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- Task assignees
INSERT INTO public.task_assignees (task_id, user_id)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555')
ON CONFLICT DO NOTHING;

-- 8. Time Entries
INSERT INTO public.time_entries (
  id, workspace_id, project_id, task_id, user_id, started_at, ended_at, duration_seconds,
  billable, hourly_rate_snapshot, cost_rate_snapshot, source, note, status
)
VALUES
  (
    '77777777-7777-7777-7777-777777777771',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    NOW() - INTERVAL '2 days' + INTERVAL '9 hours',
    NOW() - INTERVAL '2 days' + INTERVAL '13 hours',
    14400,
    TRUE,
    110.00,
    60.00,
    'web',
    'Terraform VPC and security group configuration',
    'approved'
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '55555555-5555-5555-5555-555555555555',
    NOW() - INTERVAL '1 day' + INTERVAL '10 hours',
    NOW() - INTERVAL '1 day' + INTERVAL '14 hours 30 minutes',
    16200,
    TRUE,
    95.00,
    55.00,
    'web',
    'Dashboard design exploration in Figma and CSS variable export',
    'submitted'
  )
ON CONFLICT (id) DO NOTHING;

