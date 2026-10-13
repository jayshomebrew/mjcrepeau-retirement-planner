import { ReactNode, useEffect, useId, useState } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Buttons, right-aligned under the content. */
  actions: ReactNode;
  /** Called on Escape or a click on the dimmed backdrop. */
  onClose: () => void;
}

/**
 * A dialog over a dimmed scrim. It stays mounted after `open` turns false
 * until the scrim has faded out, so it closes as smoothly as it opens; callers
 * keep passing the content it showed (see `useRetained`).
 */
export function Modal({ open, title, children, actions, onClose }: ModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open && !mounted) return null;

  return (
    <div
      className="modal-scrim fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--scrim)] backdrop-blur-[2px]"
      data-open={open || undefined}
      inert={!open}
      onMouseDown={event => {
        if (open && event.target === event.currentTarget) onClose();
      }}
      onTransitionEnd={event => {
        // Unmount once the scrim has actually faded out, not when a stale
        // event from the opening fade arrives.
        const scrim = event.currentTarget;
        if (open || event.target !== scrim || event.propertyName !== 'opacity') return;
        if (getComputedStyle(scrim).opacity === '0') setMounted(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="modal-dialog glass glass-strong rounded-[20px] p-6 w-full max-w-md"
      >
        <h3 id={titleId} className="font-serif text-xl font-bold text-ink mb-2">
          {title}
        </h3>
        <div className="text-sm text-ink-2 leading-relaxed">{children}</div>
        <div className="flex justify-end gap-2 mt-5">{actions}</div>
      </div>
    </div>
  );
}
