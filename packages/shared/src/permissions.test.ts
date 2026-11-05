import { describe, it, expect } from 'vitest';
import { resolveEffectivePermissions, hasPermission } from './permissions.js';

describe('RBAC Permission Matrix & Resolver', () => {
  it('Owner has all permissions including workspace:manage_billing', () => {
    const perms = resolveEffectivePermissions('owner');
    expect(hasPermission(perms, 'workspace:manage_billing')).toBe(true);
    expect(hasPermission(perms, 'time:track_own')).toBe(true);
    expect(hasPermission(perms, 'screenshots:view_others')).toBe(true);
  });

  it('Admin has all permissions EXCEPT workspace:manage_billing', () => {
    const perms = resolveEffectivePermissions('admin');
    expect(hasPermission(perms, 'workspace:manage_billing')).toBe(false);
    expect(hasPermission(perms, 'workspace:manage_members')).toBe(true);
    expect(hasPermission(perms, 'screenshots:view_others')).toBe(true);
    expect(hasPermission(perms, 'time:approve_timesheets')).toBe(true);
  });

  it('Member has standard task and time permissions, cannot view others screenshots', () => {
    const perms = resolveEffectivePermissions('member');
    expect(hasPermission(perms, 'time:track_own')).toBe(true);
    expect(hasPermission(perms, 'screenshots:view_own')).toBe(true);
    expect(hasPermission(perms, 'screenshots:view_others')).toBe(false);
    expect(hasPermission(perms, 'time:approve_timesheets')).toBe(false);
  });

  it('Member elevated by Project Manager role gains project management and time approval permissions on project', () => {
    const perms = resolveEffectivePermissions('member', 'project_manager');
    expect(hasPermission(perms, 'time:track_own')).toBe(true);
    expect(hasPermission(perms, 'screenshots:view_others')).toBe(true);
    expect(hasPermission(perms, 'time:approve_timesheets')).toBe(true);
    expect(hasPermission(perms, 'project:edit')).toBe(true);
  });

  it('Client role is strictly restricted from screenshots, internal comments and financial data even if elevated', () => {
    const perms = resolveEffectivePermissions('client', 'project_manager');
    // Client restrictions must strip these!
    expect(hasPermission(perms, 'screenshots:view_own')).toBe(false);
    expect(hasPermission(perms, 'screenshots:view_others')).toBe(false);
    expect(hasPermission(perms, 'task:view_internal_comments')).toBe(false);
    expect(hasPermission(perms, 'project:view_rates')).toBe(false);
    expect(hasPermission(perms, 'reports:view_financial')).toBe(false);
    // Allowed client permissions
    expect(hasPermission(perms, 'reports:view_project')).toBe(true);
    expect(hasPermission(perms, 'task:comment')).toBe(true);
  });
});

