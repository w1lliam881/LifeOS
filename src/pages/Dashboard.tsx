import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, CheckSquare, GraduationCap, Play, Plus, Repeat, Sparkles, Star, Target, X } from 'lucide-react';
import { app, habits as habitStore, useData } from '../lib/store';
import { useToday } from '../lib/useToday';
import { formatLong, formatMinutes, greeting } from '../lib/dates';
import { completionPercent, tasksForDay } from '../lib/tasks';
import { currentStreak, habitsForDay, isDone, scheduleLabel } from '../lib/habits';
import { goalProgress, goalValue } from '../lib/goals';
import { weekMinutes } from '../lib/learning';
import { promptForDay } from '../lib/prompts';
import { hasSampleData } from '../lib/sample';
import { href, navigate } from '../lib/router';
import { Checkbox, EmptyState, ProgressBar, Ring } from '../components/ui';
import { TaskItem } from '../components/TaskItem';
import { QuickAddTask } from '../components/QuickAddTask';
import { useDialogs } from '../components/Dialogs';
import { useTaskActions } from '../components/useTaskActions';
import { useToast } from '../components/Toast';

export default function Dashboard() {
  const today = useToday();
  const settings = useData((s) => s.settings);
  const dialogs = useDialogs();
  const name = settings.name.trim();

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="hero-date">{formatLong(today)}</p>
          <h1 className="hero-title">
            {greeting()}{name ? <>, <em>{name}</em></> : ''}.
          </h1>
        </div>
        <div className="page-actions" aria-label="Snabbåtgärder">
          <button className="btn" onClick={() => dialogs.task()}><CheckSquare /> Uppgift</button>
          <button className="btn" onClick={() => dialogs.habit()}><Repeat /> Vana</button>
          <button className="btn" onClick={() => dialogs.goal()}><Target /> Mål</button>
          <button className="btn" onClick={() => dialogs.session()}><GraduationCap /> Lärpass</button>
        </div>
      </section>

      {!settings.onboarded && <Welcome />}

      <div className="stack">
        <Overview today={today} />
        <div className="grid grid-3">
          <div className="span-2"><TodayCard today={today} /></div>
          <HabitsToday today={today} />
        </div>
        <div className="grid grid-3">
          <WeeklyGoals today={today} />
          <LearningNow today={today} />
          <Reflection today={today} />
        </div>
      </div>
    </div>
  );
}

function Welcome() {
  const [name, setName] = useState('');
  const sample = useData(hasSampleData);
  const toast = useToast();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    app.updateSettings({ name: name.trim().slice(0, 40), onboarded: true });
  };
  return (
    <section className="card" style={{ marginBottom: 'var(--s4)' }} aria-labelledby="welcome-title">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div className="stack-sm" style={{ maxWidth: 560 }}>
          <h2 id="welcome-title" className="card-title"><Sparkles /> Välkommen till LIFE OS</h2>
          <p className="muted">
            Allt du behöver för dagen finns här på översikten: dina uppgifter, vanor att bocka av och en kort reflektion.
            {sample && ' Appen är ifylld med exempel så att du ser hur den fungerar – rensa dem när du vill börja på riktigt.'}
          </p>
        </div>
        <button className="icon-btn" aria-label="Stäng välkomstrutan" onClick={() => app.updateSettings({ onboarded: true })}><X /></button>
      </div>
      <form className="row wrap" style={{ marginTop: 'var(--s4)' }} onSubmit={submit}>
        <label htmlFor="welcome-name" className="sr-only">Ditt förnamn</label>
        <input id="welcome-name" className="input" style={{ maxWidth: 240 }} placeholder="Vad heter du?" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
        <button className="btn btn-primary" type="submit">Kom igång</button>
        {sample && (
          <button type="button" className="btn btn-ghost" onClick={() => { app.removeSampleData(); app.updateSettings({ name: name.trim().slice(0, 40), onboarded: true }); toast.show('Exempeldata borttagen – nu är det ditt'); }}>
            Börja med tom app
          </button>
        )}
      </form>
    </section>
  );
}

