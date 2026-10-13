import { ReactNode, useLayoutEffect, useRef, useState } from 'react';

interface CollapseProps {
  open: boolean;
  id?: string;
  /** Classes for the outer region, e.g. to cancel a parent's `space-y` margin. */
  className?: string;
  children: ReactNode;
}

/**
 * A region that eases open and closed instead of snapping.
 *
 * The height is driven to the content's measured height, so it also eases
 * when the content changes size while open (another figure selected, a form
 * error appearing). Children stay mounted until the close finishes, then
 * unmount. The region clips only while it moves, so focus rings and shadows
 * aren't cut off at rest.
 */
export function Collapse({ open, id, className = '', children }: CollapseProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const animate = useRef(false);
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const fit = () => {
      const height = `${open ? inner.offsetHeight : 0}px`;
      if (outer.style.height === height) return;
      outer.style.height = height;
      if (animate.current) delete outer.dataset.settled;
      else if (open) outer.dataset.settled = '';
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [open]);

  // Animate only after the first placement, so a region that starts open
  // doesn't grow in on page load.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      animate.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    const outer = event.currentTarget;
    if (event.target !== outer || event.propertyName !== 'height') return;
    if (open) outer.dataset.settled = '';
    else if (outer.offsetHeight === 0) setMounted(false);
  };

  return (
    <div
      ref={outerRef}
      id={id}
      className={`collapsible ${className}`}
      data-open={open || undefined}
      inert={!open}
      onTransitionEnd={handleTransitionEnd}
    >
      <div ref={innerRef}>{(open || mounted) && children}</div>
    </div>
  );
}
