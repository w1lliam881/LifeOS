import { useState, type FormEvent } from 'react';
import { CornerDownLeft, Plus } from 'lucide-react';
import { tasks } from '../lib/store';
import { parseQuickTask } from '../lib/tasks';
import { formatRelative, todayKey } from '../lib/dates';
import { useToast } from './Toast';

/** Type and press Enter. Understands "imorgon", weekdays, "!" and "#projekt". */
export function QuickAddTask({ defaultDue = 'today', placeholder }: { defaultDue?: 'today' | 'none'; placeholder?: string }) {
  const [value, setValue] = useState('');
  const toast = useToast();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const today = todayKey();
    const parsed = parseQuickTask(value, today, defaultDue === 'today' ? today : undefined);
    const task = tasks.add(parsed);
    setValue('');
    toast.undo(`Tillagd${parsed.dueDate ? ` · ${formatRelative(parsed.dueDate, today)}` : ''}`, () => tasks.remove(task.id));
  };

  return (
    <form className="quick-add" onSubmit={submit}>
      <Plus aria-hidden />
      <label htmlFor="quick-add" className="sr-only">Snabbt lägg till uppgift</label>
      <input
        id="quick-add"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? 'Lägg till uppgift – t.ex. ”Ring Anna imorgon !”'}
        autoComplete="off"
        enterKeyHint="done"
        maxLength={220}
      />
      <button type="submit" className="btn btn-sm btn-ghost" disabled={!value.trim()} aria-label="Lägg till">
        <CornerDownLeft />
      </button>
    </form>
  );
}
