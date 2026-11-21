import { addDays, diffDays, rangeKeys, weekdayIndex, WEEKDAYS_SHORT, type DateKey } from './dates';
import type { Habit, HabitSchedule } from './types';

export function isScheduled(schedule: HabitSchedule, day: DateKey): boolean {
  return schedule.type === 'daily' || schedule.days.includes(weekdayIndex(day));
}

export function isDone(habit: Habit, day: DateKey): boolean {
  return habit.completions[day] === true;
}

export function scheduleLabel(schedule: HabitSchedule): string {
  if (schedule.type === 'daily' || schedule.days.length === 7) return 'Varje dag';
  const days = [...schedule.days].sort();
  if (days.join() === '0,1,2,3,4') return 'Vardagar';
  if (days.join() === '5,6') return 'Helger';
  return days.map((d) => WEEKDAYS_SHORT[d]).join(', ');
}

/**
 * Current streak = consecutive scheduled days completed, counting back from
 * today. Unscheduled days are skipped (they neither break nor extend a
 * streak). If today is scheduled but not yet done the streak is still alive
 * — the day isn't over — so counting starts from the previous scheduled day.
 * Completions on unscheduled days are bonus and don't count.
 */
export function currentStreak(habit: Habit, today: DateKey): number {
  let streak = 0;
  let day = today;
  let first = true;
  // Guard: never walk further back than the start date.
  while (day >= habit.startDate) {
    if (isScheduled(habit.schedule, day)) {
      if (isDone(habit, day)) streak++;
      else if (!(first && day === today)) break;
      first = false;
    }
    day = addDays(day, -1);
  }
  return streak;
}

export function longestStreak(habit: Habit, today: DateKey): number {
  let best = 0;
  let run = 0;
  for (const day of rangeKeys(habit.startDate, today)) {
    if (!isScheduled(habit.schedule, day)) continue;
    if (isDone(habit, day)) {
      run++;
      best = Math.max(best, run);
    } else if (day !== today) {
      run = 0;
    }
  }
  return best;
}

/**
 * Completion rate over [from, to]: completed scheduled days / scheduled days.
 * Days before the habit's start, and today if not yet completed, are excluded
 * so a fresh morning doesn't look like a failure. Returns null when nothing
 * was scheduled in the window.
 */
export function completionRate(habit: Habit, from: DateKey, to: DateKey, today: DateKey): number | null {
  const start = from < habit.startDate ? habit.startDate : from;
  const end = to > today ? today : to;
  if (end < start) return null;
  let scheduled = 0;
  let done = 0;
  for (const day of rangeKeys(start, end)) {
    if (!isScheduled(habit.schedule, day)) continue;
    const completed = isDone(habit, day);
    if (day === today && !completed) continue;
    scheduled++;
    if (completed) done++;
  }
  return scheduled === 0 ? null : done / scheduled;
}

/** Habits due on a given day, with completion. */
export function habitsForDay(habits: Habit[], day: DateKey) {
  const due = habits.filter((h) => !h.archived && h.startDate <= day && isScheduled(h.schedule, day));
  const done = due.filter((h) => isDone(h, day)).length;
  return { due, done, total: due.length };
}

/** Per-day share of scheduled habits completed (null = nothing scheduled). */
export function dailyConsistency(habits: Habit[], days: DateKey[]): { day: DateKey; rate: number | null }[] {
  return days.map((day) => {
    const { done, total } = habitsForDay(habits, day);
    return { day, rate: total ? done / total : null };
  });
}

export function toggleCompletion(habit: Habit, day: DateKey): Habit {
  const completions = { ...habit.completions };
  if (completions[day]) delete completions[day];
  else completions[day] = true;
  return { ...habit, completions };
}

export function daysSinceStart(habit: Habit, today: DateKey): number {
  return diffDays(habit.startDate, today) + 1;
}
