import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { CHART_THEME, LEGEND_PROPS, TOOLTIP_CLASS } from './chartTheme';
import { Account, AccumulationResult } from '../types';
import { useCountry } from '../contexts/CountryContext';
import { CHART_COLORS } from '../utils/constants';

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
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
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.payload.color }}
        />
        <span className="num text-ink">{data.name}</span>
      </div>
      <div className="mt-1 text-sm">
        <div className="num text-ink">{formatCurrency(data.value)}</div>
        <div className="text-ink-2">{percentage}% of portfolio</div>
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

export function ChartComposition({ accounts, result, animate = true }: ChartCompositionProps) {
  const { config: countryConfig } = useCountry();

  const accountGroupings = countryConfig.getAccountGroupings();

  // Create data by account groupings
  const groupData = accountGroupings
    .filter(group => (result.breakdownByGroup[group.id] || 0) > 0)
    .map(group => ({
      name: group.label,
      value: result.breakdownByGroup[group.id] || 0,
      color: group.color,
    }));

  // Create data by individual account
  // Find which group each account belongs to for coloring
  const accountData = accounts
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* By Account Type */}
      <div>
        <h4 className="font-serif italic text-[14.5px] text-ink-2 text-center mb-2">
          By account type
        </h4>
        <div className="h-64 touch-pan-y">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                isAnimationActive={animate}
                data={groupData}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={84}
                paddingAngle={2}
                stroke={CHART_THEME.paper}
                dataKey="value"
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {groupData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={total} />} />
              <Legend
                {...LEGEND_PROPS}
                wrapperStyle={{ ...LEGEND_PROPS.wrapperStyle, paddingTop: 0 }}
                formatter={(value) => <span style={{ color: CHART_THEME.legend }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By Account */}
      <div>
        <h4 className="font-serif italic text-[14.5px] text-ink-2 text-center mb-2">
          By account
        </h4>
        <div className="h-64 touch-pan-y">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                isAnimationActive={animate}
                data={accountData}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={84}
                paddingAngle={2}
                stroke={CHART_THEME.paper}
                dataKey="value"
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {accountData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip total={total} />} />
              <Legend
                {...LEGEND_PROPS}
                wrapperStyle={{ ...LEGEND_PROPS.wrapperStyle, paddingTop: 0 }}
                formatter={(value) => <span style={{ color: CHART_THEME.legend }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
