import { memo } from 'react';
import { CalendarDays, Pencil, Star, Trash2 } from 'lucide-react';
import { Checkbox } from './ui';
import { formatRelative } from '../lib/dates';
import { isOverdue, PRIORITY_LABEL } from '../lib/tasks';
import type { Task } from '../lib/types';

interface Props {
  task: Task;
  today: string;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onFocus?: (task: Task) => void;
  hideDate?: boolean;
}

export const TaskItem = memo(function TaskItem({ task, today, onToggle, onEdit, onDelete, onFocus, hideDate }: Props) {
  const overdue = isOverdue(task, today);
  const focused = task.focusDate === today && !task.completed;
  return (
    <li className="list-item">
      <Checkbox checked={task.completed} onChange={() => onToggle(task)} label={task.completed ? `Markera ”${task.title}” som ej klar` : `Markera ”${task.title}” som klar`} />
      <div className="item-main">
        <button className={`item-title ${task.completed ? 'strike' : ''}`} onClick={() => onEdit(task)} title={task.title}>{task.title}</button>
        <div className="item-meta">
          <span className="row" style={{ gap: 5 }} title={`Prioritet: ${PRIORITY_LABEL[task.priority]}`}>
            <span className={`prio prio-${task.priority}`} aria-hidden />
            <span className="sr-only">Prioritet {PRIORITY_LABEL[task.priority]}</span>
            {task.priority === 'high' && <span aria-hidden>Hög</span>}
          </span>
          {!hideDate && task.dueDate && (
            <span className={`row ${overdue ? 'danger' : ''}`} style={{ gap: 4 }}>
              <CalendarDays size={12} aria-hidden />
              {overdue ? `Försenad · ${formatRelative(task.dueDate, today)}` : formatRelative(task.dueDate, today)}
            </span>
          )}
          {task.project && <span>{task.project}</span>}
          {task.description && <span className="truncate" style={{ maxWidth: 260 }}>{task.description}</span>}
        </div>
      </div>
      <div className="actions">
        {onFocus && !task.completed && (
          <button className={`icon-btn ${focused ? 'active' : ''}`} onClick={() => onFocus(task)} aria-pressed={focused} aria-label={focused ? 'Ta bort från dagens fokus' : 'Lägg till i dagens fokus'} title={focused ? 'Ta bort från dagens fokus' : 'Dagens fokus'}>
            <Star fill={focused ? 'currentColor' : 'none'} />
          </button>
        )}
        <button className="icon-btn" onClick={() => onEdit(task)} aria-label="Redigera"><Pencil /></button>
        {onDelete && <button className="icon-btn danger" onClick={() => onDelete(task)} aria-label="Ta bort"><Trash2 /></button>}
      </div>
    </li>
  );
});
