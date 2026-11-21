import { startOfWeek, addDays, diffDays, type DateKey } from './dates';
import type { Goal } from './types';

/** Current value. Weekly goals count only this week's logs (Mon–Sun). */
export function goalValue(goal: Goal, today: DateKey): number {
  if (goal.horizon === 'weekly') {
    const from = startOfWeek(today);
    const to = addDays(from, 6);
    return round(goal.logs.filter((l) => l.date >= from && l.date <= to).reduce((s, l) => s + l.amount, 0));
  }
  return round(goal.startValue + goal.logs.reduce((s, l) => s + l.amount, 0));
}

/** 0–1, clamped. A non-positive target counts as 0 progress rather than NaN. */
export function goalProgress(goal: Goal, today: DateKey): number {
  if (!(goal.target > 0)) return 0;
  return Math.min(1, Math.max(0, goalValue(goal, today) / goal.target));
}

export function isGoalComplete(goal: Goal, today: DateKey): boolean {
  return goal.target > 0 && goalValue(goal, today) >= goal.target;
}

export type Pace = 'done' | 'ahead' | 'on-track' | 'behind' | 'overdue' | 'none';

/**
 * Compares progress to elapsed time. Weekly goals use the current week; long
 * goals use the span from creation to deadline.
 */
export function goalPace(goal: Goal, today: DateKey): Pace {
  if (isGoalComplete(goal, today)) return 'done';
  const progress = goalProgress(goal, today);
  let elapsed: number;
  if (goal.horizon === 'weekly') {
    elapsed = (diffDays(startOfWeek(today), today) + 1) / 7;
  } else {
    if (!goal.deadline) return 'none';
    if (today > goal.deadline) return 'overdue';
    const start = goal.createdAt.slice(0, 10);
    const total = Math.max(1, diffDays(start, goal.deadline));
    elapsed = Math.min(1, Math.max(0, diffDays(start, today) / total));
  }
  if (progress >= elapsed + 0.1) return 'ahead';
  if (progress >= elapsed - 0.1) return 'on-track';
  return 'behind';
}

export const PACE_LABEL: Record<Pace, string> = {
  done: 'Klart',
  ahead: 'Före plan',
  'on-track': 'I fas',
  behind: 'Efter plan',
  overdue: 'Deadline passerad',
  none: 'Ingen deadline',
};

/** Running value per log, oldest first — for the history chart. */
export function goalHistory(goal: Goal): { date: DateKey; value: number }[] {
  const logs = [...goal.logs].sort((a, b) => a.date.localeCompare(b.date));
  let v = goal.startValue;
  const byDay = new Map<DateKey, number>();
  for (const l of logs) {
    v += l.amount;
    byDay.set(l.date, round(v));
  }
  return [...byDay.entries()].map(([date, value]) => ({ date, value }));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
