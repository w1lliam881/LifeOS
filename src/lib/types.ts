import type { DateKey } from './dates';

export type ID = string;
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: ID;
  title: string;
  description?: string;
  /** Calendar day the task is due. Undated tasks live in "Någon gång". */
  dueDate?: DateKey;
  priority: Priority;
  project?: string;
  completed: boolean;
  completedAt?: string;
  /** Day the task was marked as one of that day's top priorities. */
  focusDate?: DateKey;
  createdAt: string;
  sample?: boolean;
}

/** Derived, never stored: keeps status consistent with the due date. */
export type TaskStatus = 'today' | 'upcoming' | 'completed';

export type GoalHorizon = 'weekly' | 'long';

export interface GoalLog {
  id: ID;
  date: DateKey;
  /** Change in value (can be negative). */
  amount: number;
  note?: string;
}

export interface Goal {
  id: ID;
  title: string;
  description?: string;
  category: string;
  horizon: GoalHorizon;
  /** Optional for weekly goals (they repeat every week). */
  deadline?: DateKey;
  target: number;
  unit: string;
  /** Long-term goals: value before any logs. */
  startValue: number;
  logs: GoalLog[];
  archived: boolean;
  createdAt: string;
  sample?: boolean;
}

export type HabitSchedule =
  | { type: 'daily' }
  /** 0 = Monday … 6 = Sunday */
  | { type: 'weekdays'; days: number[] };

export interface Habit {
  id: ID;
  name: string;
  description?: string;
  schedule: HabitSchedule;
  /** First day the habit counts towards rates and streaks. */
  startDate: DateKey;
  /** Map of completed days – a map makes duplicate records impossible. */
  completions: Record<DateKey, true>;
  archived: boolean;
  createdAt: string;
  sample?: boolean;
}

export interface Topic {
  id: ID;
  title: string;
  done: boolean;
  doneAt?: DateKey;
}

export interface Subject {
  id: ID;
  name: string;
  category: string;
  goal?: string;
  weeklyTargetMinutes: number;
  topics: Topic[];
  archived: boolean;
  createdAt: string;
  sample?: boolean;
}

export interface LearningSession {
  id: ID;
  subjectId: ID;
  date: DateKey;
  minutes: number;
  topicId?: ID;
  notes?: string;
  takeaways?: string;
  createdAt: string;
  sample?: boolean;
}

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface JournalEntry {
  date: DateKey;
  wentWell: string;
  learned: string;
  improve: string;
  notes: string;
  mood?: Mood;
  updatedAt: string;
  sample?: boolean;
}

export interface Settings {
  name: string;
  onboarded: boolean;
}

export interface ActiveTimer {
  subjectId: ID;
  startedAt: string;
}

export interface AppData {
  version: number;
  settings: Settings;
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  subjects: Subject[];
  sessions: LearningSession[];
  journal: Record<DateKey, JournalEntry>;
  timer?: ActiveTimer;
}
