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
