import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { db } from '../db/store.js';

interface ClientMeta {
  ws: WebSocket;
  userId?: string;
}

class WsBroadcaster {
  private wss: WebSocketServer | null = null;
  private clients: Set<ClientMeta> = new Set();

  init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientMeta: ClientMeta = { ws };
      this.clients.add(clientMeta);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'auth') {
            clientMeta.userId = data.userId;
            this.sendPresence(ws);
          } else if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // ignore
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientMeta);
      });

      ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
      this.sendPresence(ws);
    });

    console.log('[WebSocket] Server initialized on /ws');
  }

  broadcast(event: string, payload: unknown) {
    const msg = JSON.stringify({ type: event, payload, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }

  sendPresence(targetWs?: WebSocket) {
    const now = Date.now();
    const activeSessions = (db.trackingSessions || []).filter((s) => s.status === 'active');
    const presenceList = activeSessions.map((s) => {
      const user = db.getUserById(s.user_id);
      const elapsed = Math.floor((now - new Date(s.started_at).getTime()) / 1000) + s.duration_seconds;

      return {
        sessionId: s.id,
        userId: s.user_id,
        userName: user?.full_name || 'Team Member',
        userEmail: user?.email,
        targetName: s.target_name,
        targetCategory: s.target_category,
        startedAt: s.started_at,
        elapsedSeconds: Math.max(0, elapsed)
      };
    });

    const msg = JSON.stringify({ type: 'presence.update', payload: presenceList, timestamp: new Date().toISOString() });

    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(msg);
    } else {
      for (const client of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(msg);
        }
      }
    }
  }
}

export const wsManager = new WsBroadcaster();
