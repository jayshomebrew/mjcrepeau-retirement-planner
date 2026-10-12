/**
 * Shared Recharts styling. Every value is a CSS variable from index.css, so
 * charts follow light/dark mode without re-rendering or an isDarkMode prop.
 */
export const CHART_THEME = {
  grid: 'var(--hair)',
  axis: 'var(--hair-strong)',
  tick: 'var(--ink-2)',
  legend: 'var(--ink-2)',
  /** Fill behind slice labels and between pie segments: the page itself. */
  paper: 'var(--paper)',
};

/** Spread onto XAxis/YAxis: serif tick figures, a hairline axis, no tick marks. */
export const AXIS_PROPS = {
  tick: { fontSize: 12, fill: CHART_THEME.tick, fontFamily: 'var(--font-serif)' },
  tickLine: false,
  stroke: CHART_THEME.axis,
};

/** Spread onto Legend: serif labels on the paper, small round swatches. */
export const LEGEND_PROPS = {
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: {
    fontFamily: 'var(--font-serif)',
    fontSize: 14,
    color: CHART_THEME.legend,
    paddingTop: 10,
  },
};

/** Hover cursor for line/area charts: a thin vertical rule. */
export const LINE_CURSOR = { stroke: 'var(--ink-3)', strokeWidth: 1 };

/** Hover cursor for bar charts: a faint column wash. */
export const BAR_CURSOR = { fill: 'var(--hover)' };

/** Floating tooltip surface: frosted glass so values stay legible over the plot. */
export const TOOLTIP_CLASS = 'glass glass-strong rounded-[14px] px-3.5 py-2.5 text-sm text-ink min-w-[12rem]';
