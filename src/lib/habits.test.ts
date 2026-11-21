import { describe, expect, it } from 'vitest';
import { completionRate, currentStreak, longestStreak, scheduleLabel, toggleCompletion, habitsForDay } from './habits';
import type { Habit, HabitSchedule } from './types';

const make = (days: string[], schedule: HabitSchedule = { type: 'daily' }, startDate = '2026-11-01'): Habit => ({
  id: 'h', name: 'Test', schedule, startDate, archived: false, createdAt: '2026-11-01T08:00:00.000Z',
  completions: Object.fromEntries(days.map((d) => [d, true])),
});

// 2026-11-21 is a Saturday; 2026-11-16 a Monday.
const TODAY = '2026-11-21';

describe('currentStreak', () => {
  it('counts consecutive days including today', () => {
    expect(currentStreak(make(['2026-11-19', '2026-11-20', '2026-11-21']), TODAY)).toBe(3);
  });
  it('keeps the streak alive when today is not done yet', () => {
    expect(currentStreak(make(['2026-11-19', '2026-11-20']), TODAY)).toBe(2);
  });
  it('breaks on a missed scheduled day', () => {
    expect(currentStreak(make(['2026-11-18', '2026-11-20']), TODAY)).toBe(1);
    expect(currentStreak(make(['2026-11-18', '2026-11-19']), TODAY)).toBe(0);
  });
  it('skips unscheduled days for weekday habits', () => {
    // Mon/Wed/Fri schedule; Sat today is unscheduled.
    const h = make(['2026-11-16', '2026-11-18', '2026-11-20'], { type: 'weekdays', days: [0, 2, 4] });
    expect(currentStreak(h, TODAY)).toBe(3);
  });
  it('ignores completions on unscheduled days', () => {
    const h = make(['2026-11-19', '2026-11-20'], { type: 'weekdays', days: [4] }); // Fri only, Thu is bonus
    expect(currentStreak(h, TODAY)).toBe(1);
  });
  it('does not count before the start date', () => {
    expect(currentStreak(make(['2026-11-20', '2026-11-21'], { type: 'daily' }, '2026-11-20'), TODAY)).toBe(2);
    expect(currentStreak(make([], { type: 'daily' }, TODAY), TODAY)).toBe(0);
  });
});

describe('longestStreak', () => {
  it('finds the longest run in history', () => {
    const h = make(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-06', '2026-11-07']);
    expect(longestStreak(h, TODAY)).toBe(4);
  });
  it('includes an ongoing run', () => {
    expect(longestStreak(make(['2026-11-19', '2026-11-20', '2026-11-21']), TODAY)).toBe(3);
  });
  it('is zero without completions', () => {
    expect(longestStreak(make([]), TODAY)).toBe(0);
  });
});

describe('completionRate', () => {
  it('divides completed by scheduled days and excludes an unfinished today', () => {
    // Nov 15–21: 7 daily days, today (21) not done → 6 counted, 3 done
    const h = make(['2026-11-15', '2026-11-17', '2026-11-19']);
    expect(completionRate(h, '2026-11-15', TODAY, TODAY)).toBeCloseTo(3 / 6);
  });
  it('respects weekday schedules', () => {
    const h = make(['2026-11-16', '2026-11-18'], { type: 'weekdays', days: [0, 2, 4] });
    expect(completionRate(h, '2026-11-16', TODAY, TODAY)).toBeCloseTo(2 / 3);
  });
  it('returns null when nothing was scheduled', () => {
    expect(completionRate(make([], { type: 'daily' }, '2026-12-01'), '2026-11-15', TODAY, TODAY)).toBeNull();
  });
});

describe('completion records', () => {
  it('toggling twice removes the record and never duplicates', () => {
    const h = make([]);
    const once = toggleCompletion(h, TODAY);
    expect(Object.keys(once.completions)).toEqual([TODAY]);
    expect(Object.keys(toggleCompletion(once, TODAY).completions)).toEqual([]);
  });
  it('summarises habits due on a day', () => {
    const a = make([TODAY]);
    const b = { ...make([], { type: 'weekdays', days: [0] }), id: 'b' };
    expect(habitsForDay([a, b], TODAY)).toMatchObject({ done: 1, total: 1 });
  });
  it('labels schedules', () => {
    expect(scheduleLabel({ type: 'daily' })).toBe('Varje dag');
    expect(scheduleLabel({ type: 'weekdays', days: [0, 1, 2, 3, 4] })).toBe('Vardagar');
    expect(scheduleLabel({ type: 'weekdays', days: [0, 2] })).toBe('Mån, Ons');
  });
});
