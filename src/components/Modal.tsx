import { ReactNode, useEffect, useId, useRef, useState } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 *
 * While open it holds keyboard focus: the first action is focused, Tab cycles
 * within the dialog, and focus returns to whatever had it before on close.
 */
export function Modal({ open, title, children, actions, onClose }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  // Callers pass inline handlers; keep the latest without re-running the
  // effect, which would move focus on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => (dialog ? [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)] : []);
    (focusable()[0] ?? dialog)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = dialog?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      returnFocus?.focus();
    };
  }, [open]);

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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
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
