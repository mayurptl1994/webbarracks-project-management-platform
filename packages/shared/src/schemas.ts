import { z } from 'zod';
import { WORKSPACE_ROLES, PROJECT_ROLES } from './permissions.js';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  workspace_name: z.string().min(2).optional()
});

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  currency: z.string().length(3).default('USD')
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  key: z.string().min(2).max(10).toUpperCase(),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).default('#0f172a'),
  icon: z.string().default('folder'),
  budget_type: z.enum(['none', 'hours', 'fixed_amount']).default('none'),
  budget_value: z.number().nonnegative().default(0),
  billable_default: z.boolean().default(true),
  visibility: z.enum(['workspace_public', 'private']).default('workspace_public'),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  tags: z.array(z.string()).default([])
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional()
});

export const CreateTaskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  type: z.enum(['task', 'bug', 'story', 'epic']).default('task'),
  due_date: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  estimate_hours: z.number().nonnegative().default(0),
  billable: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  assignee_ids: z.array(z.string().uuid()).default([])
});

export const UpdateTaskSchema = CreateTaskSchema.partial().omit({ project_id: true });

export const StartTimerSchema = z.object({
  task_id: z.string().uuid(),
  billable: z.boolean().optional(),
  note: z.string().max(500).optional(),
  switch_active: z.boolean().default(false)
});

export const CreateManualTimeEntrySchema = z.object({
  project_id: z.string().uuid(),
  task_id: z.string().uuid(),
  started_at: z.string(), // ISO string
  ended_at: z.string(),   // ISO string
  duration_seconds: z.number().positive().optional(),
  billable: z.boolean().default(true),
  note: z.string().max(500).optional(),
  tags: z.array(z.string()).default([])
});

export const UpdateTimeEntrySchema = z.object({
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
  duration_seconds: z.number().positive().optional(),
  billable: z.boolean().optional(),
  note: z.string().max(500).optional(),
  edit_reason: z.string().min(3).max(500).optional()
});

export const UploadScreenshotMetadataSchema = z.object({
  time_entry_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid(),
  task_id: z.string().uuid(),
  taken_at: z.string(),
  activity_percent: z.number().min(0).max(100).default(100),
  blurred: z.boolean().default(false),
  app_name: z.string().max(100).optional().nullable(),
  window_title: z.string().max(255).optional().nullable(),
  image_base64: z.string().optional() // for direct upload in local dev/demo
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(WORKSPACE_ROLES).default('member'),
  project_ids: z.array(z.string().uuid()).default([])
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(WORKSPACE_ROLES)
});

export const UpdateProjectMemberRoleSchema = z.object({
  role: z.enum(PROJECT_ROLES)
});

export const TimesheetSubmitSchema = z.object({
  period_start: z.string(), // YYYY-MM-DD
  period_end: z.string()
});

export const TimesheetApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().max(500).optional()
});

export const AddCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  is_internal: z.boolean().default(false)
});
