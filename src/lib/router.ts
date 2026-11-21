import { useSyncExternalStore } from 'react';

export type Route = 'dashboard' | 'tasks' | 'goals' | 'habits' | 'learning' | 'journal' | 'analytics' | 'settings';
const ROUTES: Route[] = ['dashboard', 'tasks', 'goals', 'habits', 'learning', 'journal', 'analytics', 'settings'];

function parse(): Route {
  const seg = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] ?? '';
  return (ROUTES as string[]).includes(seg) ? (seg as Route) : 'dashboard';
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, parse);
}

export function href(route: Route): string {
  return route === 'dashboard' ? '#/' : `#/${route}`;
}

export function navigate(route: Route) {
  window.location.hash = href(route).slice(1);
}
