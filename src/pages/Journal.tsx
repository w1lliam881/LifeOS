import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Frown, Laugh, Loader2, Meh, Search, Smile, Annoyed, BookOpen } from 'lucide-react';
import { journal as journalStore, useData, flush } from '../lib/store';
import { useToday } from '../lib/useToday';
import { addDays, addMonths, daysInMonth, formatLong, formatMonth, formatRelative, fromDateKey, startOfMonth, weekdayIndex, WEEKDAYS_LETTER } from '../lib/dates';
import { promptForDay } from '../lib/prompts';
import type { JournalEntry, Mood } from '../lib/types';
import { EmptyState, PageHeader } from '../components/ui';

const MOODS: { value: Mood; label: string; icon: typeof Smile }[] = [
  { value: 1, label: 'Tung', icon: Frown },
  { value: 2, label: 'Låg', icon: Annoyed },
  { value: 3, label: 'Okej', icon: Meh },
  { value: 4, label: 'Bra', icon: Smile },
  { value: 5, label: 'Toppen', icon: Laugh },
];

const PROMPTS: { key: 'wentWell' | 'learned' | 'improve'; q: string; placeholder: string }[] = [
  { key: 'wentWell', q: 'Vad gick bra idag?', placeholder: 'Stort eller litet…' },
  { key: 'learned', q: 'Vad lärde jag mig?', placeholder: 'En insikt, en fakta, något om dig själv…' },
  { key: 'improve', q: 'Vad kan jag göra bättre imorgon?', placeholder: 'En konkret sak.' },
];

