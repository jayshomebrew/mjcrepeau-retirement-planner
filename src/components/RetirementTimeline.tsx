import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface TimelineEvent {
  age: number;
  label: string;
}

interface RetirementTimelineProps {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  /** Age the portfolio runs out, if before life expectancy. */
  depletionAge?: number;
  /** Milestones between today and the end of the plan (benefits, RMDs…). */
  events: TimelineEvent[];
}

type Side = 'above' | 'below';
type Align = 'start' | 'center' | 'end';

interface Item {
  key: string;
  side: Side;
  align: Align;
  /** Position along the line, 0–100. */
  pct: number;
  kind: 'major' | 'minor' | 'span' | 'alert';
  age?: number;
  label: string;
}

const ROW_ABOVE = 23;
const ROW_BELOW = 42;
const LINE_ZONE = 18;
const GAP = 14;

/**
 * Stack labels into rows so none overlap. Items are placed left to right in
 * the lowest row whose last label ends before this one starts.
 */
function assignRows(boxes: { key: string; left: number; right: number }[]): Map<string, number> {
  const rows = new Map<string, number>();
  const rowEnds: number[] = [];
  [...boxes]
    .sort((a, b) => a.left - b.left)
    .forEach(box => {
      let row = rowEnds.findIndex(end => box.left >= end + GAP);
      if (row === -1) {
        row = rowEnds.length;
        rowEnds.push(box.right);
      } else {
        rowEnds[row] = box.right;
      }
      rows.set(box.key, row);
    });
  return rows;
}

