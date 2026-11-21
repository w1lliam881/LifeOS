import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Archive, ArchiveRestore, Clock, GraduationCap, Lightbulb, Pencil, Play, Plus, Square, Trash2, X } from 'lucide-react';
import { learning, useData } from '../lib/store';
import { useToday } from '../lib/useToday';
import { addDays, timestampToKey, formatMinutes, formatRelative, formatShort, rangeKeys, startOfWeek, WEEKDAYS_SHORT } from '../lib/dates';
import { minutesInRange, sortSessions, timerMinutes, topicProgress, weekMinutes } from '../lib/learning';
import type { LearningSession, Subject } from '../lib/types';
import { Checkbox, EmptyState, PageHeader, ProgressBar } from '../components/ui';
import { BarChart } from '../components/Charts';
import { useDialogs } from '../components/Dialogs';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/useConfirm';

export default function Learning() {
  const today = useToday();
  const subjects = useData((s) => s.subjects);
  const sessions = useData((s) => s.sessions);
  const dialogs = useDialogs();
  const [filter, setFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  const active = useMemo(() => subjects.filter((s) => !s.archived), [subjects]);
  const archived = useMemo(() => subjects.filter((s) => s.archived), [subjects]);
  const week = startOfWeek(today);
  const weekTotal = weekMinutes(sessions, today);
  const weekTarget = active.reduce((s, x) => s + x.weeklyTargetMinutes, 0);
  const lastWeek = minutesInRange(sessions, addDays(week, -7), addDays(week, -1));

  const days = useMemo(() => rangeKeys(week, addDays(week, 6)).map((d, i) => ({
    key: d, label: WEEKDAYS_SHORT[i]!, value: minutesInRange(sessions, d, d), title: `${WEEKDAYS_SHORT[i]} ${formatShort(d)}: ${formatMinutes(minutesInRange(sessions, d, d))}`, highlight: d <= today,
  })), [sessions, week, today]);

  const history = useMemo(() => sortSessions(filter === 'all' ? sessions : sessions.filter((s) => s.subjectId === filter)).slice(0, 30), [sessions, filter]);

  return (
    <div className="page">
      <PageHeader
        title="Lärande"
        sub="Ämnen, lärpass och det du vill komma ihåg."
        actions={
          <>
            <button className="btn" onClick={() => dialogs.subject()}><Plus /> Nytt ämne</button>
            <button className="btn btn-primary" onClick={() => dialogs.session()} disabled={active.length === 0}><Clock /> Logga lärpass</button>
          </>
        }
      />

      <Timer />

      {subjects.length === 0 ? (
        <section className="card">
          <EmptyState icon={<GraduationCap />} title="Vad vill du lära dig?" text="Lägg till ett ämne – t.ex. programmering, ekonomi, ett språk eller historia – och logga tid när du studerar."
            action={<button className="btn btn-primary btn-sm" onClick={() => dialogs.subject()}><Plus /> Lägg till ämne</button>} />
        </section>
      ) : (
        <div className="stack">
          <section className="card" aria-labelledby="week-learning">
            <div className="grid grid-3" style={{ alignItems: 'center' }}>
              <div className="stat">
                <h2 id="week-learning" className="stat-label">Den här veckan</h2>
                <span className="stat-value num">{formatMinutes(weekTotal)}</span>
                <span className="stat-help">
                  {weekTarget ? `${Math.round(Math.min(1, weekTotal / weekTarget) * 100)} % av veckomålet ${formatMinutes(weekTarget)}` : 'Inget veckomål satt'}
                  {' · '}förra veckan {formatMinutes(lastWeek)}
                </span>
              </div>
              <div className="span-2">
                <BarChart data={days} height={110} format={(v) => `${v}`} ariaLabel="Minuter lärande per dag denna vecka" labelEvery={1} />
              </div>
            </div>
          </section>

          {active.length > 0 && (
            <div className="grid grid-2">
              {active.map((s) => <SubjectCard key={s.id} subject={s} today={today} />)}
            </div>
          )}

          {archived.length > 0 && (
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowArchived((x) => !x)} aria-expanded={showArchived}><Archive /> Arkiverade ämnen ({archived.length})</button>
              {showArchived && (
                <section className="card" style={{ marginTop: 'var(--s2)' }}>
                  <ul className="list">
                    {archived.map((s) => (
                      <li key={s.id} className="list-item">
                        <div className="item-main"><span>{s.name}</span><span className="item-meta">{formatMinutes(minutesInRange(sessions, '0000-01-01', today, s.id))} totalt</span></div>
                        <button className="btn btn-sm" onClick={() => learning.updateSubject(s.id, { archived: false })}><ArchiveRestore /> Återställ</button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          <section className="card" aria-labelledby="history-title">
            <div className="card-header">
              <h2 id="history-title" className="card-title"><Clock /> Historik</h2>
              <label className="sr-only" htmlFor="hist-filter">Filtrera på ämne</label>
              <select id="hist-filter" className="select" style={{ width: 'auto', height: 30, fontSize: 12.5 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Alla ämnen</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {history.length === 0 ? (
              <EmptyState compact icon={<Clock />} title="Inga lärpass ännu" text="Starta timern på ett ämne eller logga tid i efterhand." />
            ) : (
              <ul className="list">{history.map((s) => <SessionRow key={s.id} session={s} subject={subjects.find((x) => x.id === s.subjectId)} today={today} />)}</ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Timer() {
  const timer = useData((s) => s.timer);
  const subjects = useData((s) => s.subjects);
  const dialogs = useDialogs();
  const [now, setNow] = useState(() => Date.now());
  const subject = subjects.find((s) => s.id === timer?.subjectId);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);

  if (!timer || !subject) return null;
  const secs = Math.max(0, Math.floor((now - new Date(timer.startedAt).getTime()) / 1000));
  const hh = Math.floor(secs / 3600);
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  const stop = () => {
    const minutes = Math.min(24 * 60, timerMinutes(timer.startedAt));
    learning.stopTimer();
    dialogs.session(undefined, { subjectId: subject.id, minutes, date: timestampToKey(timer.startedAt) });
  };

  return (
    <div className="timer" role="timer" aria-live="off">
      <div className="row" style={{ gap: 'var(--s3)' }}>
        <span className="pulse" aria-hidden />
        <div>
          <div className="small muted">Pågående lärpass · {subject.name}</div>
          <div className="timer-time">{hh > 0 ? `${hh}:` : ''}{mm}:{ss}</div>
        </div>
      </div>
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={() => learning.stopTimer()}><X /> Avbryt</button>
        <button className="btn btn-primary btn-sm" onClick={stop}><Square /> Stoppa och spara</button>
      </div>
    </div>
  );
}

function SubjectCard({ subject, today }: { subject: Subject; today: string }) {
  const sessions = useData((s) => s.sessions);
  const timer = useData((s) => s.timer);
  const dialogs = useDialogs();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [topic, setTopic] = useState('');
  const week = weekMinutes(sessions, today, subject.id);
  const total = useMemo(() => sessions.filter((s) => s.subjectId === subject.id).reduce((a, s) => a + s.minutes, 0), [sessions, subject.id]);
  const progress = topicProgress(subject);
  const done = subject.topics.filter((t) => t.done).length;

  const addTopic = (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    learning.addTopic(subject.id, topic);
    setTopic('');
  };

  const remove = () => confirm({
    title: 'Ta bort ämne?',
    message: `”${subject.name}” och alla dess lärpass (${formatMinutes(total)}) tas bort.`,
    run: () => {
      const { subject: s, sessions: removed } = learning.removeSubject(subject.id);
      if (s) toast.undo('Ämne borttaget', () => learning.restoreSubject(s, removed));
    },
  });

  return (
    <article className="card" aria-labelledby={`subj-${subject.id}`}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div className="stack-sm" style={{ gap: 4, minWidth: 0 }}>
          <span className="badge" style={{ alignSelf: 'flex-start' }}>{subject.category}</span>
          <h2 id={`subj-${subject.id}`} style={{ fontSize: 16, marginTop: 4 }}>{subject.name}</h2>
          {subject.goal && <p className="small muted">{subject.goal}</p>}
        </div>
        <div className="row" style={{ gap: 0, flexShrink: 0 }}>
          <button className="icon-btn" aria-label={`Redigera ${subject.name}`} onClick={() => dialogs.subject(subject)}><Pencil /></button>
          <button className="icon-btn" aria-label={`Arkivera ${subject.name}`} title="Arkivera" onClick={() => { learning.updateSubject(subject.id, { archived: true }); toast.undo('Ämnet arkiverades', () => learning.updateSubject(subject.id, { archived: false })); }}><Archive /></button>
          <button className="icon-btn danger" aria-label={`Ta bort ${subject.name}`} onClick={remove}><Trash2 /></button>
        </div>
      </div>

      <div className="stack-sm" style={{ marginTop: 'var(--s4)' }}>
        <div className="row-between">
          <span className="small muted">Denna vecka</span>
          <span className="small num">{formatMinutes(week)}{subject.weeklyTargetMinutes ? ` / ${formatMinutes(subject.weeklyTargetMinutes)}` : ''}</span>
        </div>
        <ProgressBar value={subject.weeklyTargetMinutes ? week / subject.weeklyTargetMinutes : 0} label={`${subject.name}: veckomål`} />
        <span className="tiny subtle">Totalt {formatMinutes(total)}</span>
      </div>

      <div style={{ marginTop: 'var(--s4)' }}>
        <div className="row-between" style={{ marginBottom: 4 }}>
          <span className="eyebrow">Moment</span>
          {subject.topics.length > 0 && <span className="tiny subtle num">{done} av {subject.topics.length} · {Math.round(progress * 100)} %</span>}
        </div>
        <ul className="list">
          {subject.topics.map((t) => (
            <li key={t.id} className="list-item" style={{ padding: '5px 8px' }}>
              <Checkbox square checked={t.done} onChange={() => learning.toggleTopic(subject.id, t.id)} label={`${t.title}: ${t.done ? 'klar' : 'ej klar'}`} />
              <span className={`small grow truncate ${t.done ? 'strike' : ''}`}>{t.title}</span>
              <div className="actions"><button className="icon-btn danger" style={{ width: 28, height: 28 }} aria-label={`Ta bort momentet ${t.title}`} onClick={() => learning.removeTopic(subject.id, t.id)}><X size={14} /></button></div>
            </li>
          ))}
        </ul>
        <form onSubmit={addTopic} className="row" style={{ marginTop: 6 }}>
          <label htmlFor={`topic-${subject.id}`} className="sr-only">Nytt moment</label>
          <input id={`topic-${subject.id}`} className="input" style={{ height: 32 }} placeholder="Lägg till moment" value={topic} onChange={(e) => setTopic(e.target.value)} autoComplete="off" />
          <button className="btn btn-sm" type="submit" disabled={!topic.trim()} aria-label="Lägg till moment"><Plus /></button>
        </form>
      </div>

      <div className="row wrap" style={{ marginTop: 'var(--s4)' }}>
        <button className="btn btn-sm" onClick={() => learning.startTimer(subject.id)} disabled={!!timer}><Play /> Starta timer</button>
        <button className="btn btn-sm btn-ghost" onClick={() => dialogs.session(undefined, { subjectId: subject.id })}><Clock /> Logga i efterhand</button>
      </div>
      {confirmDialog}
    </article>
  );
}

function SessionRow({ session, subject, today }: { session: LearningSession; subject?: Subject; today: string }) {
  const dialogs = useDialogs();
  const toast = useToast();
  const topic = subject?.topics.find((t) => t.id === session.topicId);
  return (
    <li className="list-item" style={{ alignItems: 'flex-start' }}>
      <div className="item-main">
        <div className="row wrap" style={{ gap: 8 }}>
          <span style={{ fontWeight: 500 }}>{subject?.name ?? 'Okänt ämne'}</span>
          <span className="badge num">{formatMinutes(session.minutes)}</span>
          {topic && <span className="tiny subtle">{topic.title}</span>}
        </div>
        {session.notes && <p className="small muted">{session.notes}</p>}
        {session.takeaways && (
          <p className="small row" style={{ alignItems: 'flex-start', gap: 6, color: 'var(--ivory)' }}>
            <Lightbulb size={13} style={{ marginTop: 3, flexShrink: 0 }} aria-label="Lärdom" /> {session.takeaways}
          </p>
        )}
        <span className="tiny subtle">{formatRelative(session.date, today)}</span>
      </div>
      <div className="actions">
        <button className="icon-btn" aria-label="Redigera lärpass" onClick={() => dialogs.session(session)}><Pencil /></button>
        <button className="icon-btn danger" aria-label="Ta bort lärpass" onClick={() => { const r = learning.removeSession(session.id); if (r) toast.undo('Lärpass borttaget', () => learning.restoreSession(r)); }}><Trash2 /></button>
      </div>
    </li>
  );
}
