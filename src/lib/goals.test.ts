import { describe, expect, it } from 'vitest';
import { goalHistory, goalPace, goalProgress, goalValue, isGoalComplete } from './goals';
import type { Goal } from './types';

const TODAY = '2026-11-21'; // Saturday; week = Nov 16–22
const goal = (p: Partial<Goal>): Goal => ({
  id: 'g', title: 'Mål', category: 'Hälsa', horizon: 'long', target: 10, unit: 'st', startValue: 0, logs: [], archived: false,
  createdAt: '2026-11-01T08:00:00.000Z', ...p,
});

describe('goal progress', () => {
  it('sums start value and logs for long-term goals', () => {
    const g = goal({ startValue: 2, logs: [{ id: '1', date: '2026-11-05', amount: 3 }, { id: '2', date: '2026-11-10', amount: -1 }] });
    expect(goalValue(g, TODAY)).toBe(4);
    expect(goalProgress(g, TODAY)).toBeCloseTo(0.4);
  });
  it('counts only the current week for weekly goals', () => {
    const g = goal({ horizon: 'weekly', target: 3, logs: [{ id: '1', date: '2026-11-15', amount: 1 }, { id: '2', date: '2026-11-16', amount: 1 }, { id: '3', date: '2026-11-21', amount: 1 }] });
    expect(goalValue(g, TODAY)).toBe(2);
    expect(goalValue(g, '2026-11-23')).toBe(0);
  });
  it('clamps progress and handles bad targets', () => {
    expect(goalProgress(goal({ startValue: 50 }), TODAY)).toBe(1);
    expect(goalProgress(goal({ startValue: -5 }), TODAY)).toBe(0);
    expect(goalProgress(goal({ target: 0, startValue: 3 }), TODAY)).toBe(0);
    expect(isGoalComplete(goal({ startValue: 10 }), TODAY)).toBe(true);
  });
  it('avoids floating point noise', () => {
    expect(goalValue(goal({ logs: [{ id: '1', date: TODAY, amount: 0.1 }, { id: '2', date: TODAY, amount: 0.2 }] }), TODAY)).toBe(0.3);
  });
});

describe('goal pace', () => {
  it('compares progress to elapsed time', () => {
    // Created Nov 1, deadline Dec 1 → ~67% elapsed on Nov 21.
    expect(goalPace(goal({ deadline: '2026-12-01', startValue: 7 }), TODAY)).toBe('on-track');
    expect(goalPace(goal({ deadline: '2026-12-01', startValue: 2 }), TODAY)).toBe('behind');
    expect(goalPace(goal({ deadline: '2026-12-01', startValue: 9 }), TODAY)).toBe('ahead');
    expect(goalPace(goal({ deadline: '2026-11-10' }), TODAY)).toBe('overdue');
    expect(goalPace(goal({}), TODAY)).toBe('none');
    expect(goalPace(goal({ startValue: 10 }), TODAY)).toBe('done');
  });
});

describe('goal history', () => {
  it('builds a running total per day', () => {
    const g = goal({ startValue: 1, logs: [{ id: '2', date: '2026-11-10', amount: 2 }, { id: '1', date: '2026-11-05', amount: 1 }, { id: '3', date: '2026-11-10', amount: 1 }] });
    expect(goalHistory(g)).toEqual([{ date: '2026-11-05', value: 2 }, { date: '2026-11-10', value: 5 }]);
  });
});
