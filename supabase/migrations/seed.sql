-- ==============================================================================
-- seed.sql
-- Seed script for Webbarracks Development & Demo
-- ==============================================================================

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
