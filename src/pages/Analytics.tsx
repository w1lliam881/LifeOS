import { useMemo, useState } from 'react';
import { BookOpen, CheckSquare, GraduationCap, Info, Repeat, Target } from 'lucide-react';
import { useData } from '../lib/store';
import { useToday } from '../lib/useToday';
import { addDays, formatMinutes, formatShort, isoWeekNumber, startOfMonth, startOfWeek } from '../lib/dates';
import { habitConsistencyPerBucket, learningPerBucket, previousRange, summarize, tasksCompletedPerBucket } from '../lib/analytics';
import { completionRate } from '../lib/habits';
import { goalProgress, goalValue, PACE_LABEL, goalPace } from '../lib/goals';
import { BarChart, type BarDatum } from '../components/Charts';
import { EmptyState, PageHeader, ProgressBar, Segmented } from '../components/ui';

type Range = 'week' | 'month' | '7' | '30' | '90';

function rangeFor(range: Range, today: string): [string, string] {
  switch (range) {
    case 'week': return [startOfWeek(today), today];
    case 'month': return [startOfMonth(today), today];
    case '7': return [addDays(today, -6), today];
    case '30': return [addDays(today, -29), today];
    case '90': return [addDays(today, -89), today];
  }
}

const RANGE_LABEL: Record<Range, string> = { week: 'denna vecka', month: 'denna månad', '7': 'senaste 7 dagarna', '30': 'senaste 30 dagarna', '90': 'senaste 90 dagarna' };

