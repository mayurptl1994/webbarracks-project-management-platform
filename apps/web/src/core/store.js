/**
 * Lightweight reactive Pub/Sub state store for Vanilla JS SPA
 */
class StateStore {
  constructor() {
    this.state = {
      currentUser: null,
      workspace: null,
      workspaceRole: 'owner',
      effectivePermissions: [],
      activeTimer: null,
      presence: [],
      captureActive: false,
      theme: localStorage.getItem('wb_theme') || 'light'
    };
    this.subscribers = new Map();
  }

  getState(key) {
    return key ? this.state[key] : this.state;
  }

  setState(key, value) {
    this.state[key] = value;
    this.notify(key, value);
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
    // Initial emission
    callback(this.state[key]);
    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  notify(key, value) {
    const listeners = this.subscribers.get(key);
    if (listeners) {
      for (const cb of listeners) {
        cb(value);
      }
    }
    // Global wildcard subscribers
    const globalListeners = this.subscribers.get('*');
    if (globalListeners) {
      for (const cb of globalListeners) {
        cb(this.state);
      }
    }
  }

  hasPermission(perm) {
    const list = this.state.effectivePermissions || [];
    return list.includes(perm);
  }
}

export const store = new StateStore();
