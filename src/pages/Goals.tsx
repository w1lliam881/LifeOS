import { useMemo, useState, type FormEvent } from 'react';
import { Archive, ArchiveRestore, ChevronDown, ChevronUp, Minus, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { goals as goalStore, useData } from '../lib/store';
import { useToday } from '../lib/useToday';
import { goalHistory, goalPace, goalProgress, goalValue, PACE_LABEL, type Pace } from '../lib/goals';
import { diffDays, formatRelative, formatShort, isDateKey, todayKey } from '../lib/dates';
import type { Goal } from '../lib/types';
import { EmptyState, Field, PageHeader, ProgressBar, Segmented } from '../components/ui';
import { LineChart } from '../components/Charts';
import { Modal } from '../components/Modal';
import { useDialogs } from '../components/Dialogs';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/useConfirm';

type Tab = 'active' | 'weekly' | 'long' | 'archived';

const PACE_BADGE: Record<Pace, string> = {
  done: 'badge-accent', ahead: 'badge-accent', 'on-track': '', behind: 'badge-warn', overdue: 'badge-danger', none: 'badge-outline',
};

const fmt = (n: number) => n.toLocaleString('sv-SE', { maximumFractionDigits: 2 });

export default function Goals() {
  const today = useToday();
  const all = useData((s) => s.goals);
  const dialogs = useDialogs();
  const [tab, setTab] = useState<Tab>('active');
  const [logging, setLogging] = useState<Goal | null>(null);

  const list = useMemo(() => {
    const filtered = all.filter((g) => {
      if (tab === 'archived') return g.archived;
      if (g.archived) return false;
      return tab === 'active' || g.horizon === tab;
    });
    // Weekly first, then by deadline.
    return filtered.sort((a, b) => (a.horizon === b.horizon ? (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') : a.horizon === 'weekly' ? -1 : 1));
  }, [all, tab]);

  const archivedCount = all.filter((g) => g.archived).length;

  return (
    <div className="page">
      <PageHeader title="Mål" sub="Mätbara mål – veckovisa och långsiktiga." actions={<button className="btn btn-primary" onClick={() => dialogs.goal()}><Plus /> Nytt mål</button>} />
      <div className="tabs-scroll">
        <Segmented<Tab> label="Filter" value={tab} onChange={setTab} options={[
          { value: 'active', label: 'Aktiva' },
          { value: 'weekly', label: 'Veckomål' },
          { value: 'long', label: 'Långsiktiga' },
          { value: 'archived', label: 'Arkiv', count: archivedCount || undefined },
        ]} />
      </div>

      {list.length === 0 ? (
        <section className="card">
          {tab === 'archived' ? (
            <EmptyState icon={<Archive />} title="Arkivet är tomt" text="Arkiverade mål sparas här med sin historik." />
          ) : (
            <EmptyState icon={<Target />} title="Inga mål här ännu" text="Ett bra mål är konkret och mätbart: ”Springa 50 km i december” snarare än ”Springa mer”." action={<button className="btn btn-primary btn-sm" onClick={() => dialogs.goal()}><Plus /> Skapa mål</button>} />
          )}
        </section>
      ) : (
        <div className="grid grid-2">
          {list.map((g) => <GoalCard key={g.id} goal={g} today={today} onLog={() => setLogging(g)} />)}
        </div>
      )}

      <LogDialog goal={logging} today={today} onClose={() => setLogging(null)} />
    </div>
  );
}

function GoalCard({ goal, today, onLog }: { goal: Goal; today: string; onLog: () => void }) {
  const dialogs = useDialogs();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const value = goalValue(goal, today);
  const progress = goalProgress(goal, today);
  const pace = goalPace(goal, today);
  const step = goal.target <= 20 ? 1 : undefined;

  const quick = (amount: number) => {
    goalStore.log(goal.id, amount, today);
    if (value < goal.target && value + amount >= goal.target) toast.show(`Mål uppnått: ${goal.title}`);
  };

  const remove = () => confirm({
    title: 'Ta bort mål?',
    message: `”${goal.title}” och hela dess historik tas bort. Vill du hellre spara historiken kan du arkivera målet.`,
    run: () => {
      const removed = goalStore.remove(goal.id);
      if (removed) toast.undo('Mål borttaget', () => goalStore.restore(removed));
    },
  });

  const archive = () => {
    goalStore.update(goal.id, { archived: !goal.archived });
    toast.undo(goal.archived ? 'Målet är aktivt igen' : 'Målet arkiverades', () => goalStore.update(goal.id, { archived: goal.archived }));
  };

  return (
    <article className="card" aria-labelledby={`goal-${goal.id}`}>
      <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 'var(--s3)' }}>
        <div className="stack-sm" style={{ gap: 4, minWidth: 0 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="badge">{goal.horizon === 'weekly' ? 'Varje vecka' : goal.category}</span>
            <span className={`badge ${PACE_BADGE[pace]}`}>{PACE_LABEL[pace]}</span>
          </div>
          <h2 id={`goal-${goal.id}`} style={{ fontSize: 16, marginTop: 4 }}>{goal.title}</h2>
          {goal.description && <p className="small muted">{goal.description}</p>}
        </div>
        <div className="row" style={{ gap: 0, flexShrink: 0 }}>
          <button className="icon-btn" aria-label="Redigera mål" onClick={() => dialogs.goal(goal)}><Pencil /></button>
          <button className="icon-btn" aria-label={goal.archived ? 'Återställ från arkiv' : 'Arkivera'} title={goal.archived ? 'Återställ' : 'Arkivera'} onClick={archive}>{goal.archived ? <ArchiveRestore /> : <Archive />}</button>
          <button className="icon-btn danger" aria-label="Ta bort mål" onClick={remove}><Trash2 /></button>
        </div>
      </div>

      <div className="row-between" style={{ alignItems: 'baseline', marginBottom: 8 }}>
        <span className="stat-value">{fmt(value)}<span className="unit">/ {fmt(goal.target)} {goal.unit}</span></span>
        <span className="small subtle num">{Math.round(progress * 100)} %</span>
      </div>
      <ProgressBar value={progress} label={`Framsteg för ${goal.title}`} size="lg" tone={goal.horizon === 'long' ? 'ivory' : undefined} />
      <p className="tiny subtle" style={{ marginTop: 8 }}>
        {goal.horizon === 'weekly'
          ? `Nollställs på måndag · ${Math.max(0, goal.target - value) ? `${fmt(Math.max(0, goal.target - value))} ${goal.unit} kvar` : 'klart för veckan'}`
          : goal.deadline
            ? `Deadline ${formatRelative(goal.deadline, today)}${goal.deadline >= today ? ` · ${diffDays(today, goal.deadline)} dagar kvar` : ''}`
            : 'Ingen deadline'}
      </p>

      {!goal.archived && (
        <div className="row wrap" style={{ marginTop: 'var(--s4)' }}>
          {step && (
            <>
              <button className="btn btn-sm" onClick={() => quick(1)} aria-label={`Lägg till 1 ${goal.unit}`}><Plus /> 1</button>
              {value > 0 && goal.horizon === 'weekly' && <button className="btn btn-sm btn-ghost" onClick={() => quick(-1)} aria-label="Ta bort 1"><Minus /></button>}
            </>
          )}
          <button className="btn btn-sm" onClick={onLog}>Uppdatera framsteg</button>
          {goal.logs.length > 0 && (
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setExpanded((x) => !x)} aria-expanded={expanded}>
              Historik {expanded ? <ChevronUp /> : <ChevronDown />}
            </button>
          )}
        </div>
      )}
      {goal.archived && goal.logs.length > 0 && (
        <button className="btn btn-sm btn-ghost" style={{ marginTop: 'var(--s3)' }} onClick={() => setExpanded((x) => !x)} aria-expanded={expanded}>Historik {expanded ? <ChevronUp /> : <ChevronDown />}</button>
      )}

      {expanded && <GoalHistory goal={goal} />}
      {confirmDialog}
    </article>
  );
}

function GoalHistory({ goal }: { goal: Goal }) {
  const history = useMemo(() => goalHistory(goal), [goal]);
  const logs = useMemo(() => [...goal.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12), [goal.logs]);
  return (
    <div style={{ marginTop: 'var(--s4)' }}>
      {goal.horizon === 'long' && history.length > 1 && (
        <LineChart
          ariaLabel={`Historik för ${goal.title}`}
          points={[{ label: 'Start', value: goal.startValue, title: `Start: ${fmt(goal.startValue)}` }, ...history.map((h) => ({ label: formatShort(h.date), value: h.value, title: `${formatShort(h.date)}: ${fmt(h.value)} ${goal.unit}` }))]}
          target={goal.target}
          height={130}
        />
      )}
      <ul className="list" style={{ marginTop: 'var(--s2)' }}>
        {logs.map((l) => (
          <li key={l.id} className="list-item" style={{ padding: '6px 8px' }}>
            <span className="small subtle num" style={{ width: 64 }}>{formatShort(l.date)}</span>
            <span className={`small num ${l.amount < 0 ? 'muted' : ''}`}>{l.amount > 0 ? '+' : ''}{fmt(l.amount)} {goal.unit}</span>
            <span className="small subtle grow truncate">{l.note}</span>
            <div className="actions">
              <button className="icon-btn danger" style={{ width: 28, height: 28 }} aria-label="Ta bort registrering" onClick={() => goalStore.removeLog(goal.id, l.id)}><Trash2 size={14} /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LogDialog({ goal, today, onClose }: { goal: Goal | null; today: string; onClose: () => void }) {
  return (
    <Modal open={!!goal} onClose={onClose} title="Uppdatera framsteg" size="sm"
      footer={<><button className="btn btn-ghost" onClick={onClose}>Avbryt</button><button className="btn btn-primary" type="submit" form="log-form">Spara</button></>}>
      {goal && <LogForm goal={goal} today={today} onDone={onClose} />}
    </Modal>
  );
}

function LogForm({ goal, today, onDone }: { goal: Goal; today: string; onDone: () => void }) {
  const toast = useToast();
  const current = goalValue(goal, today);
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(',', '.'));
    if (!amount.trim() || !Number.isFinite(n)) return setError('Ange ett tal.');
    if (!isDateKey(date) || date > todayKey()) return setError('Välj ett datum som inte ligger i framtiden.');
    const delta = mode === 'add' ? n : n - current;
    if (delta === 0) return setError(mode === 'set' ? 'Värdet är redan detsamma.' : 'Ange ett tal skilt från 0.');
    goalStore.log(goal.id, delta, date, note.trim() || undefined);
    if (current < goal.target && current + delta >= goal.target) toast.show(`Mål uppnått: ${goal.title}`);
    else toast.show('Framsteg sparat');
    onDone();
  };

  return (
    <form id="log-form" className="form" onSubmit={submit} noValidate>
      <p className="small muted">{goal.title} · nu {fmt(current)} av {fmt(goal.target)} {goal.unit}</p>
      <Segmented label="Typ" value={mode} onChange={setMode} options={[{ value: 'add', label: 'Lägg till' }, { value: 'set', label: 'Sätt nytt värde' }]} />
      <Field label={mode === 'add' ? `Hur mycket? (${goal.unit || 'antal'})` : `Nytt totalvärde (${goal.unit || 'antal'})`} htmlFor="log-amount" error={error} hint={mode === 'add' ? 'Negativa tal drar ifrån.' : undefined}>
        <input id="log-amount" className="input" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} aria-invalid={!!error} />
      </Field>
      <div className="form-row">
        <Field label="Datum" htmlFor="log-date">
          <input id="log-date" type="date" className="input" max={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Notering" optional htmlFor="log-note">
          <input id="log-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
        </Field>
      </div>
    </form>
  );
}
