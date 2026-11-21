import { isDateKey } from './dates';
import type { AppData, Goal, GoalLog, Habit, JournalEntry, LearningSession, Mood, Priority, Subject, Task, Topic } from './types';

/**
 * Persistence layer. All reads/writes go through here so the rest of the app
 * never touches localStorage directly. Data is versioned so future schema
 * changes can be migrated instead of silently discarded.
 */

export const STORAGE_KEY = 'lifeos:data';
export const SCHEMA_VERSION = 1;

export function emptyData(): AppData {
  return {
    version: SCHEMA_VERSION,
    settings: { name: '', onboarded: false },
    tasks: [],
    goals: [],
    habits: [],
    subjects: [],
    sessions: [],
    journal: {},
  };
}

export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const result = parseData(JSON.parse(raw));
    return result.ok ? result.data : null;
  } catch {
    return null;
  }
}

export function saveData(data: AppData): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, error: quota ? 'Lagringsutrymmet är fullt. Exportera och rensa gammal data.' : 'Kunde inte spara data i webbläsaren.' };
  }
}

export function exportJson(data: AppData): string {
  return JSON.stringify({ app: 'lifeos', exportedAt: new Date().toISOString(), ...data }, null, 2);
}

// ---------- Validation ----------
// Hand-written guards keep the bundle free of schema libraries. Invalid items
// are dropped individually; only a structurally broken file is rejected.

export type ParseResult = { ok: true; data: AppData; dropped: number } | { ok: false; error: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const optStr = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown): boolean => v === true;
const optDate = (v: unknown): string | undefined => (isDateKey(v) ? v : undefined);
const iso = (v: unknown): string => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : new Date().toISOString());

function arr<T>(v: unknown, parse: (x: unknown) => T | null, counter: { n: number }): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    const parsed = parse(item);
    if (parsed) out.push(parsed);
    else counter.n++;
  }
  return out;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

function parseTask(v: unknown): Task | null {
  if (!isObj(v) || !str(v.id) || !optStr(v.title)) return null;
  return {
    id: v.id as string,
    title: (v.title as string).trim(),
    description: optStr(v.description),
    dueDate: optDate(v.dueDate),
    priority: PRIORITIES.includes(v.priority as Priority) ? (v.priority as Priority) : 'medium',
    project: optStr(v.project),
    completed: bool(v.completed),
    completedAt: bool(v.completed) ? iso(v.completedAt) : undefined,
    focusDate: optDate(v.focusDate),
    createdAt: iso(v.createdAt),
    sample: bool(v.sample) || undefined,
  };
}

function parseGoalLog(v: unknown): GoalLog | null {
  if (!isObj(v) || !str(v.id) || !isDateKey(v.date) || typeof v.amount !== 'number' || !Number.isFinite(v.amount)) return null;
  return { id: v.id as string, date: v.date, amount: v.amount, note: optStr(v.note) };
}

function parseGoal(v: unknown): Goal | null {
  if (!isObj(v) || !str(v.id) || !optStr(v.title)) return null;
  const counter = { n: 0 };
  return {
    id: v.id as string,
    title: (v.title as string).trim(),
    description: optStr(v.description),
    category: optStr(v.category) ?? 'Personligt',
    horizon: v.horizon === 'weekly' ? 'weekly' : 'long',
    deadline: optDate(v.deadline),
    target: Math.max(0, num(v.target, 1)),
    unit: str(v.unit) ?? '',
    startValue: num(v.startValue),
    logs: arr(v.logs, parseGoalLog, counter),
    archived: bool(v.archived),
    createdAt: iso(v.createdAt),
    sample: bool(v.sample) || undefined,
  };
}

function parseHabit(v: unknown): Habit | null {
  if (!isObj(v) || !str(v.id) || !optStr(v.name)) return null;
  const sched = isObj(v.schedule) ? v.schedule : {};
  const days = Array.isArray(sched.days)
    ? [...new Set(sched.days.filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))].sort()
    : [];
  const completions: Record<string, true> = {};
  if (isObj(v.completions)) {
    for (const [k, val] of Object.entries(v.completions)) if (val === true && isDateKey(k)) completions[k] = true;
  }
  const createdAt = iso(v.createdAt);
  return {
    id: v.id as string,
    name: (v.name as string).trim(),
    description: optStr(v.description),
    schedule: sched.type === 'weekdays' && days.length > 0 ? { type: 'weekdays', days } : { type: 'daily' },
    startDate: optDate(v.startDate) ?? createdAt.slice(0, 10),
    completions,
    archived: bool(v.archived),
    createdAt,
    sample: bool(v.sample) || undefined,
  };
}

