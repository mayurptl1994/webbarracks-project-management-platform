import cron from 'node-cron';
import { db } from '../db/store.js';
import { wsManager } from '../ws/server.js';

export function startCronJobs() {
  // Check every hour for forgotten timers running over 12 hours
  cron.schedule('0 * * * *', () => {
    const now = Date.now();
    const maxDurationSeconds = 12 * 3600; // 12 hours

    for (const entry of db.timeEntries) {
      if (entry.ended_at === null) {
        const elapsed = Math.floor((now - new Date(entry.started_at).getTime()) / 1000);
        if (elapsed > maxDurationSeconds) {
          entry.ended_at = new Date(new Date(entry.started_at).getTime() + maxDurationSeconds * 1000).toISOString();
          entry.duration_seconds = maxDurationSeconds;
          entry.note = (entry.note ? entry.note + ' ' : '') + '[Auto-stopped: Exceeded 12h threshold]';
          entry.updated_at = new Date().toISOString();

          console.log(`[CRON] Auto-stopped forgotten timer ${entry.id} for user ${entry.user_id}`);
          wsManager.broadcast('timer.stopped', { entry, reason: 'auto_stopped_12h' }, entry.workspace_id);
        }
      }
    }
  });

  console.log('[CRON] Background maintenance jobs registered.');
}

