import { memo, type ReactNode } from 'react';
import { Check } from 'lucide-react';

export const Checkbox = memo(function Checkbox({ checked, onChange, label, size, square }: { checked: boolean; onChange: () => void; label: string; size?: 'lg'; square?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`check ${size ?? ''} ${square ? 'square' : ''}`}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
    >
      <Check strokeWidth={3} aria-hidden />
    </button>
  );
});

export function ProgressBar({ value, label, size, tone }: { value: number; label: string; size?: 'lg'; tone?: 'ivory' }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={`progress ${size ?? ''} ${tone ?? ''}`} role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ value, size = 44, stroke = 4, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(v * 100)} %`}>
      <svg width={size} height={size} aria-hidden>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle className="ring-value" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ opacity: v === 0 ? 0 : 1 }} />
      </svg>
      {children && <div className="ring-label">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, text, action, compact }: { icon: ReactNode; title: string; text?: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`empty ${compact ? 'compact' : ''}`}>
      <div className="empty-icon" aria-hidden>{icon}</div>
      <p className="empty-title">{title}</p>
      {text && <p className="empty-text">{text}</p>}
      {action}
    </div>
  );
}

export function Field({ label, optional, error, hint, htmlFor, children }: { label: string; optional?: boolean; error?: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}>
        {label} {optional && <span className="opt">(valfritt)</span>}
      </label>
      {children}
      {error ? <span className="error-text" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
