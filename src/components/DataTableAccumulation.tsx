import { useState } from 'react';
import { Account, AccumulationResult, Assumptions, Profile, getTaxTreatment } from '../types';
import { useCountry } from '../contexts/CountryContext';
import { getEmployerMatch, supportsEmployerMatch } from '../utils/projections';
import { buildAccumulationTable, buildExportMeta } from '../utils/export';
import { CsvDownloadButton } from './CsvDownloadButton';
import { Figure } from './Figure';
import { SegmentedControl } from './SegmentedControl';

interface DataTableAccumulationProps {
  accounts: Account[];
  result: AccumulationResult;
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

type ViewMode = 'summary' | 'balances' | 'contributions';

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'balances', label: 'Balances by account' },
  { id: 'contributions', label: 'Contributions' },
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

export function DataTableAccumulation({
  accounts,
  result,
  profile,
  assumptions,
}: DataTableAccumulationProps) {
  const { country } = useCountry();
  const currency = country === 'CA' ? 'CAD' : 'USD';
  const formatCurrency = (value: number) => formatCurrencyWithCode(value, currency);

  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  if (!result.yearlyBalances.length) return null;

  const buildCsvTable = () =>
    buildAccumulationTable(
      viewMode,
      accounts,
      result,
      buildExportMeta(profile, assumptions, country)
    );

  // Get color class based on tax treatment
  const getColorClass = (accountType: Account['type']): string => {
    const treatment = getTaxTreatment(accountType);
    switch (treatment) {
      case 'pretax': return 'text-pretax';
      case 'roth': return 'text-roth';
      case 'taxable': return 'text-taxable';
      case 'hsa': return 'text-hsa';
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
      {isExpanded && (
        <>
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
            role="tabpanel"
            aria-label={VIEW_OPTIONS.find(o => o.id === viewMode)?.label}
            className="overflow-x-auto"
          >
            {viewMode === 'summary' && (
              <table className={TABLE}>
                <thead>
                  <tr>
                    <th className={TH_AGE}>Age</th>
                    <th className={`${TH} text-left text-ink-2`}>Year</th>
                    <th className={`${TH} text-right text-ink-2`}>Total balance</th>
                    <th className={`${TH} text-right text-ink-2`}>Year growth</th>
                    <th className={`${TH} text-right text-ink-2`}>Total contributions</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {result.yearlyBalances.map((yearData, index) => {
                    const prevBalance = index > 0 ? result.yearlyBalances[index - 1].totalBalance : yearData.totalBalance;
                    const totalContrib = Object.values(yearData.contributions).reduce((sum, c) => sum + c, 0);
                    const totalMatch = accounts.reduce((sum, acc) => {
                      return sum + getEmployerMatch(acc, yearData.contributions[acc.id] || 0);
                    }, 0);
                    const growth = yearData.totalBalance - prevBalance;

                    return (
                      <tr key={yearData.age} className={ROW}>
                        <td className={TD_AGE}>{yearData.age}</td>
                        <td className={`${TD} text-left text-ink-2`}>{yearData.year}</td>
                        <td className={`${TD} text-right text-ink`}>{formatCurrency(yearData.totalBalance)}</td>
                        <td className={`${TD} text-right ${growth >= 0 ? 'text-good' : 'text-bad'}`}>
                          {index === 0 ? '-' : (growth >= 0 ? '+' : '') + formatCurrency(growth)}
                        </td>
                        <td className={`${TD} text-right text-ink-2`}>
                          {formatCurrency(totalContrib + totalMatch)}
                        </td>
                      </tr>
                    );
                  })}
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
                  {result.yearlyBalances.map((yearData) => (
                    <tr key={yearData.age} className={ROW}>
                      <td className={TD_AGE}>{yearData.age}</td>
                      {accounts.map(acc => (
                        <td key={acc.id} className={`${TD} text-right text-ink-2`}>
                          {formatCurrency(yearData.balances[acc.id] || 0)}
                        </td>
                      ))}
                      <td className={`${TD} text-right text-ink`}>
                        {formatCurrency(yearData.totalBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {viewMode === 'contributions' && (
              <table className={TABLE}>
                <thead>
                  <tr>
                    <th className={TH_AGE}>Age</th>
                    {accounts.map(acc => (
                      <th key={acc.id} className={`${TH} text-right ${getColorClass(acc.type)}`}>
                        {acc.name}
                        {supportsEmployerMatch(acc) ? ' (+match)' : ''}
                      </th>
                    ))}
                    <th className={`${TH} text-right text-ink-2`}>Total</th>
                  </tr>
                </thead>
                <tbody className={TBODY}>
                  {result.yearlyBalances.map((yearData) => {
                    let totalContrib = 0;
                    return (
                      <tr key={yearData.age} className={ROW}>
                        <td className={TD_AGE}>{yearData.age}</td>
                        {accounts.map(acc => {
                          const contrib = yearData.contributions[acc.id] || 0;
                          const match = getEmployerMatch(acc, contrib);
                          totalContrib += contrib + match;
                          return (
                            <td key={acc.id} className={`${TD} text-right text-ink-2`}>
                              {formatCurrency(contrib)}
                              {match > 0 && (
                                <span className="text-good text-xs ml-1">
                                  +{formatCurrency(match)}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className={`${TD} text-right text-ink`}>
                          {formatCurrency(totalContrib)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={TF_LABEL}>Lifetime total</td>
                    {accounts.map(acc => {
                      const lifetimeContrib = result.yearlyBalances.reduce((sum, year) => {
                        const contrib = year.contributions[acc.id] || 0;
                        const match = getEmployerMatch(acc, contrib);
                        return sum + contrib + match;
                      }, 0);
                      return (
                        <td key={acc.id} className={`${TF} text-right text-ink`}>
                          {formatCurrency(lifetimeContrib)}
                        </td>
                      );
                    })}
                    <td className={`${TF} text-right text-ink`}>
                      {formatCurrency(
                        result.yearlyBalances.reduce((sum, year) => {
                          return sum + accounts.reduce((accSum, acc) => {
                            const contrib = year.contributions[acc.id] || 0;
                            const match = getEmployerMatch(acc, contrib);
                            return accSum + contrib + match;
                          }, 0);
                        }, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-serif text-[13px] text-ink-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-pretax" aria-hidden="true"></span>
              <span>Pre-tax</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-roth" aria-hidden="true"></span>
              <span>Roth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-taxable" aria-hidden="true"></span>
              <span>Taxable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-hsa" aria-hidden="true"></span>
              <span>HSA</span>
            </div>
          </div>
        </>
      )}
    </Figure>
  );
}
