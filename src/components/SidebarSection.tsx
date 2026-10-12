import { ReactNode, useId } from 'react';

interface SidebarSectionProps {
  title: string;
  /** Short state readout shown beside the title, e.g. the total balance. */
  summary?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function SidebarSection({ title, summary, isOpen, onToggle, children }: SidebarSectionProps) {
  const contentId = useId();

  return (
    <div className="border-b border-hair last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-hover transition-colors"
      >
        <span className="text-sm font-semibold text-ink">{title}</span>
        {summary && (
          <span className="ml-auto num text-[13px] text-ink-2 truncate">{summary}</span>
        )}
        <svg
          className={`w-3.5 h-3.5 shrink-0 text-ink-3 transition-transform ${summary ? '' : 'ml-auto'} ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div id={contentId} className="px-3 pt-1 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
