import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible]);

  return (
    <span
      ref={tooltipRef}
      className="relative inline-block ml-1 group"
    >
      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        className="inline-grid place-items-center w-4 h-4 rounded-full text-ink-3 hover:text-ink cursor-pointer align-[-2px]"
        aria-label="More information"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
          <path strokeLinecap="round" strokeWidth={1.8} d="M12 11v5M12 8h.01" />
        </svg>
      </button>
      {/* Desktop: show on hover via group-hover. Mobile: show on click via isVisible */}
      <span
        className={`glass glass-strong absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 text-xs font-normal leading-snug text-ink rounded-xl whitespace-normal w-56 text-left pointer-events-none
          ${isVisible ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}
          transition-opacity duration-150`}
      >
        {text}
      </span>
    </span>
  );
}
