import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Check, ChevronLeft, ChevronRight, Flame, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { habits as habitStore, useData } from '../lib/store';
import { useToday } from '../lib/useToday';
import { addDays, addMonths, daysInMonth, formatMonth, formatShort, fromDateKey, isoWeekNumber, startOfMonth, startOfWeek, weekdayIndex, WEEKDAYS_LETTER, WEEKDAYS_SHORT } from '../lib/dates';
import { completionRate, currentStreak, habitsForDay, isDone, isScheduled, longestStreak, scheduleLabel } from '../lib/habits';
import type { Habit } from '../lib/types';
import { EmptyState, PageHeader, ProgressBar, Segmented } from '../components/ui';
import { useDialogs } from '../components/Dialogs';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/useConfirm';

type View = 'week' | 'month';

export default function Habits() {
  const today = useToday();
  const all = useData((s) => s.habits);
  const dialogs = useDialogs();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(today);
  const [showArchived, setShowArchived] = useState(false);

  const active = useMemo(() => all.filter((h) => !h.archived), [all]);
  const archived = useMemo(() => all.filter((h) => h.archived), [all]);
  const todaySummary = useMemo(() => habitsForDay(all, today), [all, today]);

  const weekStart = startOfWeek(anchor);
  const monthStart = startOfMonth(anchor);
  const isCurrent = view === 'week' ? weekStart === startOfWeek(today) : monthStart === startOfMonth(today);
  const move = (dir: number) => setAnchor(view === 'week' ? addDays(weekStart, dir * 7) : addMonths(monthStart, dir));
  const canForward = view === 'week' ? addDays(weekStart, 7) <= today : addMonths(monthStart, 1) <= today;

  return (
    <div className="page">
      <PageHeader
        title="Vanor"
        sub={todaySummary.total ? `${todaySummary.done} av ${todaySummary.total} klara idag` : 'Små steg, varje dag.'}
        actions={<button className="btn btn-primary" onClick={() => dialogs.habit()}><Plus /> Ny vana</button>}
      />

      {active.length === 0 && archived.length === 0 ? (
        <section className="card">
          <EmptyState icon={<Repeat />} title="Inga vanor ännu" text="Välj något litet du vill göra regelbundet. Det är enklare att hålla en vana som tar två minuter än en som tar en timme."
            action={<button className="btn btn-primary btn-sm" onClick={() => dialogs.habit()}><Plus /> Skapa första vanan</button>} />
        </section>
      ) : (
        <>
          <div className="row-between wrap" style={{ marginBottom: 'var(--s4)' }}>
            <Segmented<View> label="Vy" value={view} onChange={(v) => { setView(v); setAnchor(today); }} options={[{ value: 'week', label: 'Vecka' }, { value: 'month', label: 'Månad' }]} />
            <div className="row">
              <button className="icon-btn" onClick={() => move(-1)} aria-label={view === 'week' ? 'Föregående vecka' : 'Föregående månad'}><ChevronLeft /></button>
              <span className="small num" style={{ minWidth: 128, textAlign: 'center' }}>
                {view === 'week' ? `Vecka ${isoWeekNumber(weekStart)} · ${formatShort(weekStart)}–${formatShort(addDays(weekStart, 6))}` : formatMonth(monthStart)}
              </span>
              <button className="icon-btn" onClick={() => move(1)} disabled={!canForward} aria-label={view === 'week' ? 'Nästa vecka' : 'Nästa månad'}><ChevronRight /></button>
              {!isCurrent && <button className="btn btn-sm btn-ghost" onClick={() => setAnchor(today)}>Idag</button>}
            </div>
          </div>

          {active.length === 0 ? (
            <section className="card"><EmptyState compact icon={<Repeat />} title="Inga aktiva vanor" text="Alla dina vanor är arkiverade." /></section>
          ) : view === 'week' ? (
            <section className="card" aria-label="Veckovy">
              <WeekHeader weekStart={weekStart} today={today} />
              {active.map((h) => <HabitWeekRow key={h.id} habit={h} weekStart={weekStart} today={today} />)}
            </section>
          ) : (
            <div className="grid grid-2">
              {active.map((h) => <HabitMonthCard key={h.id} habit={h} monthStart={monthStart} today={today} />)}
            </div>
          )}

          {archived.length > 0 && (
            <div style={{ marginTop: 'var(--s5)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowArchived((x) => !x)} aria-expanded={showArchived}>
                <Archive /> Arkiverade ({archived.length})
              </button>
              {showArchived && (
                <section className="card" style={{ marginTop: 'var(--s2)' }}>
                  <ul className="list">
                    {archived.map((h) => <ArchivedRow key={h.id} habit={h} today={today} />)}
                  </ul>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WeekHeader({ weekStart, today }: { weekStart: string; today: string }) {
  return (
    <div className="habit-row" style={{ paddingTop: 0, borderTop: 0 }} aria-hidden>
      <span className="eyebrow">Vana</span>
      <div className="week-head">
        {WEEKDAYS_SHORT.map((d, i) => {
          const day = addDays(weekStart, i);
          return <span key={d} className={day === today ? 'today' : ''}>{d}<br />{fromDateKey(day).getDate()}</span>;
        })}
      </div>
    </div>
  );
}

function HabitWeekRow({ habit, weekStart, today }: { habit: Habit; weekStart: string; today: string }) {
  const stats = useHabitStats(habit, today);
  return (
    <div className="habit-row">
      <HabitInfo habit={habit} stats={stats} />
      <div className="week-cells" role="group" aria-label={`${habit.name}, veckan`}>
        {Array.from({ length: 7 }, (_, i) => {
          const day = addDays(weekStart, i);
          const done = isDone(habit, day);
          const scheduled = isScheduled(habit.schedule, day);
          const future = day > today;
          return (
            <button
              key={day}
              className={`cell ${done ? 'done' : ''} ${scheduled ? '' : 'off'} ${day === today ? 'today' : ''}`}
              disabled={future}
              aria-pressed={done}
              aria-label={`${habit.name}, ${WEEKDAYS_SHORT[i]} ${formatShort(day)}${scheduled ? '' : ' (ej schemalagd)'}${done ? ', klar' : ''}`}
              title={scheduled ? formatShort(day) : `${formatShort(day)} – ej schemalagd`}
              onClick={() => habitStore.toggle(habit.id, day)}
            >
              {done && <Check strokeWidth={3} aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HabitMonthCard({ habit, monthStart, today }: { habit: Habit; monthStart: string; today: string }) {
  const stats = useHabitStats(habit, today);
  const n = daysInMonth(monthStart);
  const offset = weekdayIndex(monthStart);
  const monthEnd = addDays(monthStart, n - 1);
  const monthRate = completionRate(habit, monthStart, monthEnd, today);
  return (
    <article className="card">
      <div style={{ marginBottom: 'var(--s4)' }}><HabitInfo habit={habit} stats={stats} /></div>
      <div className="month-grid" role="group" aria-label={`${habit.name}, ${formatMonth(monthStart)}`}>
        {WEEKDAYS_LETTER.map((d, i) => <span key={i} className="dow" aria-hidden>{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`b${i}`} className="mcell blank" aria-hidden />)}
        {Array.from({ length: n }, (_, i) => {
          const day = addDays(monthStart, i);
          const done = isDone(habit, day);
          const scheduled = isScheduled(habit.schedule, day);
          return (
            <button key={day} className={`mcell ${done ? 'done' : ''} ${scheduled ? '' : 'off'} ${day === today ? 'today' : ''}`} disabled={day > today}
              aria-pressed={done} aria-label={`${formatShort(day)}${done ? ', klar' : ''}`} onClick={() => habitStore.toggle(habit.id, day)}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="row-between" style={{ marginTop: 'var(--s3)' }}>
        <span className="tiny subtle">Denna månad</span>
        <span className="tiny num">{monthRate === null ? '–' : `${Math.round(monthRate * 100)} %`}</span>
      </div>
      <ProgressBar value={monthRate ?? 0} label="Andel klara dagar denna månad" />
    </article>
  );
}

function useHabitStats(habit: Habit, today: string) {
  return useMemo(() => ({
    streak: currentStreak(habit, today),
    best: longestStreak(habit, today),
    rate30: completionRate(habit, addDays(today, -29), today, today),
  }), [habit, today]);
}

function HabitInfo({ habit, stats }: { habit: Habit; stats: ReturnType<typeof useHabitStats> }) {
  const dialogs = useDialogs();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const remove = () => confirm({
    title: 'Ta bort vana?',
    message: `”${habit.name}” och all dess historik tas bort. Arkivera istället om du vill behålla statistiken.`,
    run: () => {
      const removed = habitStore.remove(habit.id);
      if (removed) toast.undo('Vana borttagen', () => habitStore.restore(removed));
    },
  });
  const archive = () => {
    habitStore.update(habit.id, { archived: true });
    toast.undo('Vanan arkiverades', () => habitStore.update(habit.id, { archived: false }));
  };
  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--s3)', minWidth: 0 }}>
      <div className="grow stack-sm" style={{ gap: 3 }}>
        <span className="truncate" style={{ fontWeight: 500 }}>{habit.name}</span>
        <span className="item-meta">
          <span>{scheduleLabel(habit.schedule)}</span>
          <span className="row num" style={{ gap: 3, color: stats.streak > 0 ? 'var(--warn)' : undefined }} title="Nuvarande svit">
            <Flame size={12} aria-hidden /> {stats.streak}<span className="sr-only"> i rad</span>
          </span>
          <span className="num" title="Längsta svit">Bästa {stats.best}</span>
          <span className="num" title="Andel schemalagda dagar klara senaste 30 dagarna">{stats.rate30 === null ? '–' : `${Math.round(stats.rate30 * 100)} %`} 30 d</span>
        </span>
      </div>
      <div className="row" style={{ gap: 0 }}>
        <button className="icon-btn" aria-label={`Redigera ${habit.name}`} onClick={() => dialogs.habit(habit)}><Pencil /></button>
        <button className="icon-btn" aria-label={`Arkivera ${habit.name}`} title="Arkivera" onClick={archive}><Archive /></button>
        <button className="icon-btn danger" aria-label={`Ta bort ${habit.name}`} onClick={remove}><Trash2 /></button>
      </div>
      {confirmDialog}
    </div>
  );
}

function ArchivedRow({ habit, today }: { habit: Habit; today: string }) {
  const best = longestStreak(habit, today);
  return (
    <li className="list-item">
      <div className="item-main">
        <span className="truncate">{habit.name}</span>
        <span className="item-meta"><span>{scheduleLabel(habit.schedule)}</span><span>Bästa svit {best}</span></span>
      </div>
      <button className="btn btn-sm" onClick={() => habitStore.update(habit.id, { archived: false })}><ArchiveRestore /> Återställ</button>
    </li>
  );
}
