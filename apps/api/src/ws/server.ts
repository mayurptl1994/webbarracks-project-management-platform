import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { db } from '../db/store.js';

interface ClientMeta {
  ws: WebSocket;
  userId?: string;
  workspaceId?: string;
}

class WsBroadcaster {
  private wss: WebSocketServer | null = null;
  private clients: Set<ClientMeta> = new Set();

  init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientMeta: ClientMeta = { ws };
      this.clients.add(clientMeta);

      // Heartbeat
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'auth') {
            clientMeta.userId = data.userId;
            clientMeta.workspaceId = data.workspaceId;
            // Send current presence snapshot immediately
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

      // Send initial welcome & presence
      ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
      this.sendPresence(ws);
    });

    console.log('[WebSocket] Server initialized on /ws');
  }

  broadcast(event: string, payload: unknown, filterWorkspaceId?: string) {
    const msg = JSON.stringify({ type: event, payload, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!filterWorkspaceId || !client.workspaceId || client.workspaceId === filterWorkspaceId) {
          client.ws.send(msg);
        }
      }
    }
  }

  sendPresence(targetWs?: WebSocket) {
    // Collect active timers across all users
    const now = Date.now();
    const activeEntries = db.timeEntries.filter((entry) => entry.ended_at === null);
    const presenceList = activeEntries.map((entry) => {
      const user = db.getUserById(entry.user_id);
      const task = db.tasks.find((t) => t.id === entry.task_id);
      const project = db.projects.find((p) => p.id === entry.project_id);
      const elapsed = Math.floor((now - new Date(entry.started_at).getTime()) / 1000);

      return {
        user_id: entry.user_id,
        full_name: user?.full_name || 'Team Member',
        avatar_url: user?.avatar_url,
        task_id: entry.task_id,
        task_title: task?.title || 'Unknown Task',
        task_key: task?.key || '',
        project_id: entry.project_id,
        project_name: project?.name || 'Unknown Project',
        project_color: project?.color || '#2563eb',
        started_at: entry.started_at,
        elapsed_seconds: Math.max(0, elapsed)
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
