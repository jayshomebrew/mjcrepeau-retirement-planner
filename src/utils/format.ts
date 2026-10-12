/** Whole-dollar currency, e.g. "$4,335,309". */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(currency === 'CAD' ? 'en-CA' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Short currency for space-constrained summary tiles: "$950", "$14.5k",
 * "$173.4k", "$1.44M". Thousands keep one decimal, millions and billions two.
 * A value that would round up to the next unit is shown in that unit, so
 * 999,960 reads "$1.00M" rather than "$1000.0k".
 */
export function formatCompactCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (Math.round(abs) < 1000) return `${sign}$${Math.round(abs)}`;
  if (Number((abs / 1e3).toFixed(1)) < 1000) return `${sign}$${(abs / 1e3).toFixed(1)}k`;
  if (Number((abs / 1e6).toFixed(2)) < 1000) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  return `${sign}$${(abs / 1e9).toFixed(2)}B`;
}
