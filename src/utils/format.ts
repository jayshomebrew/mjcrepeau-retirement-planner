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

/**
 * Axis tick labels: the compact form with no forced decimals, so a run of
 * ticks reads "$0, $2M, $4M, $6M" or "$0, $150k, $300k". Values are expected
 * to be round numbers from `niceTicks`; anything else keeps one decimal.
 */
export function formatAxisCurrency(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const trim = (n: number) => String(Number(n.toFixed(1)));

  if (abs >= 1e9) return `${sign}$${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}$${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}$${trim(abs / 1e3)}k`;
  return `${sign}$${Math.round(abs)}`;
}

/**
 * A round axis scale for a chart whose data runs from zero to `max`: the
 * step is 1, 2, 2.5 or 5 × 10ⁿ, the top tick is the first step at or above
 * `max`, and the ticks are every step from zero. Recharts' own "nice" domain
 * is not applied consistently across chart types (a composed chart with two
 * axes ends up with ticks at raw quarters of the data maximum), so every
 * chart sets its domain and ticks explicitly from this.
 */
export function niceTicks(max: number, count = 4): { domain: [number, number]; ticks: number[] } {
  if (!(max > 0)) return { domain: [0, 1], ticks: [0, 1] };
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const factor = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  const step = factor * magnitude;
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let i = 0; i * step <= top + 1e-9; i++) ticks.push(Number((i * step).toFixed(10)));
  return { domain: [0, top], ticks };
}
