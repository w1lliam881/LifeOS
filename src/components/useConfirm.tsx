import { useCallback, useState, type ReactNode } from 'react';
import { ConfirmDialog } from './Modal';

interface Pending {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  run: () => void;
}

/** const [confirm, dialog] = useConfirm(); confirm({...}); render {dialog} */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirm = useCallback((p: Pending) => setPending(p), []);
  const dialog = (
    <ConfirmDialog
      open={!!pending}
      title={pending?.title ?? ''}
      message={pending?.message ?? ''}
      confirmLabel={pending?.confirmLabel}
      onCancel={() => setPending(null)}
      onConfirm={() => { pending?.run(); setPending(null); }}
    />
  );
  return [confirm, dialog] as const;
}
