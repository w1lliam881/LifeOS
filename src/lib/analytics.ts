import { addDays, rangeKeys, startOfWeek, timestampToKey, type DateKey } from './dates';
import { isScheduled } from './habits';
import type { Habit, LearningSession, Task } from './types';

export interface Bucket {
  key: DateKey;
  label: string;
  value: number;
  /** Optional denominator, e.g. scheduled habits. */
  total?: number;
}

/** Days for short ranges, ISO weeks (Mon-start) for long ranges. */
export function bucketsFor(from: DateKey, to: DateKey): { key: DateKey; days: DateKey[] }[] {
  const days = rangeKeys(from, to);
  if (days.length <= 31) return days.map((d) => ({ key: d, days: [d] }));
  const map = new Map<DateKey, DateKey[]>();
  for (const d of days) {
    const w = startOfWeek(d);
    const list = map.get(w) ?? [];
    list.push(d);
    map.set(w, list);
  }
  return [...map.entries()].map(([key, ds]) => ({ key, days: ds }));
}

export function tasksCompletedPerBucket(tasks: Task[], from: DateKey, to: DateKey) {
  const counts = new Map<DateKey, number>();
  for (const t of tasks) {
    if (!t.completed || !t.completedAt) continue;
    const d = timestampToKey(t.completedAt);
    if (d >= from && d <= to) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return bucketsFor(from, to).map((b) => ({ key: b.key, value: b.days.reduce((s, d) => s + (counts.get(d) ?? 0), 0) }));
}

export function learningPerBucket(sessions: LearningSession[], from: DateKey, to: DateKey) {
  const counts = new Map<DateKey, number>();
  for (const s of sessions) if (s.date >= from && s.date <= to) counts.set(s.date, (counts.get(s.date) ?? 0) + s.minutes);
  return bucketsFor(from, to).map((b) => ({ key: b.key, value: b.days.reduce((s, d) => s + (counts.get(d) ?? 0), 0) }));
}

/** Share of scheduled habit check-ins completed per bucket (ignores today until done). */
export function habitConsistencyPerBucket(habits: Habit[], from: DateKey, to: DateKey, today: DateKey) {
  return bucketsFor(from, to).map((b) => {
    const days = b.days.filter((d) => d <= today);
    let done = 0;
    let total = 0;
    for (const day of days) {
      for (const h of habits) {
        if (h.archived || h.startDate > day) continue;
        if (!isScheduled(h.schedule, day)) continue;
        const completed = h.completions[day] === true;
        if (day === today && !completed) continue;
        total++;
        if (completed) done++;
      }
    }
    return { key: b.key, value: done, total };
  });
}

export interface PeriodSummary {
  tasksCompleted: number;
  tasksCreated: number;
  habitRate: number | null;
  habitCheckins: number;
  learningMinutes: number;
  learningSessions: number;
  journalDays: number;
}

export function summarize(
  data: { tasks: Task[]; habits: Habit[]; sessions: LearningSession[]; journalDates: DateKey[] },
  from: DateKey,
  to: DateKey,
  today: DateKey,
): PeriodSummary {
  const inRange = (d: DateKey) => d >= from && d <= to;
  const habit = habitConsistencyPerBucket(data.habits, from, to, today).reduce(
    (acc, b) => ({ done: acc.done + b.value, total: acc.total + (b.total ?? 0) }),
    { done: 0, total: 0 },
  );
  const sessions = data.sessions.filter((s) => inRange(s.date));
  return {
    tasksCompleted: data.tasks.filter((t) => t.completed && t.completedAt && inRange(timestampToKey(t.completedAt))).length,
    tasksCreated: data.tasks.filter((t) => inRange(timestampToKey(t.createdAt))).length,
    habitRate: habit.total ? habit.done / habit.total : null,
    habitCheckins: habit.done,
    learningMinutes: sessions.reduce((s, x) => s + x.minutes, 0),
    learningSessions: sessions.length,
    journalDays: data.journalDates.filter(inRange).length,
  };
}

export function previousRange(from: DateKey, to: DateKey): [DateKey, DateKey] {
  const len = rangeKeys(from, to).length;
  return [addDays(from, -len), addDays(from, -1)];
}
