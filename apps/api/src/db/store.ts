import { randomUUID } from 'crypto';

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  full_name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  avatar_url?: string | null;
  assigned_targets: string[]; // specific points/projects user is authorized to track
  tracking_permissions: {
    can_track: boolean;
    screenshots_enabled: boolean;
    screenshot_interval_minutes: number;
    allow_user_delete: boolean;
  };
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingSession {
  id: string;
  user_id: string;
  target_name: string; // point/target selected
  target_category: string;
  started_at: string;
  paused_at?: string | null;
  ended_at?: string | null;
  duration_seconds: number;
  status: 'active' | 'paused' | 'completed';
  authorized_monitoring: boolean;
  notes?: string | null;
  created_at: string;
}

export interface ScreenshotRecord {
  id: string;
  session_id: string;
  user_id: string;
  user_name: string;
  target_name: string;
  taken_at: string;
  storage_path: string;
  activity_percent: number;
  app_name?: string | null;
  window_title?: string | null;
  created_at: string;
}

export interface AuditRecord {
  id: string;
  action: string; // e.g. "CONTENT.UPDATE", "ADMIN.LOGIN", "SESSION.START"
  actor: string;  // email
  ip_address: string;
  time: string;
  details?: Record<string, unknown>;
  created_at: string;
}

// Initial Admin and Users
const defaultUsers: UserAccount[] = [
  {
    id: 'user-admin-1',
    email: 'webbarracks@gmail.com',
    passwordHash: 'admin123',
    full_name: 'WebBarracs Super Admin',
    role: 'admin',
    is_active: true,
    avatar_url: null,
    assigned_targets: ['Web Barracks Login Branding Studio', 'Web Barracks Speed Engine for WordPress', 'Platform Architecture', 'Core CMS Updates'],
    tracking_permissions: {
      can_track: true,
      screenshots_enabled: true,
      screenshot_interval_minutes: 5,
      allow_user_delete: true
    },
    last_login_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'user-regular-1',
    email: 'elena.dev@webbarracks.dev',
    passwordHash: 'user123',
    full_name: 'Elena Rostova',
    role: 'user',
    is_active: true,
    avatar_url: null,
    assigned_targets: ['Web Barracks Login Branding Studio', 'Client Portal UI Module'],
    tracking_permissions: {
      can_track: true,
      screenshots_enabled: true,
      screenshot_interval_minutes: 5,
      allow_user_delete: true
    },
    last_login_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    created_at: '2025-01-10T00:00:00.000Z',
    updated_at: '2025-01-10T00:00:00.000Z'
  },
  {
    id: 'user-regular-2',
    email: 'alex.mercer@webbarracks.dev',
    passwordHash: 'user123',
    full_name: 'Alex Mercer',
    role: 'user',
    is_active: true,
    avatar_url: null,
    assigned_targets: ['Web Barracks Speed Engine for WordPress', 'API Server Optimization'],
    tracking_permissions: {
      can_track: true,
      screenshots_enabled: true,
      screenshot_interval_minutes: 10,
      allow_user_delete: true
    },
    last_login_at: new Date(Date.now() - 172800 * 1000).toISOString(),
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2025-01-15T00:00:00.000Z'
  }
];

const defaultAuditLogs: AuditRecord[] = [
  {
    id: 'audit-1',
    action: 'CONTENT.UPDATE',
    actor: 'webbarracks@gmail.com',
    ip_address: '10.25.162.12',
    time: '13:11 5 Nov',
    created_at: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    id: 'audit-2',
    action: 'CONTENT.UPDATE',
    actor: 'webbarracks@gmail.com',
    ip_address: '10.31.96.80',
    time: '13:11 5 Nov',
    created_at: new Date(Date.now() - 30 * 60000).toISOString()
  },
  {
    id: 'audit-3',
    action: 'ADMIN.LOGIN',
    actor: 'webbarracks@gmail.com',
    ip_address: '103.240.78.142',
    time: '12:55 5 Nov',
    created_at: new Date(Date.now() - 60 * 60000).toISOString()
  },
  {
    id: 'audit-4',
    action: 'PRODUCTS.UPDATE',
    actor: 'webbarracks@gmail.com',
    ip_address: '10.27.210.178',
    time: '12:43 5 Nov',
    created_at: new Date(Date.now() - 75 * 60000).toISOString()
  },
  {
    id: 'audit-5',
    action: 'PRODUCTS.UPDATE',
    actor: 'webbarracks@gmail.com',
    ip_address: '10.27.210.178',
    time: '10:51 5 Nov',
    created_at: new Date(Date.now() - 180 * 60000).toISOString()
  },
  {
    id: 'audit-6',
    action: 'PRODUCTS.UPDATE',
    actor: 'webbarracks@gmail.com',
    ip_address: '10.31.96.80',
    time: '10:11 5 Nov',
    created_at: new Date(Date.now() - 240 * 60000).toISOString()
  }
];

const defaultCatalog = [
  {
    id: 'cat-1',
    title: 'Web Barracks Login Branding Studio',
    version: 'v1.0.0',
    status: 'PUBLISHED',
    price_range: '$0 - $0'
  },
  {
    id: 'cat-2',
    title: 'Web Barracks Speed Engine for WordPress',
    version: 'v1.0.0',
    status: 'PUBLISHED',
    price_range: '$0 - $0'
  }
];

