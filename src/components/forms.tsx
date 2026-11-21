import { useId, useMemo, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Field, Segmented } from './ui';
import { useToast } from './Toast';
import { addDays, isDateKey, startOfWeek, todayKey, WEEKDAYS_SHORT } from '../lib/dates';
import { goals, habits, learning, tasks, useData } from '../lib/store';
import { projectsOf, PRIORITY_LABEL } from '../lib/tasks';
import { LEARNING_CATEGORIES } from '../lib/learning';
import type { Goal, GoalHorizon, Habit, LearningSession, Priority, Subject, Task } from '../lib/types';

const MAX_TITLE = 200;

function Footer({ onCancel, submitLabel, formId, extra }: { onCancel: () => void; submitLabel: string; formId: string; extra?: React.ReactNode }) {
  return (
    <>
      {extra && <div className="left">{extra}</div>}
      <button type="button" className="btn btn-ghost" onClick={onCancel}>Avbryt</button>
      <button type="submit" form={formId} className="btn btn-primary">{submitLabel}</button>
    </>
  );
}

// ---------------------------------------------------------------- Task

export function TaskDialog({ open, task, defaults, onClose }: { open: boolean; task?: Task; defaults?: Partial<Task>; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={task ? 'Redigera uppgift' : 'Ny uppgift'} footer={<Footer onCancel={onClose} submitLabel={task ? 'Spara' : 'Lägg till'} formId="task-form" />}>
      {open && <TaskForm task={task} defaults={defaults} onDone={onClose} />}
    </Modal>
  );
}

