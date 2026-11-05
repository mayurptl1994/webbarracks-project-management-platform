import { store } from './store.js';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.reconnectTimer = null;
  }

  connect() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[WS] Connected to live updates');
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
        console.log('[WS] Disconnected, attempting reconnect in 3s...');
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
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
      // Refresh current user active timer if relevant
      const currentUser = store.getState('currentUser');
      if (msg.payload?.entry?.user_id === currentUser?.id) {
        if (msg.type === 'timer.stopped') {
          store.setState('activeTimer', null);
        } else {
          store.setState('activeTimer', msg.payload.entry);
        }
      }
    }
  }
}

export const wsClient = new WebSocketClient();

