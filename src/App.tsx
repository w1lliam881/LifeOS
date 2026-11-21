import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, CheckSquare, GraduationCap, LayoutGrid, MoreHorizontal, Plus, Repeat, Settings as SettingsIcon, Target } from 'lucide-react';
import { href, navigate, useRoute, type Route } from './lib/router';
import { onSaveError, useData } from './lib/store';
import { useToday } from './lib/useToday';
import { habitsForDay } from './lib/habits';
import { Logo } from './components/Logo';
import { Modal } from './components/Modal';
import { useToast } from './components/Toast';
import { useDialogs } from './components/Dialogs';
import Dashboard from './pages/Dashboard';

const Tasks = lazy(() => import('./pages/Tasks'));
const Goals = lazy(() => import('./pages/Goals'));
const Habits = lazy(() => import('./pages/Habits'));
const Learning = lazy(() => import('./pages/Learning'));
const Journal = lazy(() => import('./pages/Journal'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));

interface NavItem { route: Route; label: string; icon: typeof LayoutGrid; key: string }

const NAV: NavItem[] = [
  { route: 'dashboard', label: 'Översikt', icon: LayoutGrid, key: '1' },
  { route: 'tasks', label: 'Uppgifter', icon: CheckSquare, key: '2' },
  { route: 'habits', label: 'Vanor', icon: Repeat, key: '3' },
  { route: 'goals', label: 'Mål', icon: Target, key: '4' },
  { route: 'learning', label: 'Lärande', icon: GraduationCap, key: '5' },
  { route: 'journal', label: 'Journal', icon: BookOpen, key: '6' },
  { route: 'analytics', label: 'Analys', icon: BarChart3, key: '7' },
];

const TITLES: Record<Route, string> = {
  dashboard: 'Översikt', tasks: 'Uppgifter', habits: 'Vanor', goals: 'Mål', learning: 'Lärande', journal: 'Journal', analytics: 'Analys', settings: 'Inställningar',
};

export default function App() {
  const route = useRoute();
  const toast = useToast();
  const dialogs = useDialogs();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => onSaveError((msg) => toast.show(msg, { kind: 'error', duration: 8000 })), [toast]);

  useEffect(() => {
    document.title = route === 'dashboard' ? 'LIFE OS' : `${TITLES[route]} · LIFE OS`;
    window.scrollTo(0, 0);
    setMoreOpen(false);
  }, [route]);

  // Global shortcuts: N = new task, 1–7 = sections. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); dialogs.task(); return; }
      const item = NAV.find((n) => n.key === e.key);
      if (item) navigate(item.route);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogs]);

  const page = useMemo(() => {
    switch (route) {
      case 'tasks': return <Tasks />;
      case 'goals': return <Goals />;
      case 'habits': return <Habits />;
      case 'learning': return <Learning />;
      case 'journal': return <Journal />;
      case 'analytics': return <Analytics />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  }, [route]);

  const mobileMain: Route[] = ['dashboard', 'tasks', 'habits', 'journal'];
  const moreActive = !mobileMain.includes(route);

  return (
    <div className="shell">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Hoppa till innehåll</a>
      <aside className="sidebar" aria-label="Huvudmeny">
        <a href={href('dashboard')} className="brand" style={{ textDecoration: 'none' }}><Logo /> LIFE OS</a>
        <button className="btn btn-block" style={{ justifyContent: 'flex-start', marginBottom: 'var(--s4)' }} onClick={() => dialogs.task()}>
          <Plus /> Ny uppgift <span className="kbd" style={{ marginLeft: 'auto' }}>N</span>
        </button>
        <SidebarNav route={route} />
        <div className="sidebar-footer">
          <a href={href('settings')} className="nav-link" aria-current={route === 'settings' ? 'page' : undefined}><SettingsIcon /> Inställningar</a>
          <p className="sidebar-note">Data sparas lokalt i den här webbläsaren. Exportera regelbundet under Inställningar.</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <a href={href('dashboard')} className="brand" style={{ textDecoration: 'none' }}><Logo /> LIFE OS</a>
          <button className="btn btn-primary btn-sm" onClick={() => dialogs.task()} aria-label="Ny uppgift"><Plus /> Ny</button>
        </header>
        <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
          <Suspense fallback={<div className="page" aria-busy="true" />}>
            <div key={route} className="fade-in">{page}</div>
          </Suspense>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Huvudmeny">
        {NAV.filter((n) => mobileMain.includes(n.route)).map((n) => (
          <a key={n.route} href={href(n.route)} aria-current={route === n.route ? 'page' : undefined}>
            <n.icon aria-hidden /> {n.label}
          </a>
        ))}
        <button onClick={() => setMoreOpen(true)} aria-current={moreActive ? 'page' : undefined} aria-haspopup="dialog">
          <MoreHorizontal aria-hidden /> Mer
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Mer">
        <nav className="sheet-nav" aria-label="Fler sektioner">
          {[...NAV.filter((n) => !mobileMain.includes(n.route)), { route: 'settings' as Route, label: 'Inställningar', icon: SettingsIcon, key: '' }].map((n) => (
            <a key={n.route} href={href(n.route)} aria-current={route === n.route ? 'page' : undefined} onClick={() => setMoreOpen(false)}>
              <n.icon aria-hidden /> {n.label}
            </a>
          ))}
        </nav>
      </Modal>
    </div>
  );
}

function SidebarNav({ route }: { route: Route }) {
  const today = useToday();
  const taskList = useData((s) => s.tasks);
  const habitList = useData((s) => s.habits);
  const openToday = useMemo(() => taskList.filter((t) => !t.completed && t.dueDate && t.dueDate <= today).length, [taskList, today]);
  const habitsLeft = useMemo(() => {
    const h = habitsForDay(habitList, today);
    return h.total - h.done;
  }, [habitList, today]);
  const counts: Partial<Record<Route, number>> = { tasks: openToday, habits: habitsLeft };

  return (
    <nav className="nav">
      {NAV.map((n) => (
        <a key={n.route} href={href(n.route)} className="nav-link" aria-current={route === n.route ? 'page' : undefined} title={`${n.label} (${n.key})`}>
          <n.icon aria-hidden /> {n.label}
          {!!counts[n.route] && <span className="count" aria-label={`${counts[n.route]} kvar idag`}>{counts[n.route]}</span>}
        </a>
      ))}
    </nav>
  );
}
