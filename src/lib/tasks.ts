import { addDays, diffDays, timestampToKey, weekdayIndex, type DateKey } from './dates';
import type { Priority, Task, TaskStatus } from './types';

export const PRIORITY_LABEL: Record<Priority, string> = { high: 'Hög', medium: 'Medel', low: 'Låg' };
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Status is derived from the due date so it can never drift out of sync:
 * overdue and due-today tasks are "today", future and undated are "upcoming".
 */
export function taskStatus(task: Task, today: DateKey): TaskStatus {
  if (task.completed) return 'completed';
  if (task.dueDate && task.dueDate <= today) return 'today';
  return 'upcoming';
}

export function isOverdue(task: Task, today: DateKey): boolean {
  return !task.completed && !!task.dueDate && task.dueDate < today;
}

export type DateFilter = 'all' | 'overdue' | 'today' | 'week' | 'nodate';

export interface TaskFilter {
  status?: TaskStatus | 'all' | 'open';
  priority?: Priority | 'all';
  date?: DateFilter;
  project?: string | 'all';
  query?: string;
}

export function filterTasks(tasks: Task[], filter: TaskFilter, today: DateKey): Task[] {
  const q = filter.query?.trim().toLowerCase();
  return tasks.filter((t) => {
    const status = taskStatus(t, today);
    if (filter.status && filter.status !== 'all') {
      if (filter.status === 'open' ? t.completed : status !== filter.status) return false;
    }
    if (filter.priority && filter.priority !== 'all' && t.priority !== filter.priority) return false;
    if (filter.project && filter.project !== 'all' && (t.project ?? '') !== filter.project) return false;
    if (filter.date && filter.date !== 'all') {
      const d = t.dueDate;
      switch (filter.date) {
        case 'overdue':
          if (!isOverdue(t, today)) return false;
          break;
        case 'today':
          if (d !== today) return false;
          break;
        case 'week':
          if (!d || diffDays(today, d) < 0 || diffDays(today, d) > 6) return false;
          break;
        case 'nodate':
          if (d) return false;
          break;
      }
    }
    if (q) {
      const hay = `${t.title} ${t.description ?? ''} ${t.project ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Open tasks first; then by due date (overdue → today → future → undated),
 * then priority, then creation order. Completed tasks: most recent first.
 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.completed && b.completed) return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
    if (a.dueDate !== b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p !== 0) return p;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Tasks relevant for a given day: due that day/overdue, or completed that day. */
export function tasksForDay(tasks: Task[], day: DateKey): { open: Task[]; done: Task[] } {
  const open: Task[] = [];
  const done: Task[] = [];
  for (const t of tasks) {
    if (t.completed) {
      if (t.completedAt && timestampToKey(t.completedAt) === day && (t.dueDate ? t.dueDate <= day : true)) done.push(t);
    } else if (t.dueDate && t.dueDate <= day) {
      open.push(t);
    }
  }
  return { open: sortTasks(open), done };
}

export function completionPercent(open: number, done: number): number {
  const total = open + done;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function projectsOf(tasks: Task[]): string[] {
  return [...new Set(tasks.map((t) => t.project).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, 'sv'));
}

/** Groups open tasks into the sections shown in the list. */
export function groupOpenTasks(tasks: Task[], today: DateKey) {
  const groups = { overdue: [] as Task[], today: [] as Task[], tomorrow: [] as Task[], later: [] as Task[], someday: [] as Task[] };
  for (const t of sortTasks(tasks)) {
    if (t.completed) continue;
    if (!t.dueDate) groups.someday.push(t);
    else if (t.dueDate < today) groups.overdue.push(t);
    else if (t.dueDate === today) groups.today.push(t);
    else if (diffDays(today, t.dueDate) === 1) groups.tomorrow.push(t);
    else groups.later.push(t);
  }
  return groups;
}

const WEEKDAY_WORDS = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];

/**
 * Quick-add parsing: "Ring tandläkaren imorgon !" → title "Ring tandläkaren",
 * due tomorrow, high priority. Supports idag, imorgon, i övermorgon and
 * weekday names (next occurrence). "!" = high priority. "#projekt" = project.
 */
export function parseQuickTask(input: string, today: DateKey, defaultDue?: DateKey): { title: string; dueDate?: DateKey; priority: Priority; project?: string } {
  let text = ` ${input.trim()} `;
  let dueDate = defaultDue;
  let priority: Priority = 'medium';
  let project: string | undefined;

  if (/\s!+(?=\s)/.test(text)) {
    priority = 'high';
    text = text.replace(/\s!+(?=\s)/g, ' ');
  }
  const tag = text.match(/\s#([\p{L}\p{N}_-]+)(?=\s)/u);
  if (tag) {
    project = tag[1]!.charAt(0).toUpperCase() + tag[1]!.slice(1);
    text = text.replace(tag[0], ' ');
  }
  const rules: [RegExp, () => DateKey | undefined][] = [
    [/\si\s?övermorgon(?=\s)/i, () => addDays(today, 2)],
    [/\si\s?morgon(?=\s)/i, () => addDays(today, 1)],
    [/\sidag(?=\s)/i, () => today],
    [/\s(någon gång|nångång)(?=\s)/i, () => undefined],
  ];
  for (const [re, value] of rules) {
    if (re.test(text)) {
      dueDate = value();
      text = text.replace(re, ' ');
      break;
    }
  }
  const wd = new RegExp(`\\s(på\\s)?(${WEEKDAY_WORDS.join('|')})(?=\\s)`, 'i');
  const m = text.match(wd);
  if (m) {
    const target = WEEKDAY_WORDS.indexOf(m[2]!.toLowerCase());
    const current = weekdayIndex(today);
    const delta = ((target - current + 7) % 7) || 7;
    dueDate = addDays(today, delta);
    text = text.replace(m[0], ' ');
  }
  const title = text.replace(/\s+/g, ' ').trim();
  return { title: title || input.trim(), dueDate, priority, project };
}
