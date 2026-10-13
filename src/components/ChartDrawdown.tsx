import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AXIS_PROPS, CHART_THEME, LINE_CURSOR, TOOLTIP_CLASS, LEGEND_PROPS, currencyAxisProps } from './chartTheme';
import { Account, RetirementResult, getTaxTreatment } from '../types';
import { CHART_COLORS } from '../utils/constants';

interface ChartDrawdownProps {
  accounts: Account[];
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

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: number;
  accounts: Account[];
  result: RetirementResult;
}

function CustomTooltip({ active, payload, label, accounts, result }: CustomTooltipProps) {
  if (!active || !payload) return null;

  const yearData = result.yearlyWithdrawals.find(y => y.age === label);
  const total = payload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className={TOOLTIP_CLASS}>
      <p className="text-xs text-ink-2 mb-1.5">Age {label}</p>
      {payload.filter(p => p.value > 0).reverse().map((entry, index) => {
        const account = accounts.find(a => a.id === entry.name);
        return (
          <div key={index} className="flex justify-between gap-4 text-sm">
            <span style={{ color: entry.color }}>{account?.name || entry.name}</span>
            <span className="num text-ink">{formatTooltipValue(entry.value)}</span>
          </div>
        );
      })}
      <div className="border-t border-hair mt-2 pt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-4 font-medium text-ink">
          <span>Total portfolio</span>
          <span className="num">{formatTooltipValue(total)}</span>
        </div>
        {yearData && (
          <div className="flex justify-between gap-4 text-ink-2">
            <span>Annual withdrawal</span>
            <span className="num">{formatTooltipValue(yearData.totalWithdrawal)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartDrawdown({ accounts, result, animate = true }: ChartDrawdownProps) {
  // Transform data for the stacked area chart
  const chartData = result.yearlyWithdrawals.map(year => {
    const dataPoint: Record<string, number | string> = {
      age: year.age,
      total: year.totalRemainingBalance,
    };

    accounts.forEach(account => {
      dataPoint[account.id] = year.remainingBalances[account.id] || 0;
    });

    return dataPoint;
  });

  // Sort accounts by tax treatment for consistent stacking order
  const sortedAccounts = [...accounts].sort((a, b) => {
    const order = { pretax: 0, roth: 1, taxable: 2, hsa: 3 };
    return order[getTaxTreatment(a.type)] - order[getTaxTreatment(b.type)];
  });

  return (
    <div className="w-full h-80 touch-pan-y">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_THEME.grid} />
          <XAxis
            dataKey="age"
            {...AXIS_PROPS}
          />
          <YAxis {...currencyAxisProps(Math.max(...result.yearlyWithdrawals.map(y => y.totalRemainingBalance)))} />
          <Tooltip content={<CustomTooltip accounts={accounts} result={result} />} cursor={LINE_CURSOR} />
          <Legend
            {...LEGEND_PROPS}
            formatter={(value) => {
              const account = accounts.find(a => a.id === value);
              return <span style={{ color: CHART_THEME.legend }}>{account?.name || value}</span>;
            }}
          />
          {sortedAccounts.map(account => (
            <Area
              isAnimationActive={animate}
              key={account.id}
              type="monotone"
              dataKey={account.id}
              name={account.id}
              stackId="1"
              stroke={CHART_COLORS[getTaxTreatment(account.type)]}
              fill={CHART_COLORS[getTaxTreatment(account.type)]}
              fillOpacity={0.22}
              strokeWidth={1.75}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
