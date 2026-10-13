import { Fragment, useState } from 'react';
import {
  Account,
  Assumptions,
  RetirementResult,
  IncomeStream,
  IncomeTaxTreatment,
  Profile,
  getTaxTreatment,
} from '../types';
import { CHART_COLORS } from '../utils/constants';
import { useCountry } from '../contexts/CountryContext';
import { buildExportMeta, buildWithdrawalTable } from '../utils/export';
import { CsvDownloadButton } from './CsvDownloadButton';
import { Figure } from './Figure';
import { SegmentedControl } from './SegmentedControl';
import { Collapse } from './Collapse';

interface DataTableWithdrawalProps {
  accounts: Account[];
  result: RetirementResult;
  incomeStreams?: IncomeStream[];
  profile: Profile;
  assumptions: Assumptions;
}

function formatCurrencyWithCode(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(currency === 'CAD' ? 'en-CA' : 'en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '–';
  return `${(value * 100).toFixed(1)}%`;
}

type ViewMode = 'income' | 'withdrawals' | 'balances' | 'taxes' | 'incomeStreams';

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'income', label: 'Income and spending' },
  { id: 'withdrawals', label: 'Withdrawals by account' },
  { id: 'balances', label: 'Remaining balances' },
  { id: 'taxes', label: 'Tax details' },
  { id: 'incomeStreams', label: 'Income streams' },
];

/*
 * Booktabs-style table set on the paper: a heavier rule above the header and
 * below the last row, a stronger rule under the header, hairlines between
 * rows, no vertical lines. Rules sit on the cells (border-separate) rather
 * than the rows so the sticky age column carries its own rules when the table
 * scrolls sideways.
 */
const TABLE = 'min-w-full border-separate border-spacing-0 border-y-[1.5px] border-ink/60 text-sm';
const TBODY = '[&>tr:last-child>td]:border-b-0';
const ROW = 'group hover:bg-hover';
const CELL = 'py-2 px-2';
// The age column stays put while the rest scrolls under it, so it needs an
// opaque fill; bg-page repeats the viewport-fixed page texture so the column
// blends into the page. The row's hover wash sits beneath that fill, so it is
// layered back on top as a background image.
const STICKY = 'sticky left-0 bg-page';
const STICKY_HOVER = 'group-hover:bg-[linear-gradient(var(--hover),var(--hover))]';

const TH = `${CELL} align-bottom font-serif italic text-[14px] font-normal border-b border-hair-strong`;
const TH_AGE = `${TH} ${STICKY} text-left text-ink-2`;
const TD = `${CELL} num text-[15px] border-b border-hair`;
const TD_AGE = `${TD} ${STICKY} ${STICKY_HOVER} text-left text-ink`;
const TF = `${CELL} num text-[15px] font-semibold border-t border-hair-strong`;
const TF_LABEL = `${CELL} ${STICKY} text-left text-sm font-semibold text-ink border-t border-hair-strong`;

