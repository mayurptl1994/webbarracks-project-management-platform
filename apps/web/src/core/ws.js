import { store } from './store.js';
import { localDb } from './local-db.js';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.reconnectTimer = null;
    this.setupLocalSync();
  }

  setupLocalSync() {
    // Cross-tab synchronization
    window.addEventListener('storage', (e) => {
      if (e.key === 'wb_db_active_timer') {
        const active = localDb.getActiveTimer();
        store.setState('activeSession', active);
        store.setState('activeTimer', active);
      }
    });

    // Same-window custom event synchronization
    window.addEventListener('wb-local-storage-sync', (e) => {
      if (e.detail?.key === 'wb_db_active_timer') {
        const active = localDb.getActiveTimer();
        store.setState('activeSession', active);
        store.setState('activeTimer', active);
      }
    });
  }

  connect() {
    const wsUrl = import.meta.env.VITE_WS_URL;
    // If no explicit external WS URL is specified, run purely in client-side mode
    if (!wsUrl) {
      console.log('[App] Running in 100% Standalone Local Browser Storage Mode');
      return;
    }

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        const user = store.getState('currentUser');
        const ws = store.getState('workspace');
        if (user && ws) {
          this.send('auth', { userId: user.id, workspaceId: ws.id });
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          // ignore
        }
      };

      this.socket.onclose = () => {
        // Silently skip retry if offline
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch {
      // Standalone mode
    }
  }

  send(type, payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, ...payload }));
    }
  }

  handleMessage(msg) {
    if (msg.type === 'presence.update') {
      store.setState('presence', msg.payload);
    } else if (msg.type === 'timer.started' || msg.type === 'timer.stopped') {
      const currentUser = store.getState('currentUser');
      if (msg.payload?.entry?.user_id === currentUser?.id) {
        if (msg.type === 'timer.stopped') {
          store.setState('activeTimer', null);
          store.setState('activeSession', null);
        } else {
          store.setState('activeTimer', msg.payload.entry);
          store.setState('activeSession', msg.payload.entry);
        }
      }
    }
  }
}

export const wsClient = new WebSocketClient();
