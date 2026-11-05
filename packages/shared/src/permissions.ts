/**
 * Unified Role-Based Access Control (RBAC) System
 * Defines the complete permission matrix and resolution logic across Workspace and Project scopes.
 */

export const WORKSPACE_ROLES = [
  'owner',
  'admin',
  'manager',
  'member',
  'client'
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PROJECT_ROLES = [
  'project_owner',
  'project_manager',
  'contributor',
  'reviewer',
  'viewer',
  'client'
] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const ALL_PERMISSIONS = [
  // Workspace permissions
  'workspace:manage_billing',
  'workspace:manage_members',
  'workspace:manage_settings',
  'workspace:view_audit_log',

  // Project permissions
  'project:create',
  'project:edit',
  'project:archive',
  'project:delete',
  'project:manage_members',
  'project:view_budget',
  'project:edit_budget',
  'project:view_rates',

  // Task permissions
  'task:create',
  'task:edit',
  'task:delete',
  'task:assign',
  'task:change_status',
  'task:comment',
  'task:view_internal_comments',

  // Time permissions
  'time:track_own',
  'time:add_manual_own',
  'time:edit_own',
  'time:delete_own',
  'time:view_others',
  'time:edit_others',
  'time:approve_timesheets',
  'time:lock_period',

  // Screenshot permissions
  'screenshots:view_own',
  'screenshots:delete_own',
  'screenshots:view_others',
  'screenshots:delete_others',
  'screenshots:configure_capture',

  // Reports permissions
  'reports:view_own',
  'reports:view_project',
  'reports:view_team',
  'reports:view_all',
  'reports:export',
  'reports:schedule',
  'reports:view_financial'
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * Standard Workspace Role Grants
 */
export const WORKSPACE_ROLE_PERMISSIONS: Record<WorkspaceRole, readonly Permission[]> = {
  owner: ALL_PERMISSIONS, // Owner has all permissions
  admin: ALL_PERMISSIONS.filter(
    (p) => p !== 'workspace:manage_billing' // Billing is reserved for Workspace Owner
  ),
  manager: [
    'project:create',
    'project:edit',
    'project:archive',
    'project:manage_members',
    'project:view_budget',
    'project:edit_budget',
    'project:view_rates',
    'task:create',
    'task:edit',
    'task:delete',
    'task:assign',
    'task:change_status',
    'task:comment',
    'task:view_internal_comments',
    'time:track_own',
    'time:add_manual_own',
    'time:edit_own',
    'time:delete_own',
    'time:view_others',
    'time:edit_others',
    'time:approve_timesheets',
    'screenshots:view_own',
    'screenshots:delete_own',
    'screenshots:view_others',
    'reports:view_own',
    'reports:view_project',
    'reports:view_team',
    'reports:export',
    'reports:view_financial'
  ],
  member: [
    'task:create',
    'task:edit',
    'task:assign',
    'task:change_status',
    'task:comment',
    'task:view_internal_comments',
    'time:track_own',
    'time:add_manual_own',
    'time:edit_own',
    'time:delete_own',
    'screenshots:view_own',
    'screenshots:delete_own',
    'reports:view_own'
  ],
  client: [
    'task:comment',
    'reports:view_project', // Read-only client summaries without cost/rates
    'reports:export'
  ]
};

/**
 * Standard Project-Level Role Grants
 */
export const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, readonly Permission[]> = {
  project_owner: [
    'project:edit',
    'project:archive',
    'project:manage_members',
    'project:view_budget',
    'project:edit_budget',
    'project:view_rates',
    'task:create',
    'task:edit',
    'task:delete',
    'task:assign',
    'task:change_status',
    'task:comment',
    'task:view_internal_comments',
    'time:track_own',
    'time:add_manual_own',
    'time:edit_own',
    'time:delete_own',
    'time:view_others',
    'time:edit_others',
    'time:approve_timesheets',
    'screenshots:view_own',
    'screenshots:delete_own',
    'screenshots:view_others',
    'screenshots:configure_capture',
    'reports:view_own',
    'reports:view_project',
    'reports:view_financial',
    'reports:export'
  ],
  project_manager: [
    'project:edit',
    'project:manage_members',
    'project:view_budget',
    'project:view_rates',
    'task:create',
    'task:edit',
    'task:delete',
    'task:assign',
    'task:change_status',
    'task:comment',
    'task:view_internal_comments',
    'time:track_own',
    'time:add_manual_own',
    'time:edit_own',
    'time:delete_own',
    'time:view_others',
    'time:edit_others',
    'time:approve_timesheets',
    'screenshots:view_own',
    'screenshots:delete_own',
    'screenshots:view_others',
    'reports:view_own',
    'reports:view_project',
    'reports:view_financial',
    'reports:export'
  ],
  contributor: [
    'task:create',
    'task:edit',
    'task:assign',
    'task:change_status',
    'task:comment',
    'task:view_internal_comments',
    'time:track_own',
    'time:add_manual_own',
    'time:edit_own',
    'time:delete_own',
    'screenshots:view_own',
    'screenshots:delete_own',
    'reports:view_own',
    'reports:view_project'
  ],
  reviewer: [
    'task:change_status',
    'task:comment',
    'task:view_internal_comments',
    'time:view_others',
    'reports:view_project'
  ],
  viewer: [
    'task:view_internal_comments',
    'reports:view_project'
  ],
  client: [
    'task:comment',
    'reports:view_project',
    'reports:export'
  ]
};

/**
 * Hard restrictions that apply to Clients and Viewers regardless of elevation.
 * Clients never see screenshots, internal comments, or financial rates/costs.
 */
export const RESTRICTED_FOR_CLIENTS: readonly Permission[] = [
  'screenshots:view_own',
  'screenshots:delete_own',
  'screenshots:view_others',
  'screenshots:delete_others',
  'screenshots:configure_capture',
  'task:view_internal_comments',
  'project:view_rates',
  'project:edit_budget',
  'reports:view_financial',
  'time:view_others',
  'time:edit_others',
  'workspace:manage_billing'
];

/**
 * Resolves effective permissions given a user's workspace role and optional project role.
 * Rule: Effective = union(workspace grants, project grants), BUT client restrictions always strip restricted permissions.
 */
export function resolveEffectivePermissions(
  workspaceRole: WorkspaceRole,
  projectRole?: ProjectRole | null,
  customWorkspacePermissions?: readonly Permission[]
): Set<Permission> {
  const isClient = workspaceRole === 'client' || projectRole === 'client';

  // Base workspace grants
  const baseWorkspaceGrants = customWorkspacePermissions || WORKSPACE_ROLE_PERMISSIONS[workspaceRole] || [];
  const permissions = new Set<Permission>(baseWorkspaceGrants);

  // Union project role grants if provided
  if (projectRole && PROJECT_ROLE_PERMISSIONS[projectRole]) {
    for (const perm of PROJECT_ROLE_PERMISSIONS[projectRole]) {
      permissions.add(perm);
    }
  }

  // Enforce client restrictions: client rules always apply
  if (isClient) {
    for (const restricted of RESTRICTED_FOR_CLIENTS) {
      permissions.delete(restricted);
    }
  }

  return permissions;
}

/**
 * Check if effective permissions satisfy a specific permission check
 */
export function hasPermission(
  effectivePermissions: Set<Permission>,
  required: Permission
): boolean {
  return effectivePermissions.has(required);
}
