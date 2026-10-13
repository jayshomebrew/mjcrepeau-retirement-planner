import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AXIS_PROPS, BAR_CURSOR, CHART_THEME, TOOLTIP_CLASS, LEGEND_PROPS, currencyAxisProps } from './chartTheme';
import { RetirementResult, IncomeStream } from '../types';
import { CHART_COLORS } from '../utils/constants';
import { useCountry } from '../contexts/CountryContext';

interface ChartIncomeProps {
  result: RetirementResult;
  incomeStreams?: IncomeStream[];
  /**
   * Recharts reveals series by animating a clip path from zero width. The
   * print report is captured moments after mount, so animation must be off
   * or the chart prints blank.
   */
  animate?: boolean;
}

function formatTooltipValue(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(currency === 'CAD' ? 'en-CA' : 'en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: number;
  result: RetirementResult;
  currency: string;
}

function CustomTooltip({ active, payload, label, result, currency }: CustomTooltipProps) {
  if (!active || !payload) return null;

  const yearData = result.yearlyWithdrawals.find(y => y.age === label);
  if (!yearData) return null;

  return (
    <div className={TOOLTIP_CLASS}>
      <p className="text-xs text-ink-2 mb-1.5">Age {label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span style={{ color: CHART_COLORS.pretax }}>Withdrawals</span>
          <span className="num text-ink">{formatTooltipValue(yearData.totalWithdrawal, currency)}</span>
        </div>
        {payload?.filter(p => ['socialSecurity', 'pension', 'otherIncome', 'taxFreeIncome'].includes(p.dataKey) && p.value > 0).map(p => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="num text-ink">{formatTooltipValue(p.value, currency)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-hair pt-1 mt-1">
          <span className="text-ink-2">Gross income</span>
          <span className="num text-ink">{formatTooltipValue(yearData.grossIncome, currency)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: CHART_COLORS.tax }}>Taxes</span>
          <span className="num text-bad">
            -{formatTooltipValue(yearData.totalTax, currency)}
            {yearData.totalPenalties > 0 && (
              <span className="text-xs"> (includes {formatTooltipValue(yearData.totalPenalties, currency)} penalties)</span>
            )}
          </span>
        </div>
        <div className="border-t border-hair mt-2 pt-2 flex justify-between gap-4 font-medium">
          <span style={{ color: CHART_COLORS.spending }}>After-tax income</span>
          <span className="num text-ink">{formatTooltipValue(yearData.afterTaxIncome, currency)}</span>
        </div>
      </div>
    </div>
  );
}

export function ChartIncome({ result, incomeStreams = [], animate = true }: ChartIncomeProps) {
  const { country } = useCountry();
  const isCanada = country === 'CA';
  const currency = isCanada ? 'CAD' : 'USD';
  const govBenefitLabel = isCanada ? 'CPP/OAS' : 'Social Security';

  // Determine which income stream bands have data
  const hasPensionStreams = incomeStreams.some(s => s.taxTreatment === 'fully_taxable');
  const hasOtherIncomeStreams = incomeStreams.some(s => s.taxTreatment === 'other_income');
  const hasTaxFreeStreams = incomeStreams.some(s => s.taxTreatment === 'tax_free');

  // Transform data for the chart
  // Show gross income as stacked bars (positive), taxes as separate negative bar
  const chartData = result.yearlyWithdrawals.map(year => {
    let ssIncome = 0;
    let pensionIncome = 0;
    let otherIncome = 0;
    let taxFreeIncome = 0;

    // Split incomeStreamIncome proportionally by tax treatment
    const activeStreams = incomeStreams.filter(s => year.age >= s.startAge && (!s.endAge || year.age <= s.endAge));
    const totalMonthly = activeStreams.reduce((sum, s) => sum + s.monthlyAmount, 0);

    if (totalMonthly > 0 && year.incomeStreamIncome > 0) {
      for (const stream of activeStreams) {
        const ratio = stream.monthlyAmount / totalMonthly;
        const streamAmount = year.incomeStreamIncome * ratio;
        switch (stream.taxTreatment) {
          case 'social_security': ssIncome += streamAmount; break;
          case 'fully_taxable': pensionIncome += streamAmount; break;
          case 'other_income': otherIncome += streamAmount; break;
          case 'tax_free': taxFreeIncome += streamAmount; break;
        }
      }
    }

    // Government benefits (Canada CPP/OAS) go into the SS band
    ssIncome += year.governmentBenefitIncome;

    return {
      age: year.age,
      withdrawals: year.totalWithdrawal,
      socialSecurity: ssIncome,
      pension: pensionIncome,
      otherIncome: otherIncome,
      taxFreeIncome: taxFreeIncome,
      taxes: year.totalTax,
      afterTax: year.afterTaxIncome,
      gross: year.grossIncome,
    };
  });

  return (
    <div className="w-full h-80 touch-pan-y">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_THEME.grid} />
          <XAxis
            dataKey="age"
            {...AXIS_PROPS}
          />
          <YAxis {...currencyAxisProps(Math.max(...chartData.map(d => d.gross)))} />
          <Tooltip content={<CustomTooltip result={result} currency={currency} />} cursor={BAR_CURSOR} />
          <Legend
            {...LEGEND_PROPS}
            formatter={(value) => <span style={{ color: CHART_THEME.legend }}>{value}</span>}
          />
          <ReferenceLine y={0} stroke={CHART_THEME.axis} />
          {/* Gross income components - stacked bars */}
          <Bar
            isAnimationActive={animate}
            dataKey="withdrawals"
            name="Withdrawals"
            stackId="income"
            fill={CHART_COLORS.pretax}
            fillOpacity={0.85}
          />
          <Bar
            isAnimationActive={animate}
            dataKey="socialSecurity"
            name={govBenefitLabel}
            stackId="income"
            fill={CHART_COLORS.socialSecurity}
            fillOpacity={0.85}
          />
          {hasPensionStreams && (
            <Bar
              isAnimationActive={animate}
              dataKey="pension"
              name="Pension"
              stackId="income"
              fill={CHART_COLORS.pension}
              fillOpacity={0.85}
            />
          )}
          {hasOtherIncomeStreams && (
            <Bar
              isAnimationActive={animate}
              dataKey="otherIncome"
              name="Other income"
              stackId="income"
              fill={CHART_COLORS.otherIncome}
              fillOpacity={0.85}
            />
          )}
          {hasTaxFreeStreams && (
            <Bar
              isAnimationActive={animate}
              dataKey="taxFreeIncome"
              name="Tax-free income"
              stackId="income"
              fill={CHART_COLORS.taxFreeIncome}
              fillOpacity={0.85}
            />
          )}
          {/* After-tax income line - the key metric */}
          <Line
            isAnimationActive={animate}
            type="monotone"
            dataKey="afterTax"
            name="After-tax income"
            stroke={CHART_COLORS.spending}
            strokeWidth={3}
            dot={false}
          />
          {/* Taxes as a separate line for reference */}
          <Line
            isAnimationActive={animate}
            type="monotone"
            dataKey="taxes"
            name="Taxes paid"
            stroke={CHART_COLORS.tax}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