function TaskForm({ task, defaults, onDone }: { task?: Task; defaults?: Partial<Task>; onDone: () => void }) {
  const id = useId();
  const toast = useToast();
  const allTasks = useData((s) => s.tasks);
  const projects = useMemo(() => projectsOf(allTasks), [allTasks]);
  const today = todayKey();
  const init = task ?? defaults ?? {};
  const [title, setTitle] = useState(init.title ?? '');
  const [description, setDescription] = useState(init.description ?? '');
  const [dueDate, setDueDate] = useState(init.dueDate ?? (task ? '' : today));
  const [priority, setPriority] = useState<Priority>(init.priority ?? 'medium');
  const [project, setProject] = useState(init.project ?? '');
  const [error, setError] = useState<{ title?: string; dueDate?: string }>({});

  const quick = [
    { label: 'Idag', value: today },
    { label: 'Imorgon', value: addDays(today, 1) },
    { label: 'Nästa vecka', value: addDays(startOfWeek(today), 7) },
    { label: 'Inget datum', value: '' },
  ];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof error = {};
    if (!title.trim()) errs.title = 'Ge uppgiften en titel.';
    else if (title.trim().length > MAX_TITLE) errs.title = `Max ${MAX_TITLE} tecken.`;
    if (dueDate && !isDateKey(dueDate)) errs.dueDate = 'Ogiltigt datum.';
    setError(errs);
    if (Object.keys(errs).length) return;
    const data = { title: title.trim(), description: description.trim() || undefined, dueDate: dueDate || undefined, priority, project: project.trim() || undefined };
    if (task) {
      tasks.update(task.id, data);
      toast.show('Uppgiften sparades');
    } else {
      tasks.add(data);
      toast.show('Uppgift tillagd');
    }
    onDone();
  };

  return (
    <form id="task-form" className="form" onSubmit={submit} noValidate>
      <Field label="Titel" htmlFor={`${id}-t`} error={error.title}>
        <input id={`${id}-t`} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vad behöver göras?" maxLength={MAX_TITLE + 20} aria-invalid={!!error.title} autoComplete="off" />
      </Field>
      <Field label="Beskrivning" optional htmlFor={`${id}-d`}>
        <textarea id={`${id}-d`} className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Detaljer, länkar, delsteg…" />
      </Field>
      <Field label="Datum" htmlFor={`${id}-due`} error={error.dueDate}>
        <div className="chips" style={{ marginBottom: 4 }}>
          {quick.map((q) => (
            <button key={q.label} type="button" className="chip" aria-pressed={dueDate === q.value} onClick={() => setDueDate(q.value)}>{q.label}</button>
          ))}
        </div>
        <input id={`${id}-due`} type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-invalid={!!error.dueDate} />
      </Field>
      <div className="form-row">
        <div className="field">
          <span className="label">Prioritet</span>
          <Segmented label="Prioritet" value={priority} onChange={setPriority} options={(['low', 'medium', 'high'] as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
        </div>
        <Field label="Projekt / kategori" optional htmlFor={`${id}-p`}>
          <input id={`${id}-p`} className="input" value={project} onChange={(e) => setProject(e.target.value)} list={`${id}-pl`} placeholder="t.ex. Hem, Jobb" autoComplete="off" />
          <datalist id={`${id}-pl`}>{projects.map((p) => <option key={p} value={p} />)}</datalist>
        </Field>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Goal

const GOAL_CATEGORIES = ['Hälsa', 'Ekonomi', 'Karriär', 'Lärande', 'Relationer', 'Personligt'];

export function GoalDialog({ open, goal, onClose }: { open: boolean; goal?: Goal; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={goal ? 'Redigera mål' : 'Nytt mål'} footer={<Footer onCancel={onClose} submitLabel={goal ? 'Spara' : 'Skapa mål'} formId="goal-form" />}>
      {open && <GoalForm goal={goal} onDone={onClose} />}
    </Modal>
  );
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const id = useId();
  const toast = useToast();
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [category, setCategory] = useState(goal?.category ?? 'Personligt');
  const [horizon, setHorizon] = useState<GoalHorizon>(goal?.horizon ?? 'long');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [target, setTarget] = useState(goal ? String(goal.target) : '');
  const [unit, setUnit] = useState(goal?.unit ?? '');
  const [startValue, setStartValue] = useState(goal ? String(goal.startValue) : '0');
  const [error, setError] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const t = Number(target.replace(',', '.'));
    const sv = Number((startValue || '0').replace(',', '.'));
    if (!title.trim()) errs.title = 'Ge målet en titel.';
    if (!target.trim() || !Number.isFinite(t) || t <= 0) errs.target = 'Ange ett mätbart mål större än 0.';
    if (!Number.isFinite(sv)) errs.startValue = 'Ange ett tal.';
    if (deadline && !isDateKey(deadline)) errs.deadline = 'Ogiltigt datum.';
    setError(errs);
    if (Object.keys(errs).length) return;
    const data = { title: title.trim(), description: description.trim() || undefined, category: category.trim() || 'Personligt', horizon, deadline: horizon === 'long' && deadline ? deadline : undefined, target: t, unit: unit.trim(), startValue: horizon === 'weekly' ? 0 : sv };
    if (goal) {
      goals.update(goal.id, data);
      toast.show('Målet sparades');
    } else {
      goals.add(data);
      toast.show('Mål skapat');
    }
    onDone();
  };

  return (
    <form id="goal-form" className="form" onSubmit={submit} noValidate>
      <Field label="Mål" htmlFor={`${id}-t`} error={error.title}>
        <input id={`${id}-t`} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="t.ex. Springa 100 km" aria-invalid={!!error.title} autoComplete="off" />
      </Field>
      <div className="field">
        <span className="label">Tidshorisont</span>
        <Segmented label="Tidshorisont" value={horizon} onChange={setHorizon} options={[{ value: 'weekly', label: 'Varje vecka' }, { value: 'long', label: 'Långsiktigt' }]} />
        <span className="hint">{horizon === 'weekly' ? 'Nollställs varje måndag – bra för återkommande mål.' : 'Byggs upp över tid mot en deadline.'}</span>
      </div>
      <div className="form-row-3">
        {horizon === 'long' && (
          <Field label="Startvärde" htmlFor={`${id}-s`} error={error.startValue}>
            <input id={`${id}-s`} className="input" inputMode="decimal" value={startValue} onChange={(e) => setStartValue(e.target.value)} aria-invalid={!!error.startValue} />
          </Field>
        )}
        <Field label="Målvärde" htmlFor={`${id}-v`} error={error.target}>
          <input id={`${id}-v`} className="input" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="100" aria-invalid={!!error.target} />
        </Field>
        <Field label="Enhet" optional htmlFor={`${id}-u`}>
          <input id={`${id}-u`} className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km, kr, böcker" autoComplete="off" />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Kategori" htmlFor={`${id}-c`}>
          <input id={`${id}-c`} className="input" value={category} onChange={(e) => setCategory(e.target.value)} list={`${id}-cl`} autoComplete="off" />
          <datalist id={`${id}-cl`}>{GOAL_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        {horizon === 'long' && (
          <Field label="Deadline" optional htmlFor={`${id}-dl`} error={error.deadline}>
            <input id={`${id}-dl`} type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Varför är det viktigt?" optional htmlFor={`${id}-d`}>
        <textarea id={`${id}-d`} className="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
    </form>
  );
}

// ---------------------------------------------------------------- Habit

export function HabitDialog({ open, habit, onClose }: { open: boolean; habit?: Habit; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={habit ? 'Redigera vana' : 'Ny vana'} footer={<Footer onCancel={onClose} submitLabel={habit ? 'Spara' : 'Skapa vana'} formId="habit-form" />}>
      {open && <HabitForm habit={habit} onDone={onClose} />}
    </Modal>
  );
}

function HabitForm({ habit, onDone }: { habit?: Habit; onDone: () => void }) {
  const id = useId();
  const toast = useToast();
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [mode, setMode] = useState<'daily' | 'weekdays'>(habit?.schedule.type ?? 'daily');
  const [days, setDays] = useState<number[]>(habit?.schedule.type === 'weekdays' ? habit.schedule.days : [0, 1, 2, 3, 4]);
  const [error, setError] = useState<Record<string, string>>({});

  const toggleDay = (d: number) => setDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d].sort()));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Ge vanan ett namn.';
    if (mode === 'weekdays' && days.length === 0) errs.days = 'Välj minst en dag.';
    setError(errs);
    if (Object.keys(errs).length) return;
    const schedule: Habit['schedule'] = mode === 'daily' || days.length === 7 ? { type: 'daily' } : { type: 'weekdays', days };
    const data = { name: name.trim(), description: description.trim() || undefined, schedule };
    if (habit) {
      habits.update(habit.id, data);
      toast.show('Vanan sparades');
    } else {
      habits.add(data);
      toast.show('Vana skapad');
    }
    onDone();
  };

  return (
    <form id="habit-form" className="form" onSubmit={submit} noValidate>
      <Field label="Vana" htmlFor={`${id}-n`} error={error.name} hint="Gör den liten och konkret – t.ex. ”Gå 10 minuter efter lunch”.">
        <input id={`${id}-n`} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Meditera 5 minuter" aria-invalid={!!error.name} autoComplete="off" />
      </Field>
      <div className="field">
        <span className="label">Hur ofta?</span>
        <Segmented label="Schema" value={mode} onChange={setMode} options={[{ value: 'daily', label: 'Varje dag' }, { value: 'weekdays', label: 'Vissa dagar' }]} />
      </div>
      {mode === 'weekdays' && (
        <div className="field">
          <div className="daypick" role="group" aria-label="Veckodagar">
            {WEEKDAYS_SHORT.map((d, i) => (
              <button key={d} type="button" aria-pressed={days.includes(i)} aria-label={d} onClick={() => toggleDay(i)}>{d.slice(0, 2)}</button>
            ))}
          </div>
          <div className="chips">
            <button type="button" className="chip" onClick={() => setDays([0, 1, 2, 3, 4])}>Vardagar</button>
            <button type="button" className="chip" onClick={() => setDays([5, 6])}>Helger</button>
            <button type="button" className="chip" onClick={() => setDays([0, 2, 4])}>Mån, ons, fre</button>
          </div>
          {error.days && <span className="error-text" role="alert">{error.days}</span>}
        </div>
      )}
      <Field label="Anteckning" optional htmlFor={`${id}-d`}>
        <input id={`${id}-d`} className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="När, var eller varför" autoComplete="off" />
      </Field>
    </form>
  );
}

// ---------------------------------------------------------------- Subject

export function SubjectDialog({ open, subject, onClose }: { open: boolean; subject?: Subject; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={subject ? 'Redigera ämne' : 'Nytt ämne'} footer={<Footer onCancel={onClose} submitLabel={subject ? 'Spara' : 'Lägg till'} formId="subject-form" />}>
      {open && <SubjectForm subject={subject} onDone={onClose} />}
    </Modal>
  );
}

function SubjectForm({ subject, onDone }: { subject?: Subject; onDone: () => void }) {
  const id = useId();
  const toast = useToast();
  const [name, setName] = useState(subject?.name ?? '');
  const [category, setCategory] = useState(subject?.category ?? 'Programmering');
  const [goal, setGoal] = useState(subject?.goal ?? '');
  const [weekly, setWeekly] = useState(subject ? String(subject.weeklyTargetMinutes) : '120');
  const [topics, setTopics] = useState('');
  const [error, setError] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const w = Number(weekly || '0');
    if (!name.trim()) errs.name = 'Ge ämnet ett namn.';
    if (!Number.isInteger(w) || w < 0 || w > 10_000) errs.weekly = 'Ange minuter som ett heltal (0 = inget mål).';
    setError(errs);
    if (Object.keys(errs).length) return;
    const data = { name: name.trim(), category: category.trim() || 'Övrigt', goal: goal.trim() || undefined, weeklyTargetMinutes: w };
    if (subject) {
      learning.updateSubject(subject.id, data);
      toast.show('Ämnet sparades');
    } else {
      learning.addSubject({ ...data, topics: topics.split('\n') });
      toast.show('Ämne tillagt');
    }
    onDone();
  };

  return (
    <form id="subject-form" className="form" onSubmit={submit} noValidate>
      <div className="form-row">
        <Field label="Ämne" htmlFor={`${id}-n`} error={error.name}>
          <input id={`${id}-n`} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Python" aria-invalid={!!error.name} autoComplete="off" />
        </Field>
        <Field label="Kategori" htmlFor={`${id}-c`}>
          <select id={`${id}-c`} className="select" value={LEARNING_CATEGORIES.includes(category) ? category : 'Övrigt'} onChange={(e) => setCategory(e.target.value)}>
            {LEARNING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Lärandemål" optional htmlFor={`${id}-g`}>
        <input id={`${id}-g`} className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Vad vill du kunna?" autoComplete="off" />
      </Field>
      <Field label="Veckomål (minuter)" htmlFor={`${id}-w`} error={error.weekly}>
        <input id={`${id}-w`} className="input" inputMode="numeric" value={weekly} onChange={(e) => setWeekly(e.target.value.replace(/\D/g, ''))} aria-invalid={!!error.weekly} />
      </Field>
      {!subject && (
        <Field label="Moment att gå igenom" optional htmlFor={`${id}-tp`} hint="Ett moment per rad. Du kan lägga till fler senare.">
          <textarea id={`${id}-tp`} className="textarea" rows={3} value={topics} onChange={(e) => setTopics(e.target.value)} placeholder={'Grunder\nFunktioner\nProjekt'} />
        </Field>
      )}
    </form>
  );
}

// ---------------------------------------------------------------- Session

export function SessionDialog({ open, session, defaults, onClose }: { open: boolean; session?: LearningSession; defaults?: Partial<LearningSession>; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={session ? 'Redigera lärpass' : 'Logga lärpass'} footer={<Footer onCancel={onClose} submitLabel={session ? 'Spara' : 'Logga'} formId="session-form" />}>
      {open && <SessionForm session={session} defaults={defaults} onDone={onClose} />}
    </Modal>
  );
}

function SessionForm({ session, defaults, onDone }: { session?: LearningSession; defaults?: Partial<LearningSession>; onDone: () => void }) {
  const id = useId();
  const toast = useToast();
  const subjects = useData((s) => s.subjects);
  const active = subjects.filter((s) => !s.archived || s.id === session?.subjectId);
  const init = session ?? defaults ?? {};
  const [subjectId, setSubjectId] = useState(init.subjectId ?? active[0]?.id ?? '');
  const [date, setDate] = useState(init.date ?? todayKey());
  const [minutes, setMinutes] = useState(init.minutes ? String(init.minutes) : '30');
  const [topicId, setTopicId] = useState(init.topicId ?? '');
  const [notes, setNotes] = useState(init.notes ?? '');
  const [takeaways, setTakeaways] = useState(init.takeaways ?? '');
  const [error, setError] = useState<Record<string, string>>({});
  const subject = subjects.find((s) => s.id === subjectId);

  if (active.length === 0) {
    return <p className="muted">Lägg till ett ämne först, så kan du logga tid på det.</p>;
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const m = Number(minutes);
    if (!subject) errs.subject = 'Välj ett ämne.';
    if (!Number.isInteger(m) || m <= 0 || m > 24 * 60) errs.minutes = 'Ange minuter mellan 1 och 1440.';
    if (!isDateKey(date)) errs.date = 'Ogiltigt datum.';
    else if (date > todayKey()) errs.date = 'Lärpass kan inte ligga i framtiden.';
    setError(errs);
    if (Object.keys(errs).length) return;
    const data = { subjectId, date, minutes: m, topicId: topicId || undefined, notes: notes.trim() || undefined, takeaways: takeaways.trim() || undefined };
    if (session) {
      learning.updateSession(session.id, data);
      toast.show('Lärpasset sparades');
    } else {
      learning.addSession(data);
      toast.show(`${m} min loggade på ${subject?.name}`);
    }
    onDone();
  };

  return (
    <form id="session-form" className="form" onSubmit={submit} noValidate>
      <div className="form-row">
        <Field label="Ämne" htmlFor={`${id}-s`} error={error.subject}>
          <select id={`${id}-s`} className="select" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }}>
            {active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Datum" htmlFor={`${id}-d`} error={error.date}>
          <input id={`${id}-d`} type="date" className="input" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Tid (minuter)" htmlFor={`${id}-m`} error={error.minutes}>
        <div className="chips" style={{ marginBottom: 4 }}>
          {[15, 25, 45, 60, 90].map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={minutes === String(m)} onClick={() => setMinutes(String(m))}>{m} min</button>
          ))}
        </div>
        <input id={`${id}-m`} className="input" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} aria-invalid={!!error.minutes} />
      </Field>
      {subject && subject.topics.length > 0 && (
        <Field label="Moment" optional htmlFor={`${id}-tp`}>
          <select id={`${id}-tp`} className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">Inget särskilt</option>
            {subject.topics.map((t) => <option key={t.id} value={t.id}>{t.done ? '✓ ' : ''}{t.title}</option>)}
          </select>
        </Field>
      )}
      <Field label="Anteckningar" optional htmlFor={`${id}-n`}>
        <textarea id={`${id}-n`} className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vad gjorde du?" />
      </Field>
      <Field label="Viktigaste lärdom" optional htmlFor={`${id}-k`}>
        <textarea id={`${id}-k`} className="textarea" rows={2} value={takeaways} onChange={(e) => setTakeaways(e.target.value)} placeholder="En sak du vill komma ihåg" />
      </Field>
    </form>
  );
}
