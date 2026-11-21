import { useMemo } from 'react';
import { useToast } from './Toast';
import { useDialogs } from './Dialogs';
import { tasks } from '../lib/store';
import type { Task } from '../lib/types';

/** Shared task interactions with consistent feedback and undo. */
export function useTaskActions() {
  const toast = useToast();
  const dialogs = useDialogs();
  return useMemo(() => ({
    toggle: (task: Task) => {
      tasks.toggle(task.id);
      if (!task.completed) toast.undo('Uppgift klar', () => tasks.toggle(task.id));
    },
    edit: (task: Task) => dialogs.task(task),
    remove: (task: Task) => {
      const removed = tasks.remove(task.id);
      if (removed) toast.undo('Uppgift borttagen', () => tasks.restore(removed));
    },
    focus: (task: Task) => tasks.toggleFocus(task.id),
  }), [toast, dialogs]);
}
