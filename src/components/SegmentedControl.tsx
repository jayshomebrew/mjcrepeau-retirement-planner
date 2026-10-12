import { useCallback, useLayoutEffect, useRef, useState } from 'react';

interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  /** Accessible name for the tab list. */
  label: string;
  size?: 'md' | 'sm';
  className?: string;
}

/**
 * Tab strip with a glass lens that slides to the selected option.
 *
 * The lens is positioned from the selected button's measured offset, so it
 * follows label width changes (font load, resize) without hard-coded sizes.
 * It only animates after its first placement, so it doesn't sweep in from the
 * left edge on mount.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>());
  const [lens, setLens] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  const measure = useCallback(() => {
    const button = buttonRefs.current.get(value);
    if (!button) return;
    setLens(prev =>
      prev && prev.left === button.offsetLeft && prev.width === button.offsetWidth
        ? prev
        : { left: button.offsetLeft, width: button.offsetWidth }
    );
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Re-measure when the strip resizes or the web font swaps in.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [measure]);

  // Enable the slide only once the lens has a resting place.
  useLayoutEffect(() => {
    if (lens && !animate) {
      const frame = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [lens, animate]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = options.findIndex(o => o.id === value);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = options[(index + step + options.length) % options.length];
    onChange(next.id);
    buttonRefs.current.get(next.id)?.focus();
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={`seg ${size === 'sm' ? 'seg-sm' : ''} w-max ${className}`}
    >
      {lens && (
        <span
          aria-hidden="true"
          className="seg-lens"
          style={{
            left: lens.left,
            width: lens.width,
            transitionProperty: animate ? undefined : 'none',
          }}
        />
      )}
      {options.map(option => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            ref={el => {
              if (el) buttonRefs.current.set(option.id, el);
              else buttonRefs.current.delete(option.id);
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.id)}
            className="seg-option"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
