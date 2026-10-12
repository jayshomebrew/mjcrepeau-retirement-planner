import { ReactNode } from 'react';

interface FigureProps {
  title: string;
  /** One line under the title, e.g. the age range a chart covers. */
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
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 mb-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">{title}</h3>
          {caption && <p className="text-[13px] text-ink-2 mt-0.5">{caption}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