export default function Analytics() {
  const today = useToday();
  const tasks = useData((s) => s.tasks);
  const habits = useData((s) => s.habits);
  const sessions = useData((s) => s.sessions);
  const goals = useData((s) => s.goals);
  const subjects = useData((s) => s.subjects);
  const journal = useData((s) => s.journal);
  const [range, setRange] = useState<Range>('30');
  const [from, to] = rangeFor(range, today);

  const data = useMemo(() => {
    const journalDates = Object.keys(journal);
    const input = { tasks, habits, sessions, journalDates };
    const current = summarize(input, from, to, today);
    // Comparable previous period of the same length.
    const [pf, pt] = previousRange(from, to);
    const previous = summarize(input, pf, pt, today);
    const weekly = to.localeCompare(addDays(from, 30)) > 0;
    const label = (key: string) => (weekly ? `v${isoWeekNumber(key)}` : formatShort(key).replace(/ .*/, ''));
    const titleFor = (key: string) => (weekly ? `Vecka ${isoWeekNumber(key)}` : formatShort(key));

    const taskBars: BarDatum[] = tasksCompletedPerBucket(tasks, from, to).map((b) => ({ key: b.key, label: label(b.key), value: b.value, title: `${titleFor(b.key)}: ${b.value} klara` }));
    const habitBars: BarDatum[] = habitConsistencyPerBucket(habits, from, to, today).map((b) => {
      const pct = b.total ? Math.round((b.value / b.total) * 100) : 0;
      return { key: b.key, label: label(b.key), value: pct, title: `${titleFor(b.key)}: ${b.total ? `${pct} % (${b.value} av ${b.total})` : 'inget schemalagt'}`, highlight: b.total > 0 };
    });
    const learnBars: BarDatum[] = learningPerBucket(sessions, from, to).map((b) => ({ key: b.key, label: label(b.key), value: b.value, title: `${titleFor(b.key)}: ${formatMinutes(b.value)}` }));

    const perHabit = habits.filter((h) => !h.archived).map((h) => ({ habit: h, rate: completionRate(h, from, to, today) })).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
    const perSubject = subjects.map((s) => ({ subject: s, minutes: sessions.filter((x) => x.subjectId === s.id && x.date >= from && x.date <= to).reduce((a, x) => a + x.minutes, 0) }))
      .filter((x) => x.minutes > 0).sort((a, b) => b.minutes - a.minutes);
    return { current, previous, taskBars, habitBars, learnBars, perHabit, perSubject, weekly };
  }, [tasks, habits, sessions, subjects, journal, from, to, today]);

  const activeGoals = goals.filter((g) => !g.archived);
  const { current, previous } = data;
  const maxSubject = Math.max(1, ...data.perSubject.map((x) => x.minutes));
  const hasAny = tasks.length + habits.length + sessions.length + goals.length > 0;

  return (
    <div className="page">
      <PageHeader title="Analys" sub={`Hur det har gått ${RANGE_LABEL[range]}. Jämförs med perioden innan.`} />
      <div className="tabs-scroll">
        <Segmented<Range> label="Period" value={range} onChange={setRange} options={[
          { value: 'week', label: 'Vecka' }, { value: 'month', label: 'Månad' }, { value: '7', label: '7 d' }, { value: '30', label: '30 d' }, { value: '90', label: '90 d' },
        ]} />
      </div>

      {!hasAny ? (
        <section className="card"><EmptyState icon={<Info />} title="Inget att analysera än" text="När du bockar av uppgifter, vanor och loggar lärande dyker mönstren upp här." /></section>
      ) : (
        <div className="stack">
          <section className="grid grid-4" aria-label="Sammanfattning">
            <Stat icon={<CheckSquare />} label="Klara uppgifter" value={String(current.tasksCompleted)} delta={current.tasksCompleted - previous.tasksCompleted}
              help={`Uppgifter markerade som klara under perioden. ${current.tasksCreated} nya skapades.`} />
            <Stat icon={<Repeat />} label="Vanekonsekvens" value={current.habitRate === null ? '–' : `${Math.round(current.habitRate * 100)}`} unit={current.habitRate === null ? '' : '%'}
              delta={current.habitRate !== null && previous.habitRate !== null ? Math.round((current.habitRate - previous.habitRate) * 100) : undefined} deltaUnit=" p.e."
              help="Andel av alla schemalagda vanedagar som blev gjorda. Dagens ej avbockade räknas inte." />
            <Stat icon={<GraduationCap />} label="Lärande" value={formatMinutes(current.learningMinutes)} delta={current.learningMinutes - previous.learningMinutes} deltaFormat={(n) => formatMinutes(Math.abs(n))}
              help={`Total loggad studietid i ${current.learningSessions} lärpass.`} />
            <Stat icon={<BookOpen />} label="Journaldagar" value={String(current.journalDays)} delta={current.journalDays - previous.journalDays}
              help="Dagar med minst en anteckning eller humör." />
          </section>

          <div className="grid grid-2">
            <ChartCard title="Uppgifter klara" icon={<CheckSquare />} help={`Antal avbockade uppgifter per ${data.weekly ? 'vecka' : 'dag'}.`}>
              <BarChart data={data.taskBars} ariaLabel="Klara uppgifter över tid" />
            </ChartCard>
            <ChartCard title="Vanekonsekvens" icon={<Repeat />} help={`Andel schemalagda vanor som gjordes per ${data.weekly ? 'vecka' : 'dag'}. Grå staplar = inget schemalagt.`}>
              <BarChart data={data.habitBars} max={100} format={(v) => `${v}%`} ariaLabel="Vanekonsekvens över tid" />
            </ChartCard>
            <ChartCard title="Tid för lärande" icon={<GraduationCap />} help={`Minuter loggade per ${data.weekly ? 'vecka' : 'dag'}.`}>
              <BarChart data={data.learnBars} ariaLabel="Minuter lärande över tid" />
              {data.perSubject.length > 0 && (
                <div className="stack-sm" style={{ marginTop: 'var(--s4)' }}>
                  {data.perSubject.map(({ subject, minutes }) => (
                    <div key={subject.id} className="stack-sm" style={{ gap: 4 }}>
                      <div className="row-between"><span className="small">{subject.name}</span><span className="small subtle num">{formatMinutes(minutes)}</span></div>
                      <ProgressBar value={minutes / maxSubject} label={`${subject.name}: andel av tiden`} />
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
            <ChartCard title="Vanor var för sig" icon={<Repeat />} help="Andel schemalagda dagar som gjordes under perioden, per vana.">
              {data.perHabit.length === 0 ? <p className="small subtle">Inga aktiva vanor.</p> : (
                <div className="stack-sm">
                  {data.perHabit.map(({ habit, rate }) => (
                    <div key={habit.id} className="stack-sm" style={{ gap: 4 }}>
                      <div className="row-between"><span className="small truncate">{habit.name}</span><span className="small subtle num">{rate === null ? '–' : `${Math.round(rate * 100)} %`}</span></div>
                      <ProgressBar value={rate ?? 0} label={habit.name} />
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Målens läge" icon={<Target />} help="Nuvarande värde mot målvärdet. Takten jämför framsteg med hur stor del av tiden som gått.">
            {activeGoals.length === 0 ? <p className="small subtle">Inga aktiva mål.</p> : (
              <div className="grid grid-2" style={{ rowGap: 'var(--s4)' }}>
                {activeGoals.map((g) => (
                  <div key={g.id} className="stack-sm" style={{ gap: 4 }}>
                    <div className="row-between">
                      <span className="small truncate">{g.title}</span>
                      <span className="tiny subtle num" style={{ flexShrink: 0 }}>{goalValue(g, today).toLocaleString('sv-SE')} / {g.target.toLocaleString('sv-SE')} {g.unit} · {PACE_LABEL[goalPace(g, today)]}</span>
                    </div>
                    <ProgressBar value={goalProgress(g, today)} label={g.title} tone={g.horizon === 'long' ? 'ivory' : undefined} />
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          <p className="tiny subtle" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <Info size={13} style={{ marginTop: 2, flexShrink: 0 }} aria-hidden />
            LIFE OS slår medvetet inte ihop allt till ett produktivitetsbetyg – olika delar av livet går inte att jämföra med en siffra. Varje mått ovan visar exakt vad det räknar.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, unit, delta, deltaUnit = '', deltaFormat, help }: { icon: React.ReactNode; label: string; value: string; unit?: string; delta?: number; deltaUnit?: string; deltaFormat?: (n: number) => string; help: string }) {
  return (
    <div className="card card-tight stat">
      <span className="row subtle" style={{ gap: 6 }}><span aria-hidden style={{ display: 'contents' }}>{icon}</span><span className="stat-label">{label}</span></span>
      <span className="stat-value">{value}{unit && <span className="unit">{unit}</span>}</span>
      {delta !== undefined && (
        <span className={`delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'subtle'}`}>
          {delta === 0 ? 'Samma som förra perioden' : `${delta > 0 ? '+' : '−'}${deltaFormat ? deltaFormat(delta) : Math.abs(delta)}${deltaUnit} mot förra perioden`}
        </span>
      )}
      <span className="stat-help">{help}</span>
    </div>
  );
}

function ChartCard({ title, icon, help, children }: { title: string; icon: React.ReactNode; help: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div style={{ marginBottom: 'var(--s4)' }}>
        <h2 className="card-title">{icon} {title}</h2>
        <p className="tiny subtle" style={{ marginTop: 4 }}>{help}</p>
      </div>
      {children}
    </section>
  );
}
