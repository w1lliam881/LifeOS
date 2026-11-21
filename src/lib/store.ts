import { useSyncExternalStore } from 'react';
import { todayKey, type DateKey } from './dates';
import { uid } from './id';
import { sampleData, withoutSampleData } from './sample';
import { loadData, saveData, STORAGE_KEY, emptyData } from './storage';
import { toggleCompletion } from './habits';
import type { AppData, Goal, Habit, JournalEntry, LearningSession, Subject, Task, Topic } from './types';

/**
 * A tiny external store. Components subscribe to slices via useData(selector),
 * so a change to tasks doesn't re-render the journal. Writes are batched to
 * localStorage on the next tick and flushed when the page is hidden.
 */

type Listener = () => void;

let state: AppData = loadData() ?? sampleData();
const listeners = new Set<Listener>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saveErrorHandler: ((msg: string) => void) | undefined;

function emit() {
  for (const l of listeners) l();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 200);
}

export function flush() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const result = saveData(state);
  if (!result.ok) saveErrorHandler?.(result.error);
}

export function onSaveError(handler: (msg: string) => void) {
  saveErrorHandler = handler;
}

if (typeof window !== 'undefined') {
  // Make sure first-visit sample data is persisted too.
  if (!localStorage.getItem(STORAGE_KEY)) scheduleSave();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && saveTimer) flush();
  });
  // Keep multiple open tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const next = loadData();
    if (next) {
      state = next;
      emit();
    }
  });
}

function setState(updater: (s: AppData) => AppData) {
  state = updater(state);
  emit();
  scheduleSave();
}

export function getState(): AppData {
  return state;
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useData<T>(selector: (s: AppData) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

const now = () => new Date().toISOString();
/** Editing a sample item makes it the user's own (kept when samples are removed). */
const own = <T extends { sample?: boolean }>(x: T): T => {
  if (!x.sample) return x;
  const copy = { ...x };
  delete copy.sample;
  return copy;
};

const replace = <T extends { id: string }>(list: T[], id: string, fn: (x: T) => T) => list.map((x) => (x.id === id ? fn(x) : x));

// ---------- Tasks ----------

export type TaskInput = Pick<Task, 'title' | 'priority'> & Partial<Pick<Task, 'description' | 'dueDate' | 'project'>>;

export const tasks = {
  add(input: TaskInput): Task {
    const task: Task = { id: uid(), completed: false, createdAt: now(), ...clean(input) };
    setState((s) => ({ ...s, tasks: [...s.tasks, task] }));
    return task;
  },
  update(id: string, patch: Partial<Task>) {
    setState((s) => ({ ...s, tasks: replace(s.tasks, id, (t) => own({ ...t, ...patch })) }));
  },
  toggle(id: string) {
    setState((s) => ({
      ...s,
      tasks: replace(s.tasks, id, (t) => (t.completed ? { ...t, completed: false, completedAt: undefined } : { ...t, completed: true, completedAt: now() })),
    }));
  },
  toggleFocus(id: string, day: DateKey = todayKey()) {
    setState((s) => ({ ...s, tasks: replace(s.tasks, id, (t) => ({ ...t, focusDate: t.focusDate === day ? undefined : day, dueDate: t.focusDate === day ? t.dueDate : t.dueDate && t.dueDate <= day ? t.dueDate : day })) }));
  },
  remove(id: string): Task | undefined {
    const task = state.tasks.find((t) => t.id === id);
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
    return task;
  },
  restore(task: Task) {
    setState((s) => (s.tasks.some((t) => t.id === task.id) ? s : { ...s, tasks: [...s.tasks, task] }));
  },
  clearCompleted(): Task[] {
    const removed = state.tasks.filter((t) => t.completed);
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => !t.completed) }));
    return removed;
  },
  restoreMany(list: Task[]) {
    setState((s) => {
      const ids = new Set(s.tasks.map((t) => t.id));
      return { ...s, tasks: [...s.tasks, ...list.filter((t) => !ids.has(t.id))] };
    });
  },
};