function parseTopic(v: unknown): Topic | null {
  if (!isObj(v) || !str(v.id) || !optStr(v.title)) return null;
  return { id: v.id as string, title: (v.title as string).trim(), done: bool(v.done), doneAt: optDate(v.doneAt) };
}

function parseSubject(v: unknown): Subject | null {
  if (!isObj(v) || !str(v.id) || !optStr(v.name)) return null;
  const counter = { n: 0 };
  return {
    id: v.id as string,
    name: (v.name as string).trim(),
    category: optStr(v.category) ?? 'Övrigt',
    goal: optStr(v.goal),
    weeklyTargetMinutes: Math.max(0, Math.round(num(v.weeklyTargetMinutes))),
    topics: arr(v.topics, parseTopic, counter),
    archived: bool(v.archived),
    createdAt: iso(v.createdAt),
    sample: bool(v.sample) || undefined,
  };
}

function parseSession(v: unknown): LearningSession | null {
  if (!isObj(v) || !str(v.id) || !str(v.subjectId) || !isDateKey(v.date)) return null;
  const minutes = Math.round(num(v.minutes, -1));
  if (minutes <= 0) return null;
  return {
    id: v.id as string,
    subjectId: v.subjectId as string,
    date: v.date,
    minutes,
    topicId: optStr(v.topicId),
    notes: optStr(v.notes),
    takeaways: optStr(v.takeaways),
    createdAt: iso(v.createdAt),
    sample: bool(v.sample) || undefined,
  };
}

function parseJournal(v: unknown): JournalEntry | null {
  if (!isObj(v) || !isDateKey(v.date)) return null;
  const mood = num(v.mood, 0);
  return {
    date: v.date,
    wentWell: str(v.wentWell) ?? '',
    learned: str(v.learned) ?? '',
    improve: str(v.improve) ?? '',
    notes: str(v.notes) ?? '',
    mood: mood >= 1 && mood <= 5 ? (Math.round(mood) as Mood) : undefined,
    updatedAt: iso(v.updatedAt),
    sample: bool(v.sample) || undefined,
  };
}

function migrate(raw: Obj): Obj {
  // Version 1 is the first schema. Future migrations go here, e.g.
  // if (raw.version === 1) raw = migrateV1toV2(raw);
  return raw;
}

export function parseData(input: unknown): ParseResult {
  if (!isObj(input)) return { ok: false, error: 'Filen innehåller inte giltig LIFE OS-data.' };
  if (typeof input.version === 'number' && input.version > SCHEMA_VERSION) {
    return { ok: false, error: 'Filen kommer från en nyare version av LIFE OS.' };
  }
  const known = ['tasks', 'goals', 'habits', 'subjects', 'sessions', 'journal'];
  if (!known.some((k) => k in input)) return { ok: false, error: 'Filen innehåller inga uppgifter, mål, vanor eller anteckningar.' };

  const raw = migrate(input);
  const counter = { n: 0 };
  const settings = isObj(raw.settings) ? raw.settings : {};

  const journal: Record<string, JournalEntry> = {};
  const journalSource = isObj(raw.journal) ? Object.values(raw.journal) : Array.isArray(raw.journal) ? raw.journal : [];
  for (const e of journalSource) {
    const parsed = parseJournal(e);
    if (parsed) journal[parsed.date] = parsed;
    else counter.n++;
  }

  const subjects = arr(raw.subjects, parseSubject, counter);
  const subjectIds = new Set(subjects.map((s) => s.id));
  const sessions = arr(raw.sessions, parseSession, counter).filter((s) => {
    if (subjectIds.has(s.subjectId)) return true;
    counter.n++;
    return false;
  });

  let timer: AppData['timer'];
  if (isObj(raw.timer) && typeof raw.timer.subjectId === 'string' && subjectIds.has(raw.timer.subjectId) && typeof raw.timer.startedAt === 'string' && !Number.isNaN(Date.parse(raw.timer.startedAt))) {
    timer = { subjectId: raw.timer.subjectId, startedAt: raw.timer.startedAt };
  }

  const tasks = arr(raw.tasks, parseTask, counter);
  const goals = arr(raw.goals, parseGoal, counter);
  const habits = arr(raw.habits, parseHabit, counter);

  return {
    ok: true,
    dropped: counter.n,
    data: {
      version: SCHEMA_VERSION,
      settings: { name: (str(settings.name) ?? '').slice(0, 60), onboarded: bool(settings.onboarded) },
      tasks,
      goals,
      habits,
      subjects,
      sessions,
      journal,
      timer,
    },
  };
}
