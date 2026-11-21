import { describe, expect, it } from 'vitest';
import { exportJson, parseData } from './storage';
import { sampleData, withoutSampleData, hasSampleData } from './sample';

describe('import / export', () => {
  it('round-trips exported data', () => {
    const data = sampleData(new Date(2026, 10, 21, 12));
    const result = parseData(JSON.parse(exportJson(data)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dropped).toBe(0);
      expect(result.data.tasks).toHaveLength(data.tasks.length);
      expect(result.data.habits[0]?.completions).toEqual(data.habits[0]?.completions);
    }
  });
  it('rejects unrelated files', () => {
    expect(parseData('hello').ok).toBe(false);
    expect(parseData({ foo: 1 }).ok).toBe(false);
    expect(parseData({ version: 99, tasks: [] }).ok).toBe(false);
  });
  it('drops invalid items but keeps valid ones', () => {
    const result = parseData({
      tasks: [{ id: 'a', title: 'Ok', priority: 'urgent', dueDate: '2026-13-01' }, { id: 'b' }, 'x'],
      habits: [{ id: 'h', name: 'Vana', schedule: { type: 'weekdays', days: [1, 1, 9] }, completions: { '2026-11-20': true, bad: true, '2026-11-21': 'yes' } }],
      sessions: [{ id: 's', subjectId: 'missing', date: '2026-11-21', minutes: 10 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dropped).toBe(3);
    expect(result.data.tasks[0]).toMatchObject({ title: 'Ok', priority: 'medium', dueDate: undefined });
    expect(result.data.habits[0]?.schedule).toEqual({ type: 'weekdays', days: [1] });
    expect(Object.keys(result.data.habits[0]?.completions ?? {})).toEqual(['2026-11-20']);
  });
});

describe('sample data', () => {
  it('can be removed completely', () => {
    const data = sampleData(new Date(2026, 10, 21, 12));
    expect(hasSampleData(data)).toBe(true);
    const own = { ...data, tasks: [...data.tasks, { id: 'mine', title: 'Min', priority: 'low' as const, completed: false, createdAt: new Date().toISOString() }] };
    const cleaned = withoutSampleData(own);
    expect(hasSampleData(cleaned)).toBe(false);
    expect(cleaned.tasks.map((t) => t.id)).toEqual(['mine']);
  });
});