export function RetirementTimeline({
  currentAge,
  retirementAge,
  lifeExpectancy,
  depletionAge,
  events,
}: RetirementTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  // Measured placement per label: stacking row and left offset in px. Until
  // the first measurement, labels fall back to percentage positioning.
  const [placement, setPlacement] = useState<Map<string, { row: number; left: number }>>(new Map());

  const span = Math.max(1, lifeExpectancy - currentAge);
  const pct = (age: number) => Math.min(100, Math.max(0, ((age - currentAge) / span) * 100));
  const savingYears = retirementAge - currentAge;
  const retiredYears = lifeExpectancy - retirementAge;
  const runsOutEarly = depletionAge !== undefined && depletionAge < lifeExpectancy;

  // Merge milestones that land on the same age ("Social Security and RMDs").
  const byAge = new Map<number, string[]>();
  events
    .filter(e => e.age > currentAge && e.age <= lifeExpectancy)
    .forEach(e => byAge.set(e.age, [...(byAge.get(e.age) ?? []), e.label]));

  const items: Item[] = [
    { key: 'today', side: 'below', align: 'start', pct: 0, kind: 'major', age: currentAge, label: 'Today' },
    { key: 'retire', side: 'below', align: 'center', pct: pct(retirementAge), kind: 'major', age: retirementAge, label: 'Retire' },
    { key: 'end', side: 'below', align: 'end', pct: 100, kind: 'major', age: lifeExpectancy, label: 'Plan ends' },
    {
      key: 'span-saving',
      side: 'below',
      align: 'center',
      pct: pct(currentAge + savingYears / 2),
      kind: 'span',
      label: `${savingYears} ${savingYears === 1 ? 'year' : 'years'} saving`,
    },
    {
      key: 'span-retired',
      side: 'below',
      align: 'center',
      pct: pct(retirementAge + retiredYears / 2),
      kind: 'span',
      label: `${retiredYears} ${retiredYears === 1 ? 'year' : 'years'} retired`,
    },
    ...[...byAge.entries()]
      .sort(([a], [b]) => a - b)
      .map(([age, labels]): Item => ({
        key: `event-${age}`,
        side: 'above',
        align: 'center',
        pct: pct(age),
        kind: 'minor',
        age,
        label: labels.join(' and '),
      })),
    ...(runsOutEarly
      ? [{
          key: 'depleted',
          side: 'above' as const,
          align: 'center' as const,
          pct: pct(depletionAge),
          kind: 'alert' as const,
          age: depletionAge,
          label: 'Money runs out',
        }]
      : []),
  ];

  // Measure every label, then stack overlapping ones into rows per side.
  const layout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const boxes = items.map(item => {
      const labelWidth = labelRefs.current.get(item.key)?.offsetWidth ?? 0;
      const x = (item.pct / 100) * width;
      // Start/end labels line up with the outer edge of their dot.
      let left =
        item.align === 'start' ? x - 5 : item.align === 'end' ? x - labelWidth + 5 : x - labelWidth / 2;
      left = Math.min(Math.max(-6, left), width - labelWidth + 6);
      return { key: item.key, side: item.side, left, right: left + labelWidth };
    });
    const rows = new Map([
      ...assignRows(boxes.filter(b => b.side === 'above')),
      ...assignRows(boxes.filter(b => b.side === 'below')),
    ]);
    const next = new Map(boxes.map(b => [b.key, { row: rows.get(b.key) ?? 0, left: Math.round(b.left) }]));
    setPlacement(prev => {
      const same =
        prev.size === next.size &&
        [...next].every(([k, v]) => prev.get(k)?.row === v.row && prev.get(k)?.left === v.left);
      return same ? prev : next;
    });
    // `items` is rebuilt every render from the props listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAge, retirementAge, lifeExpectancy, depletionAge, JSON.stringify(events)]);

  useLayoutEffect(() => {
    layout();
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => layout());
    observer.observe(container);
    document.fonts?.ready.then(layout);
    return () => observer.disconnect();
  }, [layout]);

  const rowCount = (side: Side) =>
    Math.max(
      side === 'above' ? 0 : 1,
      ...items.filter(i => i.side === side).map(i => (placement.get(i.key)?.row ?? 0) + 1)
    );
  const aboveRows = items.some(i => i.side === 'above') ? rowCount('above') : 0;
  const belowRows = rowCount('below');
  const lineY = aboveRows * ROW_ABOVE + LINE_ZONE / 2;
  const height = aboveRows * ROW_ABOVE + LINE_ZONE + belowRows * ROW_BELOW;

  const retiredEnd = runsOutEarly ? pct(depletionAge) : 100;

  // Measured px offset when available, otherwise anchor on the percentage.
  const horizontal = (item: Item) => {
    const placed = placement.get(item.key);
    if (placed) return { left: placed.left };
    const transform =
      item.align === 'start' ? 'translateX(-5px)' : item.align === 'end' ? 'translateX(calc(-100% + 5px))' : 'translateX(-50%)';
    return { left: `${item.pct}%`, transform };
  };

  return (
    <section>
      {/* Screen readers get the milestones as a list; the drawing is visual only. */}
      <ol className="sr-only">
        <li>Today: age {currentAge}</li>
        <li>Retire: age {retirementAge}, after {savingYears} years of saving</li>
        {[...byAge.entries()].sort(([a], [b]) => a - b).map(([age, labels]) => (
          <li key={age}>{labels.join(' and ')}: age {age}</li>
        ))}
        {runsOutEarly && <li>Money runs out: age {depletionAge}</li>}
        <li>Plan ends: age {lifeExpectancy}, after {retiredYears} years of retirement</li>
      </ol>

      <div ref={containerRef} aria-hidden="true" className="relative mx-1.5" style={{ height }}>
        {/* Saving phase: hairline. Retirement: a heavier stroke. */}
        <div className="absolute inset-x-0 h-px bg-ink-3" style={{ top: lineY }} />
        <div
          className="absolute h-[3px] rounded-full bg-ink"
          style={{ top: lineY - 1, left: `${pct(retirementAge)}%`, width: `${retiredEnd - pct(retirementAge)}%` }}
        />
        {runsOutEarly && (
          <div
            className="absolute border-t-2 border-dashed border-bad"
            style={{ top: lineY - 1, left: `${retiredEnd}%`, right: 0 }}
          />
        )}

        {items.map(item => {
          const row = placement.get(item.key)?.row ?? 0;
          const setRef = (el: HTMLElement | null) => {
            if (el) labelRefs.current.set(item.key, el);
            else labelRefs.current.delete(item.key);
          };

          if (item.kind === 'span') {
            return (
              <span
                key={item.key}
                ref={setRef}
                className="absolute whitespace-nowrap font-serif italic text-sm text-ink-2"
                style={{ ...horizontal(item), top: lineY + LINE_ZONE / 2 + 4 + row * ROW_BELOW }}
              >
                {item.label}
              </span>
            );
          }

          const dot =
            item.kind === 'major'
              ? 'w-[11px] h-[11px] border-[1.5px] border-ink'
              : item.kind === 'alert'
                ? 'w-[9px] h-[9px] border-[1.5px] border-bad bg-bad'
                : 'w-[9px] h-[9px] border-[1.5px] border-ink-2';

          return (
            <div key={item.key}>
              <span
                className={`absolute rounded-full bg-paper -translate-x-1/2 -translate-y-1/2 ${dot}`}
                style={{ left: `${item.pct}%`, top: lineY }}
              />
              {item.side === 'below' ? (
                <span
                  ref={setRef}
                  className={`absolute whitespace-nowrap flex flex-col ${item.align === 'start' ? 'items-start' : item.align === 'end' ? 'items-end' : 'items-center'}`}
                  style={{ ...horizontal(item), top: lineY + LINE_ZONE / 2 + 2 + row * ROW_BELOW }}
                >
                  <span className="num text-[17px] leading-tight text-ink">{item.age}</span>
                  <span className="font-serif text-[13px] text-ink-2">{item.label}</span>
                </span>
              ) : (
                <span
                  ref={setRef}
                  className={`absolute whitespace-nowrap flex items-baseline gap-1.5 ${item.kind === 'alert' ? 'text-bad' : 'text-ink-2'}`}
                  style={{ ...horizontal(item), top: lineY - LINE_ZONE / 2 - (row + 1) * ROW_ABOVE + 4 }}
                >
                  <span className="font-serif text-[13px]">{item.label}</span>
                  <span className={`num text-base ${item.kind === 'alert' ? 'text-bad' : 'text-ink'}`}>{item.age}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