export class SystemStore {
  users: UserAccount[] = [...defaultUsers];
  trackingSessions: TrackingSession[] = [];
  screenshots: ScreenshotRecord[] = [];
  auditLogs: AuditRecord[] = [...defaultAuditLogs];
  catalog = [...defaultCatalog];

  // User Management
  getUserById(id: string) {
    return this.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(data: {
    email: string;
    full_name: string;
    role: 'admin' | 'user';
    password?: string;
    assigned_targets?: string[];
    tracking_permissions?: Partial<UserAccount['tracking_permissions']>;
  }) {
    const existing = this.getUserByEmail(data.email);
    if (existing) {
      throw new Error('A user with this email already exists.');
    }

    const generatedPassword = data.password || Math.random().toString(36).slice(-8) + 'A1!';
    const user: UserAccount = {
      id: randomUUID(),
      email: data.email,
      passwordHash: generatedPassword,
      full_name: data.full_name,
      role: data.role,
      is_active: true,
      avatar_url: null,
      assigned_targets: data.assigned_targets || ['Web Barracks Login Branding Studio'],
      tracking_permissions: {
        can_track: true,
        screenshots_enabled: true,
        screenshot_interval_minutes: 10,
        allow_user_delete: true,
        ...(data.tracking_permissions || {})
      },
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.users.push(user);
    this.addAuditLog('USER.CREATE', 'webbarracks@gmail.com', `Created user ${user.email} (${user.role})`);
    return { user, temporaryPassword: generatedPassword };
  }

  updateUser(id: string, patch: Partial<UserAccount>) {
    const user = this.getUserById(id);
    if (!user) throw new Error('User not found.');
    Object.assign(user, patch, { updated_at: new Date().toISOString() });
    this.addAuditLog('USER.UPDATE', 'webbarracks@gmail.com', `Updated user ${user.email}`);
    return user;
  }

  deleteUser(id: string) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found.');
    const user = this.users[index];
    if (user.role === 'admin' && this.users.filter((u) => u.role === 'admin').length <= 1) {
      throw new Error('Cannot delete the primary administrator.');
    }
    this.users.splice(index, 1);
    this.addAuditLog('USER.DELETE', 'webbarracks@gmail.com', `Deleted user ${user.email}`);
    return true;
  }

  resetPassword(id: string) {
    const user = this.getUserById(id);
    if (!user) throw new Error('User not found.');
    const newPassword = Math.random().toString(36).slice(-8) + 'X9!';
    user.passwordHash = newPassword;
    user.updated_at = new Date().toISOString();
    this.addAuditLog('USER.PASSWORD_RESET', 'webbarracks@gmail.com', `Reset password for ${user.email}`);
    return newPassword;
  }

  // Tracking Sessions
  getActiveSession(userId: string) {
    return this.trackingSessions.find(
      (s) => s.user_id === userId && (s.status === 'active' || s.status === 'paused')
    );
  }

  startSession(userId: string, targetName: string, category = 'Client Project') {
    const existing = this.getActiveSession(userId);
    if (existing) {
      this.stopSession(userId);
    }

    const session: TrackingSession = {
      id: randomUUID(),
      user_id: userId,
      target_name: targetName,
      target_category: category,
      started_at: new Date().toISOString(),
      duration_seconds: 0,
      status: 'active',
      authorized_monitoring: true,
      created_at: new Date().toISOString()
    };

    this.trackingSessions.push(session);
    const user = this.getUserById(userId);
    this.addAuditLog('SESSION.START', user?.email || 'user', `Started session on ${targetName}`);
    return session;
  }

  pauseSession(userId: string) {
    const session = this.getActiveSession(userId);
    if (!session || session.status !== 'active') return null;

    const now = Date.now();
    const elapsed = Math.floor((now - new Date(session.started_at).getTime()) / 1000);
    session.duration_seconds += elapsed;
    session.status = 'paused';
    session.paused_at = new Date().toISOString();
    return session;
  }

  resumeSession(userId: string) {
    const session = this.getActiveSession(userId);
    if (!session || session.status !== 'paused') return null;

    session.status = 'active';
    session.started_at = new Date().toISOString();
    session.paused_at = null;
    return session;
  }

  stopSession(userId: string) {
    const session = this.getActiveSession(userId);
    if (!session) return null;

    if (session.status === 'active') {
      const now = Date.now();
      const elapsed = Math.floor((now - new Date(session.started_at).getTime()) / 1000);
      session.duration_seconds += elapsed;
    }

    session.ended_at = new Date().toISOString();
    session.status = 'completed';
    const user = this.getUserById(userId);
    this.addAuditLog('SESSION.STOP', user?.email || 'user', `Stopped session (${session.duration_seconds}s)`);
    return session;
  }

  addScreenshot(data: Omit<ScreenshotRecord, 'id' | 'created_at'>) {
    const record: ScreenshotRecord = {
      ...data,
      id: randomUUID(),
      created_at: new Date().toISOString()
    };
    this.screenshots.unshift(record);
    return record;
  }

  deleteScreenshot(id: string) {
    const idx = this.screenshots.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.screenshots.splice(idx, 1);
    return true;
  }

  addAuditLog(action: string, actor: string, detailMsg?: string) {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString('en', { month: 'short' });
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const log: AuditRecord = {
      id: randomUUID(),
      action,
      actor,
      ip_address: '10.25.162.12',
      time: `${hours}:${minutes} ${day} ${month}`,
      details: detailMsg ? { message: detailMsg } : {},
      created_at: now.toISOString()
    };

    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 100) this.auditLogs.pop();
    return log;
  }
}

export const db = new SystemStore();
