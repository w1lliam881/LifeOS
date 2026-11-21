import { useMemo, useState } from 'react';
import { CheckCircle2, CheckSquare, Inbox, Plus, Search, Trash2 } from 'lucide-react';
import { tasks as taskStore, useData } from '../lib/store';
import { useToday } from '../lib/useToday';
import { filterTasks, groupOpenTasks, projectsOf, sortTasks, type DateFilter } from '../lib/tasks';
import { formatLong } from '../lib/dates';
import type { Priority, Task } from '../lib/types';
import { EmptyState, PageHeader, Segmented } from '../components/ui';
import { TaskItem } from '../components/TaskItem';
import { QuickAddTask } from '../components/QuickAddTask';
import { useDialogs } from '../components/Dialogs';
import { useTaskActions } from '../components/useTaskActions';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/useConfirm';

type View = 'today' | 'upcoming' | 'all' | 'completed';
const VIEW_KEY = 'lifeos:tasks-view';

function initialView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'today' || v === 'upcoming' || v === 'all' || v === 'completed') return v;
  } catch { /* ignore */ }
  return 'today';
}

export default function Tasks() {
  const today = useToday();
  const all = useData((s) => s.tasks);
  const dialogs = useDialogs();
  const actions = useTaskActions();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [view, setViewState] = useState<View>(initialView);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [project, setProject] = useState<string>('all');
  const [date, setDate] = useState<DateFilter>('all');

  const setView = (v: View) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };

  const projects = useMemo(() => projectsOf(all), [all]);

  const counts = useMemo(() => ({
    today: filterTasks(all, { status: 'today' }, today).length,
    upcoming: filterTasks(all, { status: 'upcoming' }, today).length,
    all: filterTasks(all, { status: 'open' }, today).length,
    completed: filterTasks(all, { status: 'completed' }, today).length,
  }), [all, today]);

  const visible = useMemo(() => {
    const status = view === 'all' ? 'open' : view;
    return sortTasks(filterTasks(all, { status, priority, project, query, date: view === 'all' ? date : 'all' }, today));
  }, [all, view, priority, project, query, date, today]);

  const groups = useMemo(() => groupOpenTasks(visible, today), [visible, today]);
  const filtersActive = query.trim() !== '' || priority !== 'all' || project !== 'all' || (view === 'all' && date !== 'all');
  const resetFilters = () => { setQuery(''); setPriority('all'); setProject('all'); setDate('all'); };

  const clearCompleted = () => {
    confirm({
      title: 'Rensa klara uppgifter?',
      message: `${counts.completed} klara uppgifter tas bort. De räknas inte längre i analysen.`,
      confirmLabel: 'Rensa',
      run: () => {
        const removed = taskStore.clearCompleted();
        toast.undo(`${removed.length} uppgifter rensade`, () => taskStore.restoreMany(removed));
      },
    });
  };

  const renderList = (list: Task[], opts: { hideDate?: boolean } = {}) => (
    <ul className="list">
      {list.map((t) => (
        <TaskItem key={t.id} task={t} today={today} onToggle={actions.toggle} onEdit={actions.edit} onDelete={actions.remove} onFocus={actions.focus} hideDate={opts.hideDate} />
      ))}
    </ul>
  );

  const section = (label: string, list: Task[], opts: { danger?: boolean; hideDate?: boolean } = {}) =>
    list.length > 0 && (
      <div key={label}>
        <h3 className={`group-label ${opts.danger ? 'danger' : ''}`}>{label} <span className="count">{list.length}</span></h3>
        {renderList(list, opts)}
      </div>
    );

  return (
    <div className="page">
      <PageHeader
        title="Uppgifter"
        sub={view === 'today' ? formatLong(today) : undefined}
        actions={<button className="btn btn-primary" onClick={() => dialogs.task(undefined, view === 'upcoming' ? { dueDate: '' } : undefined)}><Plus /> Ny uppgift</button>}
      />

      <div className="tabs-scroll">
        <Segmented<View>
          label="Vy"
          value={view}
          onChange={setView}
          options={[
            { value: 'today', label: 'Idag', count: counts.today },
            { value: 'upcoming', label: 'Kommande', count: counts.upcoming },
            { value: 'all', label: 'Alla öppna', count: counts.all },
            { value: 'completed', label: 'Klara', count: counts.completed },
          ]}
        />
      </div>

      <div className="toolbar">
        <div className="search">
          <Search aria-hidden />
          <label htmlFor="task-search" className="sr-only">Sök uppgifter</label>
          <input id="task-search" className="input" placeholder="Sök" value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
        </div>
        <label className="sr-only" htmlFor="f-prio">Prioritet</label>
        <select id="f-prio" className="select" value={priority} onChange={(e) => setPriority(e.target.value as Priority | 'all')}>
          <option value="all">Alla prioriteter</option>
          <option value="high">Hög</option>
          <option value="medium">Medel</option>
          <option value="low">Låg</option>
        </select>
        {projects.length > 0 && (
          <>
            <label className="sr-only" htmlFor="f-proj">Projekt</label>
            <select id="f-proj" className="select" value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="all">Alla projekt</option>
              {projects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </>
        )}
        {view === 'all' && (
          <>
            <label className="sr-only" htmlFor="f-date">Datum</label>
            <select id="f-date" className="select" value={date} onChange={(e) => setDate(e.target.value as DateFilter)}>
              <option value="all">Alla datum</option>
              <option value="overdue">Försenade</option>
              <option value="today">Idag</option>
              <option value="week">Kommande 7 dagar</option>
              <option value="nodate">Utan datum</option>
            </select>
          </>
        )}
        {filtersActive && <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Rensa filter</button>}
        {view === 'completed' && counts.completed > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={clearCompleted}><Trash2 /> Rensa klara</button>
        )}
      </div>

      <section className="card">
        {view !== 'completed' && (
          <div style={{ marginBottom: 'var(--s2)' }}>
            <QuickAddTask defaultDue={view === 'today' ? 'today' : 'none'} placeholder={view === 'today' ? undefined : 'Lägg till – skriv t.ex. ”fredag” eller ”#jobb”'} />
          </div>
        )}

        {visible.length === 0 ? (
          filtersActive ? (
            <EmptyState icon={<Search />} title="Inga träffar" text="Inga uppgifter matchar filtren." action={<button className="btn btn-sm" onClick={resetFilters}>Rensa filter</button>} />
          ) : view === 'today' ? (
            <EmptyState icon={<CheckCircle2 />} title={counts.completed ? 'Allt klart för idag' : 'Inget planerat idag'} text={counts.upcoming ? `Du har ${counts.upcoming} kommande uppgifter.` : 'Skriv in något ovan för att komma igång.'}
              action={counts.upcoming > 0 && <button className="btn btn-sm" onClick={() => setView('upcoming')}>Visa kommande</button>} />
          ) : view === 'completed' ? (
            <EmptyState icon={<CheckSquare />} title="Inga klara uppgifter ännu" text="Det du bockar av hamnar här." />
          ) : (
            <EmptyState icon={<Inbox />} title="Inget kommande" text="Uppgifter med senare datum eller utan datum visas här." />
          )
        ) : view === 'completed' ? (
          renderList(visible)
        ) : view === 'today' ? (
          <>
            {section('Försenade', groups.overdue, { danger: true })}
            {groups.overdue.length > 0 ? section('Idag', groups.today, { hideDate: true }) : renderList(groups.today, { hideDate: true })}
          </>
        ) : (
          <>
            {section('Försenade', groups.overdue, { danger: true })}
            {section('Idag', groups.today, { hideDate: true })}
            {section('Imorgon', groups.tomorrow, { hideDate: true })}
            {section('Senare', groups.later)}
            {section('Någon gång', groups.someday)}
          </>
        )}
      </section>
      {confirmDialog}
    </div>
  );
}