// ---------- Goals ----------

export type GoalInput = Pick<Goal, 'title' | 'category' | 'horizon' | 'target' | 'unit' | 'startValue'> & Partial<Pick<Goal, 'description' | 'deadline'>>;

export const goals = {
  add(input: GoalInput): Goal {
    const goal: Goal = { id: uid(), logs: [], archived: false, createdAt: now(), ...clean(input), unit: input.unit.trim() };
    setState((s) => ({ ...s, goals: [...s.goals, goal] }));
    return goal;
  },
  update(id: string, patch: Partial<Goal>) {
    setState((s) => ({ ...s, goals: replace(s.goals, id, (g) => own({ ...g, ...patch })) }));
  },
  log(id: string, amount: number, date: DateKey = todayKey(), note?: string) {
    if (!Number.isFinite(amount) || amount === 0) return;
    setState((s) => ({ ...s, goals: replace(s.goals, id, (g) => own({ ...g, logs: [...g.logs, { id: uid(), date, amount, note }] })) }));
  },
  removeLog(id: string, logId: string) {
    setState((s) => ({ ...s, goals: replace(s.goals, id, (g) => ({ ...g, logs: g.logs.filter((l) => l.id !== logId) })) }));
  },
  remove(id: string): Goal | undefined {
    const goal = state.goals.find((g) => g.id === id);
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
    return goal;
  },
  restore(goal: Goal) {
    setState((s) => (s.goals.some((g) => g.id === goal.id) ? s : { ...s, goals: [...s.goals, goal] }));
  },
};

// ---------- Habits ----------

export type HabitInput = Pick<Habit, 'name' | 'schedule'> & Partial<Pick<Habit, 'description'>>;

export const habits = {
  add(input: HabitInput): Habit {
    const habit: Habit = { id: uid(), completions: {}, archived: false, startDate: todayKey(), createdAt: now(), ...clean(input) };
    setState((s) => ({ ...s, habits: [...s.habits, habit] }));
    return habit;
  },
  update(id: string, patch: Partial<Habit>) {
    setState((s) => ({ ...s, habits: replace(s.habits, id, (h) => own({ ...h, ...patch })) }));
  },
  toggle(id: string, day: DateKey = todayKey()) {
    setState((s) => ({
      ...s,
      habits: replace(s.habits, id, (h) => {
        // Tracking a sample habit makes it yours, so its history survives sample removal.
        const next = own(toggleCompletion(h, day));
        // Logging a day before the start date moves the start back.
        return day < h.startDate ? { ...next, startDate: day } : next;
      }),
    }));
  },
  remove(id: string): Habit | undefined {
    const habit = state.habits.find((h) => h.id === id);
    setState((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }));
    return habit;
  },
  restore(habit: Habit) {
    setState((s) => (s.habits.some((h) => h.id === habit.id) ? s : { ...s, habits: [...s.habits, habit] }));
  },
};

// ---------- Learning ----------

export type SubjectInput = Pick<Subject, 'name' | 'category' | 'weeklyTargetMinutes'> & Partial<Pick<Subject, 'goal'>> & { topics?: string[] };
export type SessionInput = Pick<LearningSession, 'subjectId' | 'date' | 'minutes'> & Partial<Pick<LearningSession, 'notes' | 'takeaways' | 'topicId'>>;