function Overview({ today }: { today: string }) {
  const taskList = useData((s) => s.tasks);
  const habitList = useData((s) => s.habits);
  const goalList = useData((s) => s.goals);
  const subjects = useData((s) => s.subjects);
  const sessions = useData((s) => s.sessions);

  const stats = useMemo(() => {
    const t = tasksForDay(taskList, today);
    const h = habitsForDay(habitList, today);
    const weekly = goalList.filter((g) => !g.archived && g.horizon === 'weekly');
    const weeklyAvg = weekly.length ? weekly.reduce((s, g) => s + goalProgress(g, today), 0) / weekly.length : 0;
    const target = subjects.filter((s) => !s.archived).reduce((s, x) => s + x.weeklyTargetMinutes, 0);
    const minutes = weekMinutes(sessions, today);
    return { t, h, weekly, weeklyAvg, target, minutes };
  }, [taskList, habitList, goalList, subjects, sessions, today]);

  const { t, h, weekly, weeklyAvg, target, minutes } = stats;
  const taskPct = completionPercent(t.open.length, t.done.length);

  return (
    <section className="card card-tight" aria-label="Dagens läge">
      <div className="overview">
        <div>
          <Ring value={taskPct / 100} label="Uppgifter klara idag"><span className="tiny">{taskPct}%</span></Ring>
          <div className="stat">
            <span className="stat-label">Uppgifter idag</span>
            <span className="small subtle num">{t.done.length} av {t.open.length + t.done.length} klara</span>
          </div>
        </div>
        <div>
          <Ring value={h.total ? h.done / h.total : 0} label="Vanor klara idag"><span className="tiny">{h.done}/{h.total}</span></Ring>
          <div className="stat">
            <span className="stat-label">Vanor idag</span>
            <span className="small subtle">{h.total === 0 ? 'Inga schemalagda' : h.done === h.total ? 'Alla klara' : `${h.total - h.done} kvar`}</span>
          </div>
        </div>
        <div>
          <Ring value={weeklyAvg} label="Veckomål i snitt"><span className="tiny">{Math.round(weeklyAvg * 100)}%</span></Ring>
          <div className="stat">
            <span className="stat-label">Veckans mål</span>
            <span className="small subtle">{weekly.length ? `${weekly.filter((g) => goalProgress(g, today) >= 1).length} av ${weekly.length} uppnådda` : 'Inga veckomål'}</span>
          </div>
        </div>
        <div>
          <Ring value={target ? minutes / target : 0} label="Lärande mot veckomål"><span className="tiny">{target ? `${Math.round(Math.min(1, minutes / target) * 100)}%` : '–'}</span></Ring>
          <div className="stat">
            <span className="stat-label">Lärande i veckan</span>
            <span className="small subtle num">{formatMinutes(minutes)}{target ? ` av ${formatMinutes(target)}` : ''}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TodayCard({ today }: { today: string }) {
  const taskList = useData((s) => s.tasks);
  const actions = useTaskActions();
  const { open, done } = useMemo(() => tasksForDay(taskList, today), [taskList, today]);
  const focus = useMemo(() => taskList.filter((t) => t.focusDate === today && !t.completed).slice(0, 3), [taskList, today]);
  const focusIds = new Set(focus.map((f) => f.id));
  const rest = open.filter((t) => !focusIds.has(t.id));
  const focusDone = taskList.filter((t) => t.focusDate === today && t.completed);

  return (
    <section className="card" aria-labelledby="today-title" style={{ height: '100%' }}>
      <div className="card-header">
        <h2 id="today-title" className="card-title"><CheckSquare /> Idag</h2>
        <a className="card-link" href={href('tasks')}>Alla uppgifter <ArrowRight /></a>
      </div>

      <div className="stack-sm" style={{ marginBottom: 'var(--s4)' }}>
        <div className="row-between">
          <span className="eyebrow">Dagens fokus</span>
          <span className="tiny subtle">{focusDone.length > 0 ? `${focusDone.length} klara` : 'Max tre saker som verkligen spelar roll'}</span>
        </div>
        {focus.length === 0 ? (
          <p className="small subtle" style={{ padding: '6px 0' }}>
            Markera upp till tre uppgifter med <Star size={12} style={{ display: 'inline', verticalAlign: '-1px' }} aria-label="stjärna" /> för att göra dem till dagens prioriteringar.
          </p>
        ) : (
          focus.map((t, i) => (
            <div key={t.id} className="focus-item">
              <span className="focus-num" aria-hidden>{i + 1}</span>
              <Checkbox checked={false} onChange={() => actions.toggle(t)} label={`Markera ”${t.title}” som klar`} />
              <button className="item-title grow" onClick={() => actions.edit(t)}>{t.title}</button>
              <button className="icon-btn active" onClick={() => actions.focus(t)} aria-label="Ta bort från dagens fokus"><Star fill="currentColor" /></button>
            </div>
          ))
        )}
      </div>

      <QuickAddTask />

      {rest.length === 0 && done.length === 0 ? (
        <EmptyState compact icon={<CheckSquare />} title="Inget planerat för idag" text="Lägg till något ovan, eller ta det lugnt." />
      ) : (
        <ul className="list" style={{ marginTop: 'var(--s2)' }}>
          {rest.map((t) => (
            <TaskItem key={t.id} task={t} today={today} onToggle={actions.toggle} onEdit={actions.edit} onFocus={focus.length < 3 ? actions.focus : undefined} hideDate={t.dueDate === today} />
          ))}
          {done.map((t) => (
            <TaskItem key={t.id} task={t} today={today} onToggle={actions.toggle} onEdit={actions.edit} hideDate />
          ))}
        </ul>
      )}
    </section>
  );
}

function HabitsToday({ today }: { today: string }) {
  const habitList = useData((s) => s.habits);
  const dialogs = useDialogs();
  const { due } = useMemo(() => habitsForDay(habitList, today), [habitList, today]);

  return (
    <section className="card" aria-labelledby="habits-title" style={{ height: '100%' }}>
      <div className="card-header">
        <h2 id="habits-title" className="card-title"><Repeat /> Vanor idag</h2>
        <a className="card-link" href={href('habits')}>Visa alla <ArrowRight /></a>
      </div>
      {due.length === 0 ? (
        <EmptyState compact icon={<Repeat />} title={habitList.length ? 'Inget schemalagt idag' : 'Inga vanor ännu'} text={habitList.length ? 'Vila är också en del av rutinen.' : 'Börja med en enda liten vana.'}
          action={!habitList.length && <button className="btn btn-sm" onClick={() => dialogs.habit()}><Plus /> Ny vana</button>} />
      ) : (
        <ul className="list">
          {due.map((h) => {
            const done = isDone(h, today);
            const streak = currentStreak(h, today);
            return (
              <li key={h.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => habitStore.toggle(h.id, today)}>
                <Checkbox checked={done} onChange={() => habitStore.toggle(h.id, today)} label={`${h.name}: ${done ? 'klar' : 'inte klar'} idag`} size="lg" />
                <div className="item-main">
                  <span className={`truncate ${done ? 'muted' : ''}`}>{h.name}</span>
                  <span className="item-meta">
                    {streak > 0 ? <span className="num">{streak} i rad</span> : <span>{scheduleLabel(h.schedule)}</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function WeeklyGoals({ today }: { today: string }) {
  const goalList = useData((s) => s.goals);
  const dialogs = useDialogs();
  const list = useMemo(() => {
    const active = goalList.filter((g) => !g.archived);
    const weekly = active.filter((g) => g.horizon === 'weekly');
    return (weekly.length ? [...weekly, ...active.filter((g) => g.horizon === 'long')] : active).slice(0, 4);
  }, [goalList]);

  return (
    <section className="card" aria-labelledby="goals-title">
      <div className="card-header">
        <h2 id="goals-title" className="card-title"><Target /> Mål</h2>
        <a className="card-link" href={href('goals')}>Alla mål <ArrowRight /></a>
      </div>
      {list.length === 0 ? (
        <EmptyState compact icon={<Target />} title="Inga mål ännu" text="Ett mätbart mål gör framsteg synliga." action={<button className="btn btn-sm" onClick={() => dialogs.goal()}><Plus /> Nytt mål</button>} />
      ) : (
        <div className="stack">
          {list.map((g) => {
            const p = goalProgress(g, today);
            return (
              <button key={g.id} className="stack-sm" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => navigate('goals')}>
                <div className="row-between">
                  <span className="truncate">{g.title}</span>
                  <span className="tiny subtle num" style={{ flexShrink: 0 }}>{goalValue(g, today).toLocaleString('sv-SE')} / {g.target.toLocaleString('sv-SE')} {g.unit}</span>
                </div>
                <ProgressBar value={p} label={g.title} tone={g.horizon === 'long' ? 'ivory' : undefined} />
                <span className="tiny subtle">{g.horizon === 'weekly' ? 'Denna vecka' : g.category}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LearningNow({ today }: { today: string }) {
  const subjects = useData((s) => s.subjects);
  const sessions = useData((s) => s.sessions);
  const timer = useData((s) => s.timer);
  const dialogs = useDialogs();
  const list = useMemo(() => {
    const active = subjects.filter((s) => !s.archived);
    const last = new Map<string, string>();
    for (const s of sessions) if ((last.get(s.subjectId) ?? '') < s.date) last.set(s.subjectId, s.date);
    return active.sort((a, b) => (last.get(b.id) ?? '').localeCompare(last.get(a.id) ?? '')).slice(0, 3);
  }, [subjects, sessions]);
  const timerSubject = subjects.find((s) => s.id === timer?.subjectId);

  return (
    <section className="card" aria-labelledby="learn-title">
      <div className="card-header">
        <h2 id="learn-title" className="card-title"><GraduationCap /> Lärande</h2>
        <a className="card-link" href={href('learning')}>Öppna <ArrowRight /></a>
      </div>
      {timerSubject && (
        <a href={href('learning')} className="timer" style={{ textDecoration: 'none', padding: '8px 12px', marginBottom: 'var(--s3)' }}>
          <span className="row"><span className="pulse" aria-hidden /> <span className="small">Pågår: {timerSubject.name}</span></span>
          <ArrowRight size={14} aria-hidden />
        </a>
      )}
      {list.length === 0 ? (
        <EmptyState compact icon={<GraduationCap />} title="Inga ämnen ännu" text="Vad vill du bli bättre på?" action={<button className="btn btn-sm" onClick={() => dialogs.subject()}><Plus /> Nytt ämne</button>} />
      ) : (
        <div className="stack">
          {list.map((s) => {
            const m = weekMinutes(sessions, today, s.id);
            return (
              <div key={s.id} className="stack-sm">
                <div className="row-between">
                  <span className="truncate">{s.name}</span>
                  <span className="row" style={{ gap: 4, flexShrink: 0 }}>
                    <span className="tiny subtle num">{formatMinutes(m)}{s.weeklyTargetMinutes ? ` / ${formatMinutes(s.weeklyTargetMinutes)}` : ''}</span>
                    <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => dialogs.session(undefined, { subjectId: s.id })} aria-label={`Logga lärpass i ${s.name}`}><Play size={13} /></button>
                  </span>
                </div>
                <ProgressBar value={s.weeklyTargetMinutes ? m / s.weeklyTargetMinutes : 0} label={`${s.name} denna vecka`} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Reflection({ today }: { today: string }) {
  const entry = useData((s) => s.journal[today]);
  const hasContent = !!entry;
  return (
    <section className="card reflection" aria-labelledby="reflect-title">
      <div className="card-header">
        <h2 id="reflect-title" className="card-title"><BookOpen /> Reflektion</h2>
        {hasContent && <span className="badge badge-accent">Skriven idag</span>}
      </div>
      <p className="reflection-q">{promptForDay(today)}</p>
      <p className="small subtle" style={{ margin: 'var(--s3) 0 var(--s4)' }}>
        {hasContent ? 'Du har redan skrivit idag. Lägg gärna till något.' : 'Två minuter räcker. Skriv det första du tänker.'}
      </p>
      <a className="btn btn-sm" href={href('journal')}>{hasContent ? 'Fortsätt skriva' : 'Skriv i journalen'} <ArrowRight /></a>
    </section>
  );
}
