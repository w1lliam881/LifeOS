import { addDays, startOfWeek, type DateKey } from './dates';
import type { LearningSession, Subject } from './types';

export const LEARNING_CATEGORIES = ['Programmering', 'Ekonomi', 'Språk', 'Historia', 'Vetenskap', 'Kreativt', 'Övrigt'];

export function minutesInRange(sessions: LearningSession[], from: DateKey, to: DateKey, subjectId?: string): number {
  return sessions
    .filter((s) => s.date >= from && s.date <= to && (!subjectId || s.subjectId === subjectId))
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function weekMinutes(sessions: LearningSession[], today: DateKey, subjectId?: string): number {
  const from = startOfWeek(today);
  return minutesInRange(sessions, from, addDays(from, 6), subjectId);
}

export function topicProgress(subject: Subject): number {
  if (subject.topics.length === 0) return 0;
  return subject.topics.filter((t) => t.done).length / subject.topics.length;
}

/** Minutes elapsed on a running timer, rounded down, at least 1. */
export function timerMinutes(startedAt: string, now: Date = new Date()): number {
  return Math.max(1, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 60_000));
}

export function sortSessions(sessions: LearningSession[]): LearningSession[] {
  return [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
