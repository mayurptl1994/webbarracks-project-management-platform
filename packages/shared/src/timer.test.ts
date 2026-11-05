import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseStore } from '../../../apps/api/src/db/store.ts';

describe('Timer Engine & Multi-User Business Rules', () => {
  let db: DatabaseStore;

  beforeEach(() => {
    db = new DatabaseStore();
  });

  it('Allows a user to start a timer and correctly snapshots their bill/cost rates', () => {
    const userId = '44444444-4444-4444-4444-444444444444'; // Elena Dev
    const result = db.startTimer({
      workspace_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      task_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      user_id: userId,
      billable: true
    });

    expect(result.entry).toBeDefined();
    expect(result.entry.ended_at).toBeNull();
    expect(result.entry.hourly_rate_snapshot).toBe(110.0);
    expect(result.entry.cost_rate_snapshot).toBe(60.0);
  });

  it('Enforces strictly ONE active timer per user globally (rejects second timer without switch)', () => {
    const userId = '44444444-4444-4444-4444-444444444444';
    db.startTimer({
      workspace_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      task_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      user_id: userId
    });

    // Starting another on different task without switch_active should fail
    expect(() => {
      db.startTimer({
        workspace_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        task_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        user_id: userId,
        switch_active: false
      });
    }).toThrow(/already running/);
  });

  it('Automatically stops previous timer when switch_active is true', () => {
    const userId = '44444444-4444-4444-4444-444444444444';
    const first = db.startTimer({
      workspace_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      task_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      user_id: userId
    });

    const second = db.startTimer({
      workspace_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      task_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      user_id: userId,
      switch_active: true
    });

    expect(second.stoppedPrevious).toBeDefined();
    expect(second.stoppedPrevious?.id).toBe(first.entry.id);
    expect(second.stoppedPrevious?.ended_at).not.toBeNull();
    expect(second.entry.ended_at).toBeNull();
  });

  it('Supports MULTIPLE users tracking the EXACT SAME task at the same time independently', () => {
    const userElena = '44444444-4444-4444-4444-444444444444';
    const userLiam = '55555555-5555-5555-5555-555555555555';
    const taskId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

    const t1 = db.startTimer({
      workspace_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      task_id: taskId,
      user_id: userElena
    });

    const t2 = db.startTimer({
      workspace_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      task_id: taskId,
      user_id: userLiam
    });

    expect(t1.entry.user_id).toBe(userElena);
    expect(t2.entry.user_id).toBe(userLiam);
    expect(t1.entry.task_id).toBe(taskId);
    expect(t2.entry.task_id).toBe(taskId);
    expect(t1.entry.ended_at).toBeNull();
    expect(t2.entry.ended_at).toBeNull();
  });
});
