import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  kind: 'success' | 'error';
  action?: { label: string; run: () => void };
}

interface ToastApi {
  show: (message: string, opts?: { action?: ToastItem['action']; kind?: ToastItem['kind']; duration?: number }) => void;
  /** Success message with an "Ångra" button. */
  undo: (message: string, undo: () => void) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback<ToastApi['show']>((message, opts = {}) => {
    const id = nextId.current++;
    setItems((list) => [...list.slice(-2), { id, message, kind: opts.kind ?? 'success', action: opts.action }]);
    setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 6000 : 3200));
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    show,
    undo: (message, run) => show(message, { action: { label: 'Ångra', run } }),
  }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`}>
            {t.kind === 'error' ? <AlertCircle aria-hidden /> : <Check aria-hidden />}
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button className="btn btn-sm" onClick={() => { t.action?.run(); dismiss(t.id); }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
