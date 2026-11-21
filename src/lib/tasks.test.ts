import { describe, expect, it } from 'vitest';
import { completionPercent, filterTasks, groupOpenTasks, sortTasks, taskStatus, tasksForDay } from './tasks';
import type { Task } from './types';

const TODAY = '2026-11-21';
let n = 0;
const t = (p: Partial<Task>): Task => ({ id: `t${n++}`, title: 'Uppgift', priority: 'medium', completed: false, createdAt: `2026-11-01T0${n % 10}:00:00.000Z`, ...p });

describe('taskStatus', () => {
  it('derives status from due date', () => {
    expect(taskStatus(t({ dueDate: TODAY }), TODAY)).toBe('today');
    expect(taskStatus(t({ dueDate: '2026-11-19' }), TODAY)).toBe('today');
    expect(taskStatus(t({ dueDate: '2026-11-25' }), TODAY)).toBe('upcoming');
    expect(taskStatus(t({}), TODAY)).toBe('upcoming');
    expect(taskStatus(t({ completed: true, dueDate: TODAY }), TODAY)).toBe('completed');
  });
});

describe('filterTasks', () => {
  const list = [
    t({ title: 'Betala hyra', dueDate: '2026-11-19', priority: 'high', project: 'Hem' }),
    t({ title: 'Mejla', dueDate: TODAY, priority: 'low' }),
    t({ title: 'Plan', dueDate: '2026-11-26', project: 'Jobb' }),
    t({ title: 'Långt fram', dueDate: '2026-12-30' }),
    t({ title: 'Någon gång' }),
    t({ title: 'Klar', completed: true, completedAt: '2026-11-21T10:00:00.000Z', dueDate: TODAY }),
  ];
  const titles = (x: Task[]) => x.map((y) => y.title);

  it('filters by status', () => {
    expect(titles(filterTasks(list, { status: 'today' }, TODAY))).toEqual(['Betala hyra', 'Mejla']);
    expect(titles(filterTasks(list, { status: 'completed' }, TODAY))).toEqual(['Klar']);
    expect(filterTasks(list, { status: 'open' }, TODAY)).toHaveLength(5);
  });
  it('filters by priority and project', () => {
    expect(titles(filterTasks(list, { priority: 'high' }, TODAY))).toEqual(['Betala hyra']);
    expect(titles(filterTasks(list, { project: 'Jobb' }, TODAY))).toEqual(['Plan']);
  });
  it('filters by date window', () => {
    expect(titles(filterTasks(list, { date: 'overdue' }, TODAY))).toEqual(['Betala hyra']);
    expect(titles(filterTasks(list, { date: 'week', status: 'open' }, TODAY))).toEqual(['Mejla', 'Plan']);
    expect(titles(filterTasks(list, { date: 'nodate' }, TODAY))).toEqual(['Någon gång']);
  });
  it('searches title, description and project', () => {
    expect(titles(filterTasks(list, { query: 'hem' }, TODAY))).toEqual(['Betala hyra']);
    expect(filterTasks(list, { query: '   ' }, TODAY)).toHaveLength(6);
  });
});

describe('sortTasks', () => {
  it('orders open by date, then priority; undated and completed last', () => {
    const a = t({ title: 'imorgon', dueDate: '2026-11-22' });
    const b = t({ title: 'idag-låg', dueDate: TODAY, priority: 'low' });
    const c = t({ title: 'idag-hög', dueDate: TODAY, priority: 'high' });
    const d = t({ title: 'odaterad' });
    const e = t({ title: 'klar', completed: true, completedAt: '2026-11-20T10:00:00.000Z' });
    expect(sortTasks([e, d, a, b, c]).map((x) => x.title)).toEqual(['idag-hög', 'idag-låg', 'imorgon', 'odaterad', 'klar']);
  });
});

describe('today summary', () => {
  it('counts open and completed tasks for the day', () => {
    const list = [
      t({ dueDate: TODAY }),
      t({ dueDate: '2026-11-18' }),
      t({ dueDate: '2026-11-25' }),
      t({ dueDate: TODAY, completed: true, completedAt: new Date(2026, 10, 21, 12).toISOString() }),
    ];
    const { open, done } = tasksForDay(list, TODAY);
    expect(open).toHaveLength(2);
    expect(done).toHaveLength(1);
    expect(completionPercent(open.length, done.length)).toBe(33);
    expect(completionPercent(0, 0)).toBe(0);
  });
  it('groups open tasks into sections', () => {
    const g = groupOpenTasks([t({ dueDate: '2026-11-19' }), t({ dueDate: TODAY }), t({ dueDate: '2026-11-22' }), t({ dueDate: '2026-11-30' }), t({})], TODAY);
    expect([g.overdue.length, g.today.length, g.tomorrow.length, g.later.length, g.someday.length]).toEqual([1, 1, 1, 1, 1]);
  });
});

import { parseQuickTask } from './tasks';

describe('parseQuickTask', () => {
  it('extracts date words, priority and project', () => {
    expect(parseQuickTask('Ring tandläkaren imorgon !', TODAY)).toEqual({ title: 'Ring tandläkaren', dueDate: '2026-11-22', priority: 'high', project: undefined });
    expect(parseQuickTask('Handla mat idag #hem', TODAY)).toMatchObject({ title: 'Handla mat', dueDate: TODAY, project: 'Hem' });
    expect(parseQuickTask('Möte på måndag', TODAY)).toMatchObject({ title: 'Möte', dueDate: '2026-11-23' });
    expect(parseQuickTask('Städa lördag', TODAY).dueDate).toBe('2026-11-28'); // next Saturday, not today
  });
  it('keeps the default date and plain text otherwise', () => {
    expect(parseQuickTask('Läsa en bok', TODAY, TODAY)).toEqual({ title: 'Läsa en bok', dueDate: TODAY, priority: 'medium', project: undefined });
    expect(parseQuickTask('Fixa cykeln någon gång', TODAY, TODAY).dueDate).toBeUndefined();
    expect(parseQuickTask('Idag', TODAY).title).toBe('Idag');
  });
});
