import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { GoalDialog, HabitDialog, SessionDialog, SubjectDialog, TaskDialog } from './forms';
import type { Goal, Habit, LearningSession, Subject, Task } from '../lib/types';

type DialogState =
  | { kind: 'task'; task?: Task; defaults?: Partial<Task> }
  | { kind: 'goal'; goal?: Goal }
  | { kind: 'habit'; habit?: Habit }
  | { kind: 'subject'; subject?: Subject }
  | { kind: 'session'; session?: LearningSession; defaults?: Partial<LearningSession> }
  | null;

interface DialogApi {
  task: (task?: Task, defaults?: Partial<Task>) => void;
  goal: (goal?: Goal) => void;
  habit: (habit?: Habit) => void;
  subject: (subject?: Subject) => void;
  session: (session?: LearningSession, defaults?: Partial<LearningSession>) => void;
}

const Ctx = createContext<DialogApi | null>(null);

/** One place that owns create/edit dialogs, so any screen (or shortcut) can open them. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(null);
  const close = useCallback(() => setState(null), []);
  const api = useMemo<DialogApi>(() => ({
    task: (task, defaults) => setState({ kind: 'task', task, defaults }),
    goal: (goal) => setState({ kind: 'goal', goal }),
    habit: (habit) => setState({ kind: 'habit', habit }),
    subject: (subject) => setState({ kind: 'subject', subject }),
    session: (session, defaults) => setState({ kind: 'session', session, defaults }),
  }), []);

  return (
    <Ctx.Provider value={api}>
      {children}
      <TaskDialog open={state?.kind === 'task'} task={state?.kind === 'task' ? state.task : undefined} defaults={state?.kind === 'task' ? state.defaults : undefined} onClose={close} />
      <GoalDialog open={state?.kind === 'goal'} goal={state?.kind === 'goal' ? state.goal : undefined} onClose={close} />
      <HabitDialog open={state?.kind === 'habit'} habit={state?.kind === 'habit' ? state.habit : undefined} onClose={close} />
      <SubjectDialog open={state?.kind === 'subject'} subject={state?.kind === 'subject' ? state.subject : undefined} onClose={close} />
      <SessionDialog open={state?.kind === 'session'} session={state?.kind === 'session' ? state.session : undefined} defaults={state?.kind === 'session' ? state.defaults : undefined} onClose={close} />
    </Ctx.Provider>
  );
}

export function useDialogs(): DialogApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDialogs must be used inside DialogProvider');
  return ctx;
}
