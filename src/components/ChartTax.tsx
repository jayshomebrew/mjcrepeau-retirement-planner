import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AXIS_PROPS, BAR_CURSOR, CHART_THEME, TOOLTIP_CLASS, LEGEND_PROPS, currencyAxisProps } from './chartTheme';
import { niceTicks } from '../utils/format';
import { RetirementResult } from '../types';
import { CHART_COLORS } from '../utils/constants';
import { useCountry } from '../contexts/CountryContext';

interface ChartTaxProps {
  result: RetirementResult;
  /**
   * Recharts reveals series by animating a clip path from zero width. The
   * print report is captured moments after mount, so animation must be off
   * or the chart prints blank.
   */
  animate?: boolean;
}

function formatTooltipValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  result: RetirementResult;
  regionalLabel: string;
}

function CustomTooltip({ active, payload, label, result, regionalLabel }: CustomTooltipProps) {
  if (!active || !payload) return null;

  const yearData = result.yearlyWithdrawals.find(y => y.age === label);
  if (!yearData) return null;

  const effectiveRate = yearData.grossIncome > 0
    ? ((yearData.totalTax / yearData.grossIncome) * 100).toFixed(1)
    : '0.0';

  return (
    <div className={TOOLTIP_CLASS}>
      <p className="text-xs text-ink-2 mb-1.5">Age {label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span style={{ color: CHART_COLORS.pretax }}>Federal tax</span>
          <span className="num text-ink">{formatTooltipValue(yearData.federalTax)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: CHART_COLORS.hsa }}>{regionalLabel}</span>
          <span className="num text-ink">{formatTooltipValue(yearData.stateTax)}</span>
        </div>
        {yearData.totalPenalties > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-bad">Penalties</span>
            <span className="num text-bad">{formatTooltipValue(yearData.totalPenalties)}</span>
          </div>
        )}
        <div className="border-t border-hair mt-2 pt-2">
          <div className="flex justify-between gap-4 font-medium">
            <span style={{ color: CHART_COLORS.tax }}>Total tax</span>
            <span className="num text-ink">{formatTooltipValue(yearData.totalTax)}</span>
          </div>
          <div className="flex justify-between gap-4 text-ink-2 mt-1">
            <span>Effective rate</span>
            <span className="num">{effectiveRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartTax({ result, animate = true }: ChartTaxProps) {
  const { country } = useCountry();
  const regionalLabel = country === 'CA' ? 'Provincial tax' : 'State tax';

  // Transform data for the chart
  const chartData = result.yearlyWithdrawals.map(year => {
    const effectiveRate = year.grossIncome > 0
      ? (year.totalTax / year.grossIncome) * 100
      : 0;

    return {
      age: year.age,
      federalTax: year.federalTax,
      stateTax: year.stateTax,
      totalTax: year.totalTax,
      effectiveRate,
    };
  });

  // The rate axis gets the same round-number treatment as the currency axis,
  // and never drops below a 0–20% scale so a low flat rate still reads.
  const rateAxis = niceTicks(Math.max(20, ...chartData.map(d => d.effectiveRate)));

  return (
    <div className="w-full h-80 touch-pan-y">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_THEME.grid} />
          <XAxis
            dataKey="age"
            {...AXIS_PROPS}
          />
          <YAxis yAxisId="left" {...currencyAxisProps(Math.max(...chartData.map(d => d.totalTax)))} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v: number) => `${v}%`}
            {...AXIS_PROPS}
            {...rateAxis}
            width={44}
          />
          <Tooltip content={<CustomTooltip result={result} regionalLabel={regionalLabel} />} cursor={BAR_CURSOR} />
          <Legend
            {...LEGEND_PROPS}
            formatter={(value) => <span style={{ color: CHART_THEME.legend }}>{value}</span>}
          />
          <Bar
            isAnimationActive={animate}
            yAxisId="left"
            dataKey="federalTax"
            name="Federal tax"
            stackId="tax"
            fill={CHART_COLORS.pretax}
            fillOpacity={0.85}
          />
          <Bar
            isAnimationActive={animate}
            yAxisId="left"
            dataKey="stateTax"
            name={regionalLabel}
            stackId="tax"
            fill={CHART_COLORS.hsa}
            fillOpacity={0.85}
          />
          <Line
            isAnimationActive={animate}
            yAxisId="right"
            type="monotone"
            dataKey="effectiveRate"
            name="Effective rate"
            stroke={CHART_COLORS.tax}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