export const learning = {
  addSubject(input: SubjectInput): Subject {
    const { topics = [], ...rest } = input;
    const subject: Subject = {
      id: uid(), archived: false, createdAt: now(), ...clean(rest),
      topics: topics.map((t) => t.trim()).filter(Boolean).map((title) => ({ id: uid(), title, done: false })),
    };
    setState((s) => ({ ...s, subjects: [...s.subjects, subject] }));
    return subject;
  },
  updateSubject(id: string, patch: Partial<Subject>) {
    setState((s) => ({ ...s, subjects: replace(s.subjects, id, (x) => own({ ...x, ...patch })) }));
  },
  removeSubject(id: string): { subject?: Subject; sessions: LearningSession[] } {
    const subject = state.subjects.find((x) => x.id === id);
    const sessions = state.sessions.filter((x) => x.subjectId === id);
    setState((s) => ({
      ...s,
      subjects: s.subjects.filter((x) => x.id !== id),
      sessions: s.sessions.filter((x) => x.subjectId !== id),
      timer: s.timer?.subjectId === id ? undefined : s.timer,
    }));
    return { subject, sessions };
  },
  restoreSubject(subject: Subject, sessions: LearningSession[]) {
    setState((s) => (s.subjects.some((x) => x.id === subject.id) ? s : { ...s, subjects: [...s.subjects, subject], sessions: [...s.sessions, ...sessions] }));
  },
  addTopic(subjectId: string, title: string) {
    const t = title.trim();
    if (!t) return;
    const topic: Topic = { id: uid(), title: t, done: false };
    setState((s) => ({ ...s, subjects: replace(s.subjects, subjectId, (x) => own({ ...x, topics: [...x.topics, topic] })) }));
  },
  toggleTopic(subjectId: string, topicId: string) {
    setState((s) => ({
      ...s,
      subjects: replace(s.subjects, subjectId, (x) => ({
        ...x,
        topics: x.topics.map((t) => (t.id === topicId ? { ...t, done: !t.done, doneAt: t.done ? undefined : todayKey() } : t)),
      })),
    }));
  },
  removeTopic(subjectId: string, topicId: string) {
    setState((s) => ({ ...s, subjects: replace(s.subjects, subjectId, (x) => ({ ...x, topics: x.topics.filter((t) => t.id !== topicId) })) }));
  },
  addSession(input: SessionInput): LearningSession {
    const session: LearningSession = { id: uid(), createdAt: now(), ...clean(input) };
    setState((s) => ({ ...s, sessions: [...s.sessions, session] }));
    return session;
  },
  updateSession(id: string, patch: Partial<LearningSession>) {
    setState((s) => ({ ...s, sessions: replace(s.sessions, id, (x) => own({ ...x, ...patch })) }));
  },
  removeSession(id: string): LearningSession | undefined {
    const session = state.sessions.find((x) => x.id === id);
    setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
    return session;
  },
  restoreSession(session: LearningSession) {
    setState((s) => (s.sessions.some((x) => x.id === session.id) ? s : { ...s, sessions: [...s.sessions, session] }));
  },
  startTimer(subjectId: string) {
    setState((s) => ({ ...s, timer: { subjectId, startedAt: now() } }));
  },
  stopTimer() {
    setState((s) => ({ ...s, timer: undefined }));
  },
};

// ---------- Journal ----------

export const journal = {
  save(date: DateKey, patch: Partial<Omit<JournalEntry, 'date' | 'updatedAt'>>) {
    setState((s) => {
      const prev = s.journal[date] ?? { date, wentWell: '', learned: '', improve: '', notes: '', updatedAt: now() };
      const next = own({ ...prev, ...patch, date, updatedAt: now() });
      const empty = !next.wentWell.trim() && !next.learned.trim() && !next.improve.trim() && !next.notes.trim() && !next.mood;
      const journalMap = { ...s.journal };
      if (empty) delete journalMap[date];
      else journalMap[date] = next;
      return { ...s, journal: journalMap };
    });
  },
};

// ---------- App-level ----------

export const app = {
  updateSettings(patch: Partial<AppData['settings']>) {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
  removeSampleData() {
    setState((s) => withoutSampleData(s));
  },
  replaceAll(data: AppData) {
    setState(() => data);
    flush();
  },
  resetAll() {
    setState(() => ({ ...emptyData(), settings: { name: state.settings.name, onboarded: true } }));
    flush();
  },
};

/** Trims strings and drops empty optional fields. */
function clean<T extends object>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t) out[k] = t;
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}
