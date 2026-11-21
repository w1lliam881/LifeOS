import { addDays, todayKey, weekdayIndex, type DateKey } from './dates';
import { uid } from './id';
import { emptyData } from './storage';
import type { AppData, Habit, LearningSession } from './types';

/**
 * A small, realistic starting point so the app isn't empty on first visit.
 * Everything is flagged `sample: true` and can be removed in one click.
 */
export function sampleData(now: Date = new Date()): AppData {
  const today = todayKey(now);
  const ts = (day: DateKey, h = 9) => {
    const d = new Date(`${day}T00:00:00`);
    d.setHours(h);
    return d.toISOString();
  };
  const created = ts(addDays(today, -20));

  const data = emptyData();
  data.tasks = [
    { id: uid(), title: 'Planera veckans tre viktigaste saker', priority: 'high', dueDate: today, focusDate: today, completed: false, createdAt: created, sample: true },
    { id: uid(), title: 'Boka tandläkartid', priority: 'medium', dueDate: today, completed: false, project: 'Hem', createdAt: created, sample: true },
    { id: uid(), title: 'Läs kapitel 3 i ekonomiboken', priority: 'low', dueDate: addDays(today, 1), completed: false, project: 'Studier', createdAt: created, sample: true },
    { id: uid(), title: 'Betala räkningar', description: 'El och bredband', priority: 'high', dueDate: addDays(today, -1), completed: false, project: 'Hem', createdAt: created, sample: true },
    { id: uid(), title: 'Skicka utkast till projektplan', priority: 'medium', dueDate: addDays(today, 3), completed: false, project: 'Jobb', createdAt: created, sample: true },
    { id: uid(), title: 'Rensa garderoben', priority: 'low', completed: false, project: 'Hem', createdAt: created, sample: true },
    { id: uid(), title: 'Handla inför veckan', priority: 'medium', dueDate: today, completed: true, completedAt: ts(today, 8), createdAt: created, sample: true },
    { id: uid(), title: 'Ring mormor', priority: 'medium', dueDate: addDays(today, -1), completed: true, completedAt: ts(addDays(today, -1), 18), createdAt: created, sample: true },
    { id: uid(), title: 'Uppdatera CV', priority: 'medium', dueDate: addDays(today, -3), completed: true, completedAt: ts(addDays(today, -3), 15), project: 'Jobb', createdAt: created, sample: true },
  ];

  // Deterministic pseudo-random history so streaks look plausible.
  const habit = (name: string, schedule: Habit['schedule'], hitRate: number, seed: number, doneToday = false): Habit => {
    const completions: Record<DateKey, true> = {};
    const startDate = addDays(today, -27);
    for (let i = 27; i >= 1; i--) {
      const day = addDays(today, -i);
      const scheduled = schedule.type === 'daily' || schedule.days.includes(weekdayIndex(day));
      const r = ((i * 9301 + seed * 49297) % 233280) / 233280;
      if (scheduled && (r < hitRate || i <= 4)) completions[day] = true;
    }
    if (doneToday) completions[today] = true;
    return { id: uid(), name, schedule, startDate, completions, archived: false, createdAt: ts(startDate), sample: true };
  };

  data.habits = [
    habit('Träna 30 minuter', { type: 'weekdays', days: [0, 2, 4] }, 0.8, 1),
    habit('Läsa 20 sidor', { type: 'daily' }, 0.75, 2, true),
    habit('Ingen skärm efter 22', { type: 'daily' }, 0.6, 3),
    habit('Veckoplanering', { type: 'weekdays', days: [6] }, 0.9, 4),
  ];

  const prog = { id: uid(), name: 'TypeScript', category: 'Programmering', goal: 'Bygga egna webbappar med säker typning', weeklyTargetMinutes: 180, archived: false, createdAt: created, sample: true,
    topics: [
      { id: uid(), title: 'Grundläggande typer', done: true, doneAt: addDays(today, -14) },
      { id: uid(), title: 'Generics', done: true, doneAt: addDays(today, -6) },
      { id: uid(), title: 'Utility types', done: false },
      { id: uid(), title: 'Typning av React-komponenter', done: false },
    ] };
  const eco = { id: uid(), name: 'Privatekonomi', category: 'Ekonomi', goal: 'Förstå fonder, ränta och budget', weeklyTargetMinutes: 90, archived: false, createdAt: created, sample: true,
    topics: [
      { id: uid(), title: 'Ränta-på-ränta', done: true, doneAt: addDays(today, -10) },
      { id: uid(), title: 'Indexfonder', done: false },
      { id: uid(), title: 'ISK och skatt', done: false },
    ] };
  const lang = { id: uid(), name: 'Spanska', category: 'Språk', goal: 'Klara en vardaglig konversation', weeklyTargetMinutes: 120, archived: false, createdAt: created, sample: true,
    topics: [
      { id: uid(), title: 'Presens', done: true, doneAt: addDays(today, -12) },
      { id: uid(), title: 'Vanliga verb', done: false },
    ] };
  data.subjects = [prog, eco, lang];

  const session = (subjectId: string, daysAgo: number, minutes: number, notes?: string, takeaways?: string): LearningSession => ({
    id: uid(), subjectId, date: addDays(today, -daysAgo), minutes, notes, takeaways, createdAt: ts(addDays(today, -daysAgo), 19), sample: true,
  });
  data.sessions = [
    session(prog.id, 0, 35, 'Började med utility types.', 'Partial<T> gör alla fält valfria.'),
    session(prog.id, 2, 50, 'Övade generics med egna exempel.'),
    session(eco.id, 1, 30, undefined, 'Kostnaden för en fond spelar stor roll över tid.'),
    session(lang.id, 3, 25),
    session(prog.id, 6, 60),
    session(lang.id, 8, 20),
    session(eco.id, 9, 40),
    session(prog.id, 12, 45),
    session(lang.id, 15, 30),
  ];

  data.goals = [
    { id: uid(), title: 'Träna tre gånger', category: 'Hälsa', horizon: 'weekly', target: 3, unit: 'pass', startValue: 0, archived: false, createdAt: created, sample: true,
      logs: weekdayIndex(today) >= 1 ? [{ id: uid(), date: addDays(today, -Math.min(weekdayIndex(today), 1)), amount: 1 }] : [] },
    { id: uid(), title: 'Spara till buffert', description: 'Tre månaders utgifter på sparkontot', category: 'Ekonomi', horizon: 'long', deadline: addDays(today, 120), target: 30000, unit: 'kr', startValue: 8000, archived: false, createdAt: created, sample: true,
      logs: [
        { id: uid(), date: addDays(today, -18), amount: 2500 },
        { id: uid(), date: addDays(today, -4), amount: 2500 },
      ] },
    { id: uid(), title: 'Läsa 12 böcker i år', category: 'Lärande', horizon: 'long', deadline: `${today.slice(0, 4)}-12-31`, target: 12, unit: 'böcker', startValue: 7, archived: false, createdAt: created, sample: true,
      logs: [{ id: uid(), date: addDays(today, -9), amount: 1 }] },
  ];

  const y = addDays(today, -1);
  data.journal = {
    [y]: { date: y, wentWell: 'Fick ett bra träningspass och var i säng i tid.', learned: 'Att planera kvällen innan gör morgonen lugnare.', improve: 'Börja med den svåraste uppgiften först.', notes: '', mood: 4, updatedAt: ts(y, 21), sample: true },
  };

  data.settings = { name: '', onboarded: false };
  return data;
}

export function hasSampleData(data: AppData): boolean {
  return (
    data.tasks.some((x) => x.sample) || data.goals.some((x) => x.sample) || data.habits.some((x) => x.sample) ||
    data.subjects.some((x) => x.sample) || data.sessions.some((x) => x.sample) || Object.values(data.journal).some((x) => x.sample)
  );
}

export function withoutSampleData(data: AppData): AppData {
  const subjects = data.subjects.filter((x) => !x.sample);
  const subjectIds = new Set(subjects.map((s) => s.id));
  return {
    ...data,
    tasks: data.tasks.filter((x) => !x.sample),
    goals: data.goals.filter((x) => !x.sample),
    habits: data.habits.filter((x) => !x.sample),
    subjects,
    sessions: data.sessions.filter((x) => !x.sample && subjectIds.has(x.subjectId)),
    journal: Object.fromEntries(Object.entries(data.journal).filter(([, e]) => !e.sample)),
    timer: data.timer && subjectIds.has(data.timer.subjectId) ? data.timer : undefined,
  };
}
