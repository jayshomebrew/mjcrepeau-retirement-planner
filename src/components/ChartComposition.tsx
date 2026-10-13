import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_THEME, TOOLTIP_CLASS } from './chartTheme';
import { Account, AccumulationResult } from '../types';
import { useCountry } from '../contexts/CountryContext';
import { CHART_COLORS } from '../utils/constants';
import { formatCurrency as formatCurrencyWithCode } from '../utils/format';

interface Slice {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface ChartCompositionProps {
  accounts: Account[];
  result: AccumulationResult;
  /**
   * Recharts reveals series by animating a clip path from zero width. The
   * print report is captured moments after mount, so animation must be off
   * or the chart prints blank.
   */
  animate?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
  total: number;
}

function CustomTooltip({ active, payload, total }: CustomTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0];
  const percentage = ((data.value / total) * 100).toFixed(1);

  return (
    <div className={TOOLTIP_CLASS}>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
        <span className="font-medium text-ink">{data.name}</span>
      </div>
      <div className="mt-1 flex justify-between gap-4 text-sm">
        <span className="num text-ink">{formatCurrencyWithCode(data.value)}</span>
        <span className="num text-ink-2">{percentage}%</span>
      </div>
    </div>
  );
}

interface LabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function renderCustomizedLabel(props: LabelProps) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
  if (percent < 0.05) return null; // Don't show labels for small slices

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={CHART_THEME.paper}
      textAnchor="middle"
      dominantBaseline="central"
      className="num text-xs"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/**
 * One donut with its figures listed beneath it. The list replaces the chart
 * library's legend: it keeps the data's order (the legend reversed it), and
 * it carries the amount and share of each slice, so the chart reads as a
 * small typeset table rather than a key.
 */
function Donut({
  title,
  data,
  total,
  animate,
  formatCurrency,
}: {
  title: string;
  data: Slice[];
  total: number;
  animate: boolean;
  formatCurrency: (value: number) => string;
}) {
  return (
    <div>
      <h4 className="font-serif italic text-[14.5px] text-ink-2 text-center mb-1">{title}</h4>
      <div className="h-52 touch-pan-y">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={animate}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              stroke={CHART_THEME.paper}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full mt-2 font-serif text-[14.5px] border-t border-hair-strong">
        <tbody className="[&>tr+tr>td]:border-t [&>tr+tr>td]:border-hair">
          {data.map(entry => (
            <tr key={entry.name}>
              <td className="py-1.5 pr-3 text-ink-2">
                <span className="flex items-baseline gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 relative -top-px"
                    style={{ backgroundColor: entry.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{entry.name}</span>
                </span>
              </td>
              <td className="py-1.5 pl-3 num text-right text-ink whitespace-nowrap">{formatCurrency(entry.value)}</td>
              <td className="py-1.5 pl-3 num text-right text-[13px] text-ink-3 whitespace-nowrap w-[3.5rem]">
                {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartComposition({ accounts, result, animate = true }: ChartCompositionProps) {
  const { country, config: countryConfig } = useCountry();
  const formatCurrency = (value: number) => formatCurrencyWithCode(value, country === 'CA' ? 'CAD' : 'USD');

  const accountGroupings = countryConfig.getAccountGroupings();

  // By tax treatment, in the groupings' order (the same order as the hero bar).
  const groupData: Slice[] = accountGroupings
    .filter(group => (result.breakdownByGroup[group.id] || 0) > 0)
    .map(group => ({
      name: group.label,
      value: result.breakdownByGroup[group.id] || 0,
      color: group.color,
    }));

  // By account, coloured by the group each belongs to.
  const accountData: Slice[] = accounts
    .map(account => {
      const group = accountGroupings.find(g => g.accountTypes.includes(account.type));
      return {
        name: account.name,
        value: result.finalBalances[account.id] || 0,
        color: group?.color || CHART_COLORS.pretax,
      };
    })
    .filter(d => d.value > 0);

  const total = result.totalAtRetirement;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
      <Donut title="By account type" data={groupData} total={total} animate={animate} formatCurrency={formatCurrency} />
      <Donut title="By account" data={accountData} total={total} animate={animate} formatCurrency={formatCurrency} />
    </div>
  );
}
