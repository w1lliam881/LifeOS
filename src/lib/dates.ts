/**
 * Date helpers.
 *
 * Calendar days are stored as local "YYYY-MM-DD" strings (DateKey). They never
 * pass through UTC conversion, so a task due "2026-11-21" stays on that day no
 * matter which timezone the browser is in. Moments in time (createdAt,
 * completedAt) are stored as full ISO timestamps.
 */

export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses a DateKey as local midnight. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateKey(fromDateKey(value)) === value;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Whole calendar days from a to b (b - a). DST-safe. */
export function diffDays(a: DateKey, b: DateKey): number {
  const ua = Date.UTC(...splitKey(a));
  const ub = Date.UTC(...splitKey(b));
  return Math.round((ub - ua) / 86_400_000);
}

function splitKey(key: DateKey): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y ?? 1970, (m ?? 1) - 1, d ?? 1];
}

/** 0 = Monday … 6 = Sunday (ISO / Swedish convention). */
export function weekdayIndex(key: DateKey): number {
  return (fromDateKey(key).getDay() + 6) % 7;
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key));
}

export function startOfMonth(key: DateKey): DateKey {
  return key.slice(0, 8) + '01';
}

export function daysInMonth(key: DateKey): number {
  const [y, m] = splitKey(key);
  return new Date(y, m + 1, 0).getDate();
}

export function addMonths(key: DateKey, months: number): DateKey {
  const [y, m] = splitKey(key);
  return toDateKey(new Date(y, m + months, 1));
}

/** Inclusive range of keys. */
export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

export function isoWeekNumber(key: DateKey): number {
  const d = fromDateKey(key);
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Thursday of this week
  const thursday = target.getTime();
  const jan4 = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week1Thursday = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86_400_000 + 3 * 86_400_000;
  return 1 + Math.round((thursday - week1Thursday) / (7 * 86_400_000));
}

/** Converts an ISO timestamp to the local calendar day it happened on. */
export function timestampToKey(iso: string): DateKey {
  return toDateKey(new Date(iso));
}

// ---------- Formatting (Swedish) ----------

const LOCALE = 'sv-SE';
export const WEEKDAYS_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
export const WEEKDAYS_LETTER = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

export function formatLong(key: DateKey): string {
  const s = fromDateKey(key).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatShort(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }).replace('.', '');
}

export function formatMonth(key: DateKey): string {
  const s = fromDateKey(key).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Idag", "Imorgon", "Igår", weekday within a week, otherwise a short date. */
export function formatRelative(key: DateKey, today: DateKey = todayKey()): string {
  const diff = diffDays(today, key);
  if (diff === 0) return 'Idag';
  if (diff === 1) return 'Imorgon';
  if (diff === -1) return 'Igår';
  if (diff > 1 && diff < 7) {
    const w = fromDateKey(key).toLocaleDateString(LOCALE, { weekday: 'long' });
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return fromDateKey(key)
    .toLocaleDateString(LOCALE, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
    .replace('.', '');
}

export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'God natt';
  if (h < 10) return 'God morgon';
  if (h < 17) return 'Hej';
  return 'God kväll';
}
