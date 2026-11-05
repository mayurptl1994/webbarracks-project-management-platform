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