export function DataTableWithdrawal({
  accounts,
  result,
  incomeStreams = [],
  profile,
  assumptions,
}: DataTableWithdrawalProps) {
  const { country } = useCountry();
  const currency = country === 'CA' ? 'CAD' : 'USD';
  const formatCurrency = (value: number) => formatCurrencyWithCode(value, currency);

  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('income');
  const [expandedPenaltyRows, setExpandedPenaltyRows] = useState<Set<number>>(new Set());

  const togglePenaltyRow = (age: number) => {
    setExpandedPenaltyRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(age)) {
        newSet.delete(age);
      } else {
        newSet.add(age);
      }
      return newSet;
    });
  };

  if (!result.yearlyWithdrawals.length) return null;

  const buildCsvTable = () =>
    buildWithdrawalTable(
      viewMode,
      accounts,
      result,
      incomeStreams,
      buildExportMeta(profile, assumptions, country)
    );

  // Get color class based on account tax treatment
  const getColorClass = (accountType: Account['type']): string => {
    const treatment = getTaxTreatment(accountType);
    switch (treatment) {
      case 'pretax': return 'text-pretax';
      case 'roth': return 'text-roth';
      case 'taxable': return 'text-taxable';
      case 'hsa': return 'text-hsa';
    }
  };

  // Get inline color for income stream tax treatment
  const getStreamColor = (taxTreatment: IncomeTaxTreatment): string => {
    switch (taxTreatment) {
      case 'social_security': return CHART_COLORS.socialSecurity;
      case 'fully_taxable': return CHART_COLORS.pension;
      case 'other_income': return CHART_COLORS.otherIncome;
      case 'tax_free': return CHART_COLORS.taxFreeIncome;
    }
  };

  return (
    <Figure
      title="Year-by-year data"
      actions={
        <div className="flex items-center gap-2">
          {isExpanded && <CsvDownloadButton getTable={buildCsvTable} />}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label="Year-by-year data"
            title={isExpanded ? 'Hide table' : 'Show table'}
            className="icon-btn"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      }
    >
      <Collapse open={isExpanded}>
        {/* Scrolls sideways on narrow screens; the padding keeps focus rings unclipped. */}
        <div className="-mx-1 -mt-1 mb-3 p-1 overflow-x-auto scrollbar-hide">
          <SegmentedControl
            size="sm"
            label="Table view"
            options={VIEW_OPTIONS}
            value={viewMode}
            onChange={setViewMode}
          />
        </div>

        <div
          key={viewMode}
          role="tabpanel"
          aria-label={VIEW_OPTIONS.find(o => o.id === viewMode)?.label}
          className="fade-in overflow-x-auto"
        >
          {viewMode === 'income' && (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH_AGE}>Age</th>
                  <th className={`${TH} text-right text-ink-2`}>Target spending</th>
                  <th className={`${TH} text-right text-ink-2`}>Withdrawals</th>
                  <th className={`${TH} text-right`} style={{ color: CHART_COLORS.retirementIncome }}>Retirement income</th>
                  <th className={`${TH} text-right text-ink-2`}>Gross income</th>
                  <th className={`${TH} text-right text-tax`}>Total taxes</th>
                  <th className={`${TH} text-right text-spending`}>After-tax income</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {result.yearlyWithdrawals.map((yearData) => (
                  <tr key={yearData.age} className={ROW}>
                    <td className={TD_AGE}>{yearData.age}</td>
                    <td className={`${TD} text-right text-ink-2`}>{formatCurrency(yearData.targetSpending)}</td>
                    <td className={`${TD} text-right text-ink`}>{formatCurrency(yearData.totalWithdrawal)}</td>
                    <td className={`${TD} text-right`} style={{ color: CHART_COLORS.retirementIncome }}>
                      {(yearData.governmentBenefitIncome + yearData.incomeStreamIncome) > 0 ? formatCurrency(yearData.governmentBenefitIncome + yearData.incomeStreamIncome) : '–'}
                    </td>
                    <td className={`${TD} text-right text-ink`}>{formatCurrency(yearData.grossIncome)}</td>
                    <td className={`${TD} text-right text-tax`}>{formatCurrency(yearData.totalTax)}</td>
                    <td className={`${TD} text-right text-spending`}>{formatCurrency(yearData.afterTaxIncome)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className={TF_LABEL}>Lifetime total</td>
                  <td className={`${TF} text-right text-ink-2`}>-</td>
                  <td className={`${TF} text-right text-ink`}>
                    {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.totalWithdrawal, 0))}
                  </td>
                  <td className={`${TF} text-right`} style={{ color: CHART_COLORS.retirementIncome }}>
                    {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.governmentBenefitIncome + y.incomeStreamIncome, 0))}
                  </td>
                  <td className={`${TF} text-right text-ink`}>
                    {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.grossIncome, 0))}
                  </td>
                  <td className={`${TF} text-right text-tax`}>
                    {formatCurrency(result.lifetimeTaxesPaid)}
                  </td>
                  <td className={`${TF} text-right text-spending`}>
                    {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.afterTaxIncome, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {viewMode === 'withdrawals' && (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH_AGE}>Age</th>
                  <th className={`${TH} text-right text-pretax`}>RMD</th>
                  {accounts.map(acc => (
                    <th key={acc.id} className={`${TH} text-right ${getColorClass(acc.type)}`}>
                      {acc.name}
                    </th>
                  ))}
                  <th className={`${TH} text-right text-ink-2`}>Total</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {result.yearlyWithdrawals.map((yearData) => (
                  <tr key={yearData.age} className={ROW}>
                    <td className={TD_AGE}>{yearData.age}</td>
                    <td className={`${TD} text-right text-pretax`}>
                      {yearData.rmdAmount > 0 ? formatCurrency(yearData.rmdAmount) : '–'}
                    </td>
                    {accounts.map(acc => (
                      <td key={acc.id} className={`${TD} text-right text-ink-2`}>
                        {(yearData.withdrawals[acc.id] || 0) > 0 ? formatCurrency(yearData.withdrawals[acc.id] || 0) : '–'}
                      </td>
                    ))}
                    <td className={`${TD} text-right text-ink`}>
                      {formatCurrency(yearData.totalWithdrawal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {viewMode === 'balances' && (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH_AGE}>Age</th>
                  {accounts.map(acc => (
                    <th key={acc.id} className={`${TH} text-right ${getColorClass(acc.type)}`}>
                      {acc.name}
                    </th>
                  ))}
                  <th className={`${TH} text-right text-ink-2`}>Total</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {result.yearlyWithdrawals.map((yearData) => (
                  <tr key={yearData.age} className={ROW}>
                    <td className={TD_AGE}>{yearData.age}</td>
                    {accounts.map(acc => (
                      <td key={acc.id} className={`${TD} text-right text-ink-2`}>
                        {formatCurrency(yearData.remainingBalances[acc.id] || 0)}
                      </td>
                    ))}
                    <td className={`${TD} text-right text-ink`}>
                      {formatCurrency(yearData.totalRemainingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {viewMode === 'taxes' && (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH_AGE}>Age</th>
                  <th className={`${TH} text-right text-ink-2`}>Gross income</th>
                  <th className={`${TH} text-right text-tax`}>Federal tax</th>
                  <th className={`${TH} text-right text-tax`}>State tax</th>
                  <th className={`${TH} text-right text-bad`}>Penalties</th>
                  <th className={`${TH} text-right text-tax`}>Total tax</th>
                  <th className={`${TH} text-right text-ink-2`}>Effective rate</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {result.yearlyWithdrawals.map((yearData) => {
                  const effectiveRate = yearData.grossIncome > 0 ? yearData.totalTax / yearData.grossIncome : 0;
                  const hasPenalties = yearData.totalPenalties > 0;
                  const hasPenaltyDetails = yearData.earlyWithdrawalPenalties.length > 0;
                  const isPenaltyExpanded = expandedPenaltyRows.has(yearData.age);
                  return (
                    // The key belongs on the fragment, not the inner rows —
                    // React never sees a keyed child otherwise.
                    <Fragment key={yearData.age}>
                      <tr className={ROW}>
                        <td className={TD_AGE}>{yearData.age}</td>
                        <td className={`${TD} text-right text-ink`}>{formatCurrency(yearData.grossIncome)}</td>
                        <td className={`${TD} text-right text-tax`}>{formatCurrency(yearData.federalTax)}</td>
                        <td className={`${TD} text-right text-tax`}>{formatCurrency(yearData.stateTax)}</td>
                        <td className={`${TD} text-right text-bad`}>
                          {hasPenalties ? (
                            <button
                              type="button"
                              onClick={() => togglePenaltyRow(yearData.age)}
                              aria-expanded={hasPenaltyDetails ? isPenaltyExpanded : undefined}
                              className="inline-flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              {formatCurrency(yearData.totalPenalties)}
                              {hasPenaltyDetails && (
                                <svg
                                  className={`w-3 h-3 transition-transform ${isPenaltyExpanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            '–'
                          )}
                        </td>
                        <td className={`${TD} text-right text-tax`}>{formatCurrency(yearData.totalTax)}</td>
                        <td className={`${TD} text-right text-ink-2`}>{formatPercent(effectiveRate)}</td>
                      </tr>
                      {/* Always rendered so the details can ease open; collapsed, the row has no height. */}
                      {hasPenalties && hasPenaltyDetails && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <Collapse open={isPenaltyExpanded}>
                              <div className={`${CELL} border-b border-hair bg-bad/10`}>
                                <div className="pl-4 border-l-2 border-bad/40 space-y-1">
                                  <p className="text-xs font-medium text-ink-2">Early withdrawal penalty details</p>
                                  {yearData.earlyWithdrawalPenalties.map((penalty, idx) => (
                                    <div key={idx} className="flex justify-between gap-4 text-xs text-ink-2">
                                      <span>{penalty.accountName}</span>
                                      <span className="num text-[13px] text-bad">
                                        {formatCurrency(penalty.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Collapse>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className={TF_LABEL}>Lifetime total</td>
                  <td className={`${TF} text-right text-ink`}>
                    {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.grossIncome, 0))}
                  </td>
                  <td className={`${TF} text-right text-tax`}>
                    {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.federalTax, 0))}
                  </td>
                  <td className={`${TF} text-right text-tax`}>
                    {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.stateTax, 0))}
                  </td>
                  <td className={`${TF} text-right text-bad`}>
                    {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.totalPenalties, 0))}
                  </td>
                  <td className={`${TF} text-right text-tax`}>
                    {formatCurrency(result.lifetimeTaxesPaid)}
                  </td>
                  <td className={`${TF} text-right text-ink-2`}>
                    {formatPercent(
                      result.lifetimeTaxesPaid /
                      result.yearlyWithdrawals.reduce((sum, y) => sum + y.grossIncome, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {viewMode === 'incomeStreams' && incomeStreams.length > 0 && (
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH_AGE}>Age</th>
                  {incomeStreams.map(stream => (
                    <th key={stream.id} className={`${TH} text-right`} style={{ color: getStreamColor(stream.taxTreatment) }}>
                      {stream.name}
                    </th>
                  ))}
                  {result.yearlyWithdrawals.some(y => y.governmentBenefitIncome > 0) && (
                    <th className={`${TH} text-right`} style={{ color: CHART_COLORS.socialSecurity }}>
                      Gov. benefits
                    </th>
                  )}
                  <th className={`${TH} text-right text-ink-2`}>Total</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {result.yearlyWithdrawals.map((yearData) => {
                  const activeStreams = incomeStreams.filter(s => yearData.age >= s.startAge && (!s.endAge || yearData.age <= s.endAge));
                  const totalMonthly = activeStreams.reduce((sum, s) => sum + s.monthlyAmount, 0);

                  return (
                    <tr key={yearData.age} className={ROW}>
                      <td className={TD_AGE}>{yearData.age}</td>
                      {incomeStreams.map(stream => {
                        if (yearData.age < stream.startAge || (stream.endAge && yearData.age > stream.endAge) || totalMonthly === 0) {
                          return <td key={stream.id} className={`${TD} text-right text-ink-2`}>-</td>;
                        }
                        const ratio = stream.monthlyAmount / totalMonthly;
                        const amount = yearData.incomeStreamIncome * ratio;
                        return (
                          <td key={stream.id} className={`${TD} text-right`} style={{ color: getStreamColor(stream.taxTreatment) }}>
                            {formatCurrency(amount)}
                          </td>
                        );
                      })}
                      {result.yearlyWithdrawals.some(y => y.governmentBenefitIncome > 0) && (
                        <td className={`${TD} text-right text-ink-2`}>
                          {yearData.governmentBenefitIncome > 0 ? formatCurrency(yearData.governmentBenefitIncome) : '–'}
                        </td>
                      )}
                      <td className={`${TD} text-right text-ink`}>
                        {(yearData.governmentBenefitIncome + yearData.incomeStreamIncome) > 0
                          ? formatCurrency(yearData.governmentBenefitIncome + yearData.incomeStreamIncome)
                          : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className={TF_LABEL}>Lifetime total</td>
                  {incomeStreams.map(stream => {
                    const total = result.yearlyWithdrawals.reduce((sum, yearData) => {
                      const activeStreams = incomeStreams.filter(s => yearData.age >= s.startAge && (!s.endAge || yearData.age <= s.endAge));
                      const totalMonthly = activeStreams.reduce((s, st) => s + st.monthlyAmount, 0);
                      if (yearData.age < stream.startAge || (stream.endAge && yearData.age > stream.endAge) || totalMonthly === 0) return sum;
                      return sum + yearData.incomeStreamIncome * (stream.monthlyAmount / totalMonthly);
                    }, 0);
                    return (
                      <td key={stream.id} className={`${TF} text-right`} style={{ color: getStreamColor(stream.taxTreatment) }}>
                        {formatCurrency(total)}
                      </td>
                    );
                  })}
                  {result.yearlyWithdrawals.some(y => y.governmentBenefitIncome > 0) && (
                    <td className={`${TF} text-right text-ink-2`}>
                      {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.governmentBenefitIncome, 0))}
                    </td>
                  )}
                  <td className={`${TF} text-right text-ink`}>
                    {formatCurrency(result.yearlyWithdrawals.reduce((sum, y) => sum + y.governmentBenefitIncome + y.incomeStreamIncome, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {viewMode === 'incomeStreams' && incomeStreams.length === 0 && (
            <p className="text-ink-2 text-sm py-8 text-center">
              No income streams configured. Add Social Security, pensions, or other income in the Income streams panel.
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-serif text-[13px] text-ink-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-pretax" aria-hidden="true"></span>
            <span>Pre-tax (RMD required)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-roth" aria-hidden="true"></span>
            <span>Roth (tax-free)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-taxable" aria-hidden="true"></span>
            <span>Taxable (capital gains)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-hsa" aria-hidden="true"></span>
            <span>HSA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.socialSecurity }} aria-hidden="true"></span>
            <span>Social Security</span>
          </div>
          {incomeStreams.some(s => s.taxTreatment === 'fully_taxable') && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.pension }} aria-hidden="true"></span>
              <span>Pension / annuity</span>
            </div>
          )}
          {incomeStreams.some(s => s.taxTreatment === 'other_income') && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.otherIncome }} aria-hidden="true"></span>
              <span>Other income</span>
            </div>
          )}
          {incomeStreams.some(s => s.taxTreatment === 'tax_free') && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.taxFreeIncome }} aria-hidden="true"></span>
              <span>Tax-free income</span>
            </div>
          )}
        </div>
      </Collapse>
    </Figure>
  );
}
