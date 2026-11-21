import { describe, expect, it } from 'vitest';
import { addDays, diffDays, isDateKey, isoWeekNumber, rangeKeys, startOfWeek, weekdayIndex, formatRelative, formatMinutes, addMonths } from './dates';

describe('dates', () => {
  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30'); // EU DST start
    expect(addDays('2026-10-25', -1)).toBe('2026-10-24'); // EU DST end
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
  });
  it('diffs whole days', () => {
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-11-21', '2026-11-14')).toBe(-7);
  });
  it('validates keys', () => {
    expect(isDateKey('2026-11-21')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('21/11/2026')).toBe(false);
    expect(isDateKey(42)).toBe(false);
  });
  it('uses Monday as start of week', () => {
    expect(weekdayIndex('2026-11-23')).toBe(0); // Monday
    expect(weekdayIndex('2026-11-22')).toBe(6); // Sunday
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16');
  });
  it('computes ISO week numbers', () => {
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2027-01-01')).toBe(53);
    expect(isoWeekNumber('2026-11-21')).toBe(47);
    expect(isoWeekNumber('2024-12-30')).toBe(1);
  });
  it('produces inclusive ranges and months', () => {
    expect(rangeKeys('2026-11-20', '2026-11-22')).toEqual(['2026-11-20', '2026-11-21', '2026-11-22']);
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
  });
  it('formats relative days and minutes', () => {
    expect(formatRelative('2026-11-21', '2026-11-21')).toBe('Idag');
    expect(formatRelative('2026-11-22', '2026-11-21')).toBe('Imorgon');
    expect(formatRelative('2026-11-20', '2026-11-21')).toBe('Igår');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(95)).toBe('1 h 35 min');
  });
});
