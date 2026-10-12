import { ReactNode } from 'react';

interface FigureProps {
  title: string;
  /** One sentence set under the figure in italic, as a paper captions a plot. */
  caption?: string;
  /** Controls aligned to the right of the title. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * A chart or table set directly on the page (no card). Results are read on
 * the paper; only controls float above it in glass.
 */
export function Figure({ title, caption, actions, children }: FigureProps) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-4">
        <h3 className="font-serif text-[1.3125rem] font-bold text-ink">{title}</h3>
        {actions}
      </div>
      {children}
      {caption && <p className="font-serif italic text-sm leading-relaxed text-ink-2 mt-3">{caption}</p>}
    </section>
  );
}