export default function Journal() {
  const today = useToday();
  const entries = useData((s) => s.journal);
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(startOfMonth(today));
  const [query, setQuery] = useState('');

  const select = (d: string) => {
    flush();
    setDate(d);
    setMonth(startOfMonth(d));
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));
    if (!q) return list.slice(0, 8);
    return list.filter((e) => `${e.wentWell} ${e.learned} ${e.improve} ${e.notes}`.toLowerCase().includes(q));
  }, [entries, query]);

  const streak = useMemo(() => {
    let n = 0;
    let d = entries[today] ? today : addDays(today, -1);
    while (entries[d]) { n++; d = addDays(d, -1); }
    return n;
  }, [entries, today]);

  return (
    <div className="page">
      <PageHeader title="Journal" sub={streak > 1 ? `${streak} dagar i rad – fint jobbat.` : 'Ett privat utrymme för reflektion. Sparas automatiskt, bara på den här enheten.'} />
      <div className="grid grid-3" style={{ alignItems: 'start' }}>
        <div className="span-2">
          <EntryEditor key={date} date={date} today={today} entry={entries[date]} onNavigate={select} />
        </div>
        <aside className="stack" aria-label="Bläddra i journalen">
          <section className="card card-tight">
            <Calendar month={month} setMonth={setMonth} selected={date} today={today} entries={entries} onSelect={select} />
          </section>
          <section className="card card-tight">
            <div className="toolbar" style={{ marginBottom: 'var(--s2)' }}>
              <div className="search" style={{ maxWidth: 'none' }}>
                <Search aria-hidden />
                <label className="sr-only" htmlFor="journal-search">Sök i journalen</label>
                <input id="journal-search" type="search" className="input" placeholder="Sök i anteckningar" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
            {results.length === 0 ? (
              <EmptyState compact icon={query ? <Search /> : <BookOpen />} title={query ? 'Inga träffar' : 'Inga anteckningar ännu'} />
            ) : (
              <ul className="list">
                {results.map((e) => (
                  <li key={e.date}>
                    <button className="list-item" style={{ width: '100%', border: 0, background: e.date === date ? 'var(--surface-2)' : 'transparent', textAlign: 'left', margin: 0 }} onClick={() => select(e.date)}>
                      <div className="item-main">
                        <span className="small" style={{ fontWeight: 500 }}>{formatRelative(e.date, today)}</span>
                        <span className="tiny subtle truncate">{excerpt(e, query)}</span>
                      </div>
                      {e.mood && <MoodIcon mood={e.mood} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function MoodIcon({ mood }: { mood: Mood }) {
  const m = MOODS.find((x) => x.value === mood)!;
  return <m.icon size={14} className="subtle" aria-label={`Humör: ${m.label}`} />;
}

function excerpt(e: JournalEntry, query: string): string {
  const text = [e.wentWell, e.learned, e.improve, e.notes].filter(Boolean).join(' · ');
  const q = query.trim().toLowerCase();
  if (!q) return text || 'Endast humör';
  const i = text.toLowerCase().indexOf(q);
  return i > 30 ? `…${text.slice(i - 20)}` : text;
}

type SaveState = 'idle' | 'saving' | 'saved';

function EntryEditor({ date, today, entry, onNavigate }: { date: string; today: string; entry?: JournalEntry; onNavigate: (d: string) => void }) {
  const [draft, setDraft] = useState(() => ({
    wentWell: entry?.wentWell ?? '', learned: entry?.learned ?? '', improve: entry?.improve ?? '', notes: entry?.notes ?? '', mood: entry?.mood,
  }));
  const [status, setStatus] = useState<SaveState>(entry ? 'saved' : 'idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<typeof draft | null>(null);

  const commit = () => {
    if (!pending.current) return;
    journalStore.save(date, pending.current);
    pending.current = null;
    setStatus('saved');
  };

  // Save whatever is pending when leaving the entry or the page.
  useEffect(() => () => { clearTimeout(timer.current); commit(); }, []);

  const update = (patch: Partial<typeof draft>, immediate = false) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    pending.current = next;
    setStatus('saving');
    clearTimeout(timer.current);
    if (immediate) commit();
    else timer.current = setTimeout(commit, 600);
  };

  const isToday = date === today;
  const updated = entry?.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <section className="card" aria-labelledby="entry-title">
      <div className="row-between wrap" style={{ marginBottom: 'var(--s5)' }}>
        <div className="row">
          <button className="icon-btn" onClick={() => onNavigate(addDays(date, -1))} aria-label="Föregående dag"><ChevronLeft /></button>
          <div>
            <h2 id="entry-title" style={{ fontSize: 16 }}>{formatLong(date)}</h2>
            <p className="tiny subtle">{isToday ? 'Idag' : formatRelative(date, today)}{date.slice(0, 4) !== today.slice(0, 4) ? ` ${date.slice(0, 4)}` : ''}</p>
          </div>
          <button className="icon-btn" onClick={() => onNavigate(addDays(date, 1))} disabled={date >= today} aria-label="Nästa dag"><ChevronRight /></button>
          {!isToday && <button className="btn btn-ghost btn-sm" onClick={() => onNavigate(today)}>Idag</button>}
        </div>
        <span className={`save-status ${status === 'saved' ? 'saved' : ''}`} aria-live="polite">
          {status === 'saving' && <><Loader2 aria-hidden style={{ animation: 'pulse 1s infinite' }} /> Sparar…</>}
          {status === 'saved' && <><Check aria-hidden /> Sparat{updated ? ` ${updated}` : ''}</>}
          {status === 'idle' && 'Sparas automatiskt'}
        </span>
      </div>

      <div className="stack" style={{ gap: 'var(--s5)' }}>
        <div className="prompt-block">
          <span className="prompt-q" id="mood-label">Hur mår du?</span>
          <div className="moods" role="group" aria-labelledby="mood-label">
            {MOODS.map((m) => (
              <button key={m.value} type="button" className="mood" aria-pressed={draft.mood === m.value} onClick={() => update({ mood: draft.mood === m.value ? undefined : m.value }, true)}>
                <m.icon aria-hidden /> {m.label}
              </button>
            ))}
          </div>
        </div>

        {PROMPTS.map((p) => (
          <div key={p.key} className="prompt-block">
            <label className="prompt-q" htmlFor={`j-${p.key}`}>{p.q}</label>
            <AutoTextarea id={`j-${p.key}`} value={draft[p.key]} placeholder={p.placeholder} onChange={(v) => update({ [p.key]: v })} onBlur={commit} />
          </div>
        ))}

        <div className="prompt-block">
          <label className="prompt-q" htmlFor="j-notes">Fritt</label>
          <p className="small subtle" style={{ marginTop: -4 }}>Dagens fråga: {promptForDay(date)}</p>
          <AutoTextarea id="j-notes" value={draft.notes} placeholder="Skriv vad du vill…" onChange={(v) => update({ notes: v })} onBlur={commit} minRows={4} />
        </div>
      </div>
    </section>
  );
}

function AutoTextarea({ id, value, onChange, onBlur, placeholder, minRows = 2 }: { id: string; value: string; onChange: (v: string) => void; onBlur: () => void; placeholder: string; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} id={id} className="journal-area" rows={minRows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} maxLength={20000} />;
}

function Calendar({ month, setMonth, selected, today, entries, onSelect }: { month: string; setMonth: (m: string) => void; selected: string; today: string; entries: Record<string, JournalEntry>; onSelect: (d: string) => void }) {
  const n = daysInMonth(month);
  const offset = weekdayIndex(month);
  const count = Array.from({ length: n }, (_, i) => addDays(month, i)).filter((d) => entries[d]).length;
  return (
    <div>
      <div className="row-between" style={{ marginBottom: 'var(--s2)' }}>
        <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Föregående månad"><ChevronLeft /></button>
        <div style={{ textAlign: 'center' }}>
          <div className="small" style={{ fontWeight: 500 }}>{formatMonth(month)}</div>
          <div className="tiny subtle">{count} {count === 1 ? 'anteckning' : 'anteckningar'}</div>
        </div>
        <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} disabled={addMonths(month, 1) > today} aria-label="Nästa månad"><ChevronRight /></button>
      </div>
      <div className="cal">
        {WEEKDAYS_LETTER.map((d, i) => <span key={i} className="dow" aria-hidden>{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: n }, (_, i) => {
          const d = addDays(month, i);
          return (
            <button key={d} className={`cal-day ${entries[d] ? 'has' : ''} ${d === today ? 'today' : ''}`} aria-pressed={d === selected} disabled={d > today}
              onClick={() => onSelect(d)} aria-label={`${fromDateKey(d).getDate()} ${formatMonth(month)}${entries[d] ? ', har anteckning' : ''}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
