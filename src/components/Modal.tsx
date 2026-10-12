import { ReactNode, useEffect, useId } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  /** Buttons, right-aligned under the content. */
  actions: ReactNode;
  /** Called on Escape or a click on the dimmed backdrop. */
  onClose: () => void;
}

export function Modal({ title, children, actions, onClose }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--scrim)] backdrop-blur-[2px]"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass glass-strong rounded-[24px] p-6 w-full max-w-md"
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
