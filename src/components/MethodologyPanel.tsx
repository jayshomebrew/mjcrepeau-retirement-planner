import { ReactNode } from 'react';
import { Profile, Assumptions } from '../types';
import { useCountry } from '../contexts/CountryContext';
import {
  TAX_DATA_YEAR,
  TAX_BRACKETS_MFJ,
  TAX_BRACKETS_SINGLE,
  STANDARD_DEDUCTION_MFJ,
  STANDARD_DEDUCTION_SINGLE,
  CAPITAL_GAINS_BRACKETS_MFJ,
  CAPITAL_GAINS_BRACKETS_SINGLE,
  RMD_TABLE,
  getRMDStartAge,
} from '../utils/constants';
import { birthYearFromAge } from '../utils/withdrawalDefaults';
import {
  TAX_DATA_YEAR as CA_TAX_DATA_YEAR,
  FEDERAL_TAX_BRACKETS as CA_FEDERAL_BRACKETS,
  FEDERAL_BASIC_PERSONAL_AMOUNT as CA_BASIC_PERSONAL,
  PROVINCIAL_TAX_BRACKETS,
  PROVINCIAL_BASIC_PERSONAL_AMOUNTS,
  RRIF_MINIMUM_TABLE,
  RRIF_START_AGE,
  CPP_MAX_MONTHLY,
  OAS_MAX_MONTHLY,
  OAS_CLAWBACK_THRESHOLD,
  CAPITAL_GAINS_INCLUSION_RATE_DEFAULT,
  CANADIAN_PROVINCES,
} from '../countries/canada/constants';

interface MethodologyPanelProps {
  profile: Profile;
  assumptions: Assumptions;
}

function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(currency === 'CAD' ? 'en-CA' : 'en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatBracketRange(min: number, max: number, currency: string = 'USD'): string {
  return max === Infinity
    ? `${formatCurrency(min, currency)} and above`
    : `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
}

/* ---------------------------------------------------------------------------
   Layout pieces. The methodology is long-form reading, so it is set directly
   on the page like a paper: serif headings, sans body copy, formulas in
   Computer Modern on a recessed well, and booktabs-style tables.
--------------------------------------------------------------------------- */

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 font-serif text-xl font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Subsection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <h4 className="mb-2 font-serif text-base font-bold text-ink">{title}</h4>
      {children}
    </div>
  );
}

/** A word equation, set like display math. */
function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="num rounded-xl bg-well px-4 py-3 text-[15px] leading-snug text-ink">{children}</p>
  );
}

function Assumption({ label, value, numeric = true }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt>{label}</dt>
      <dd className={`text-right text-ink ${numeric ? 'num text-base' : ''}`}>{value}</dd>
    </div>
  );
}

const STEP_TONES = {
  pretax: 'bg-pretax/15 text-pretax',
  roth: 'bg-roth/15 text-roth',
  taxable: 'bg-taxable/15 text-taxable',
  hsa: 'bg-hsa/15 text-hsa',
  neutral: 'bg-well text-ink-2',
  bad: 'bg-bad/15 text-bad',
} as const;

function Step({
  n,
  tone,
  title,
  children,
}: {
  n: number;
  tone: keyof typeof STEP_TONES;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3.5 break-inside-avoid">
      <span
        className={`num mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold ${STEP_TONES[tone]}`}
      >
        {n}
      </span>
      <div>
        <strong className="font-semibold text-ink">{title}</strong>
        <p className="mt-0.5">{children}</p>
      </div>
    </li>
  );
}

interface Column {
  label: string;
  align?: 'left' | 'right';
}

const CELL = 'px-3 py-2 whitespace-nowrap first:pl-0 last:pr-0';
const ROW = 'border-b border-hair last:border-b-0';
/** Row label (income range, age): figures, left-aligned. */
const STUB = `${CELL} num text-left text-ink`;
/** Data figure: right-aligned so the digits line up. */
const FIGURE = `${CELL} num text-right text-ink`;

/** LaTeX booktabs: heavy top and bottom rules, a light rule under the header, no verticals. */
function BooktabsTable({ columns, children }: { columns: Column[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-y-[1.5px] border-ink/60">
        <thead>
          <tr className="border-b border-hair-strong">
            {columns.map(column => (
              <th
                key={column.label}
                scope="col"
                className={`${CELL} text-xs font-medium text-ink-2 ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TableNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[13px] text-ink-2">{children}</p>;
}

const WarningIcon = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const BULLETS = 'list-disc space-y-1.5 pl-5 marker:text-ink-3';

export function MethodologyPanel({ profile, assumptions }: MethodologyPanelProps) {
  const { country } = useCountry();
  const isCanada = country === 'CA';
  const currency = isCanada ? 'CAD' : 'USD';

  // US-specific values
  const isMarried = profile.filingStatus === 'married_filing_jointly';
  // SECURE 2.0: RMDs start at 73 for those born before 1960, 75 otherwise
  const rmdStartAge = getRMDStartAge(birthYearFromAge(profile.currentAge));
  const taxBrackets = isMarried ? TAX_BRACKETS_MFJ : TAX_BRACKETS_SINGLE;
  const standardDeduction = isMarried ? STANDARD_DEDUCTION_MFJ : STANDARD_DEDUCTION_SINGLE;
  const capitalGainsBrackets = isMarried ? CAPITAL_GAINS_BRACKETS_MFJ : CAPITAL_GAINS_BRACKETS_SINGLE;

  // Canada-specific values
  const province = profile.region || 'ON';
  const provinceName = CANADIAN_PROVINCES.find(p => p.code === province)?.name || province;
  const provincialBrackets = PROVINCIAL_TAX_BRACKETS[province] || PROVINCIAL_TAX_BRACKETS['ON'];
  const provincialBasicAmount = PROVINCIAL_BASIC_PERSONAL_AMOUNTS[province] || PROVINCIAL_BASIC_PERSONAL_AMOUNTS['ON'];
  // Low-bracket fill target: basic personal amount + top of the first federal bracket
  const caBracketFillTarget = CA_BASIC_PERSONAL + CA_FEDERAL_BRACKETS[0].max;

  const filingStatusLabel = isMarried ? 'married filing jointly' : 'single';

  return (
    <div className="max-w-[70ch] space-y-12 text-[15px] leading-relaxed text-ink-2">
      {/* Overview */}
      <section>
        <div className="mb-4">
          <h3 className="font-serif text-2xl font-bold text-ink">How this calculator works</h3>
          <p className="mt-0.5 text-[13px] text-ink-2">{isCanada ? 'Canada' : 'United States'}</p>
        </div>
        <p>This calculator projects your retirement finances in two phases:</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 marker:text-ink-2">
          <li className="pl-1">
            <strong className="font-semibold text-ink">Accumulation phase</strong> (age {profile.currentAge} to{' '}
            {profile.retirementAge}): Projects account growth using compound interest, annual contributions,
            contribution growth, and employer matching.
          </li>
          <li className="pl-1">
            <strong className="font-semibold text-ink">Withdrawal phase</strong> (age {profile.retirementAge} to{' '}
            {profile.lifeExpectancy}): Simulates tax-optimized withdrawals to meet your spending needs while
            minimizing lifetime taxes.
          </li>
        </ol>
        {isCanada && (
          <p className="mt-4 rounded-2xl border border-hair-strong px-4 py-3">
            <strong className="font-semibold text-ink">Canada mode:</strong> Uses Canadian tax brackets, RRIF
            minimums, and CPP/OAS benefits. Provincial taxes are calculated for {provinceName}.
          </p>
        )}
      </section>

      {/* Your current assumptions */}
      <Section title="Your current assumptions">
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
          <div>
            <h4 className="mb-1 font-serif text-base font-bold text-ink">Economic</h4>
            <dl className="divide-y divide-hair">
              <Assumption label="Inflation rate" value={formatPercent(assumptions.inflationRate)} />
              <Assumption label="Safe withdrawal rate" value={formatPercent(assumptions.safeWithdrawalRate)} />
              <Assumption label="Retirement return rate" value={formatPercent(assumptions.retirementReturnRate)} />
            </dl>
          </div>
          <div>
            <h4 className="mb-1 font-serif text-base font-bold text-ink">Tax & personal</h4>
            <dl className="divide-y divide-hair">
              {!isCanada && (
                <Assumption
                  label="Filing status"
                  value={isMarried ? 'Married filing jointly' : 'Single'}
                  numeric={false}
                />
              )}
              {isCanada ? (
                <>
                  <Assumption label="Province" value={provinceName} numeric={false} />
                  <Assumption label="Federal basic personal" value={formatCurrency(CA_BASIC_PERSONAL, currency)} />
                  <Assumption
                    label="Provincial basic personal"
                    value={formatCurrency(provincialBasicAmount, currency)}
                  />
                </>
              ) : (
                <>
                  <Assumption label="State tax rate" value={formatPercent(profile.stateTaxRate || 0)} />
                  <Assumption label="Standard deduction" value={formatCurrency(standardDeduction)} />
                </>
              )}
            </dl>
          </div>
        </div>
      </Section>

      {/* Accumulation phase formulas */}
      <Section title="Accumulation phase formulas">
        <div className="space-y-8">
          <Subsection title="Annual balance growth">
            <Formula>
              New balance = (previous balance × (1 + return rate)) + contribution + employer match
            </Formula>
            <p className="mt-2.5">
              Each year, your existing balance grows by the return rate, then contributions are added.
            </p>
          </Subsection>

          <Subsection title={`Employer match (${isCanada ? 'RRSP' : '401(k)'} only)`}>
            <Formula>Match = min(contribution × match %, match limit)</Formula>
            <p className="mt-2.5">Employer matching is capped at the match limit you specify.</p>
          </Subsection>

          <Subsection title="Contribution growth">
            <Formula>Next year contribution = this year contribution × (1 + growth rate)</Formula>
            <p className="mt-2.5">Contributions can increase annually to account for salary growth.</p>
          </Subsection>
        </div>
      </Section>

      {/* Withdrawal strategy */}
      <Section title="Tax-optimized withdrawal strategy">
        <p>
          The calculator uses a {isCanada ? '6' : '7'}-step withdrawal strategy designed to minimize lifetime taxes:
        </p>

        {isCanada ? (
          // Canadian withdrawal strategy
          <ol className="mt-5 space-y-4">
            <Step n={1} tone="pretax" title="RRIF minimum withdrawals">
              Starting at age {RRIF_START_AGE}, RRIF accounts must take minimum withdrawals based on CRA tables.
            </Step>
            <Step n={2} tone="pretax" title="Additional RRSP/RRIF withdrawals">
              Additional withdrawals from registered accounts (RRSP, RRIF, LIRA, LIF, FHSA) to fill the first federal
              tax bracket (up to {formatCurrency(caBracketFillTarget, currency)} total ordinary income, combining the{' '}
              {formatCurrency(CA_BASIC_PERSONAL, currency)} basic personal amount and the{' '}
              {formatCurrency(CA_FEDERAL_BRACKETS[0].max, currency)} top of the{' '}
              {formatPercent(CA_FEDERAL_BRACKETS[0].rate)} bracket).
            </Step>
            <Step n={3} tone="roth" title="TFSA accounts">
              Tax-free withdrawals for remaining spending needs.
            </Step>
            <Step n={4} tone="taxable" title="Non-registered accounts">
              Capital gains taxed at a flat {formatPercent(CAPITAL_GAINS_INCLUSION_RATE_DEFAULT)} inclusion rate.
            </Step>
            <Step n={5} tone="neutral" title="Additional registered">
              If more is needed, withdraws from registered accounts at higher tax brackets.
            </Step>
            <Step n={6} tone="bad" title="Early access (fallback)">
              If every available account is exhausted and spending needs remain, the calculator withdraws from
              accounts before their configured withdrawal start age. Canada has no early-withdrawal penalty, but this
              can trigger withholding considerations not modeled here.
            </Step>
          </ol>
        ) : (
          // US withdrawal strategy
          <ol className="mt-5 space-y-4">
            <Step n={1} tone="pretax" title="Required minimum distributions (RMDs)">
              Starting at age {rmdStartAge} (based on your birth year, per SECURE 2.0), traditional accounts must take
              RMDs based on IRS life expectancy tables.
            </Step>
            <Step n={2} tone="pretax" title="Fill 12% tax bracket">
              Additional traditional withdrawals to fill the 12% bracket (up to{' '}
              {formatCurrency(standardDeduction + (isMarried ? 100800 : 50400))} total ordinary income).
            </Step>
            <Step n={3} tone="roth" title="Roth accounts">
              Tax-free withdrawals for remaining spending needs.
            </Step>
            <Step n={4} tone="taxable" title="Taxable accounts">
              Only gains portion is taxed at capital gains rates (often 0% or 15%).
            </Step>
            <Step n={5} tone="hsa" title="HSA accounts">
              Used last; assumed tax-free for qualified medical expenses.
            </Step>
            <Step n={6} tone="neutral" title="Additional traditional">
              If more is needed, withdraws from traditional accounts at higher tax brackets.
            </Step>
            <Step n={7} tone="bad" title="Early access (fallback)">
              If every available account is exhausted and spending needs remain, the calculator withdraws from
              accounts before their configured withdrawal start age, incurring the 10% early-withdrawal penalty for
              traditional accounts before age 59½.
            </Step>
          </ol>
        )}

        <div className="mt-8">
          <Subsection title="Safe withdrawal rate">
            <Formula>
              Annual withdrawal = portfolio at retirement × {formatPercent(assumptions.safeWithdrawalRate)}
            </Formula>
            <p className="mt-2.5">Initial withdrawal amount, adjusted for inflation each year.</p>
          </Subsection>
        </div>
      </Section>

      {/* Tax calculations */}
      <Section title={`Tax calculations ${isCanada ? '(Canada)' : '(United States)'}`}>
        <div className="space-y-8">
          <Subsection title="Federal income tax">
            {isCanada ? (
              <>
                <Formula>
                  Taxable income = RRSP/RRIF withdrawals + CPP + OAS + taxable capital gains − basic personal amount
                </Formula>
                <p className="mt-2.5">
                  CPP and OAS are 100% taxable. Progressive federal brackets applied. Basic personal amount is{' '}
                  {formatCurrency(CA_BASIC_PERSONAL, currency)}.
                </p>
              </>
            ) : (
              <>
                <Formula>
                  Taxable income = traditional withdrawals + taxable Social Security − standard deduction
                </Formula>
                <p className="mt-2.5">
                  Progressive brackets applied to taxable income (see table below). The taxable share of Social
                  Security (0% to 85%) follows the IRS provisional-income phase-in; its thresholds are frozen by law
                  (not inflation-indexed), so most retirees reach the 85% maximum over long horizons.
                </p>
              </>
            )}
          </Subsection>

          <Subsection title="Capital gains tax">
            {isCanada ? (
              <>
                <Formula>Taxable gains = gains × {formatPercent(CAPITAL_GAINS_INCLUSION_RATE_DEFAULT)}</Formula>
                <p className="mt-2.5">
                  Only {formatPercent(CAPITAL_GAINS_INCLUSION_RATE_DEFAULT)} of capital gains are included in taxable
                  income. This taxable portion is added to ordinary income (RRSP/RRIF withdrawals, CPP, OAS, etc.) and
                  taxed at your marginal rate under the same progressive brackets.
                </p>
              </>
            ) : (
              <>
                <Formula>Taxable gains = withdrawal × (1 − cost basis / balance)</Formula>
                <p className="mt-2.5">Long-term capital gains rates applied; brackets determined by total income.</p>
              </>
            )}
          </Subsection>

          <Subsection title={isCanada ? 'Provincial tax' : 'State tax (simplified)'}>
            {isCanada ? (
              <>
                <Formula>Provincial tax = (taxable income − provincial basic amount) × provincial rate</Formula>
                <p className="mt-2.5">
                  {provinceName} has a basic personal amount of {formatCurrency(provincialBasicAmount, currency)}.
                  Provincial brackets vary by province.
                </p>
              </>
            ) : (
              <>
                <Formula>
                  State tax = (ordinary income + capital gains − standard deduction) ×{' '}
                  {formatPercent(profile.stateTaxRate || 0)}
                </Formula>
                <p className="mt-2.5">Flat rate applied to taxable income. Actual state taxes vary by state.</p>
              </>
            )}
          </Subsection>
        </div>
      </Section>

      {/* Federal tax brackets */}
      <Section
        title={
          isCanada
            ? `${CA_TAX_DATA_YEAR} Canadian federal tax brackets`
            : `${TAX_DATA_YEAR} federal tax brackets (${filingStatusLabel})`
        }
      >
        <BooktabsTable columns={[{ label: 'Taxable income' }, { label: 'Tax rate', align: 'right' }]}>
          {(isCanada ? CA_FEDERAL_BRACKETS : taxBrackets).map((bracket, index) => (
            <tr key={index} className={ROW}>
              <td className={STUB}>{formatBracketRange(bracket.min, bracket.max, currency)}</td>
              <td className={FIGURE}>{formatPercent(bracket.rate)}</td>
            </tr>
          ))}
        </BooktabsTable>
        <TableNote>
          {isCanada
            ? `Basic personal amount of ${formatCurrency(CA_BASIC_PERSONAL, currency)} is a non-refundable tax credit.`
            : `Standard deduction of ${formatCurrency(standardDeduction)} is subtracted before applying brackets.`}
        </TableNote>
      </Section>

      {/* Provincial tax brackets (Canada only) */}
      {isCanada && (
        <Section title={`${CA_TAX_DATA_YEAR} provincial tax brackets (${provinceName})`}>
          <BooktabsTable columns={[{ label: 'Taxable income' }, { label: 'Tax rate', align: 'right' }]}>
            {provincialBrackets.map((bracket, index) => (
              <tr key={index} className={ROW}>
                <td className={STUB}>{formatBracketRange(bracket.min, bracket.max, currency)}</td>
                <td className={FIGURE}>{formatPercent(bracket.rate)}</td>
              </tr>
            ))}
          </BooktabsTable>
          <TableNote>Provincial basic personal amount: {formatCurrency(provincialBasicAmount, currency)}</TableNote>
        </Section>
      )}

      {/* Capital gains brackets (US only) */}
      {!isCanada && (
        <Section title={`${TAX_DATA_YEAR} long-term capital gains rates (${filingStatusLabel})`}>
          <BooktabsTable columns={[{ label: 'Total income' }, { label: 'Capital gains rate', align: 'right' }]}>
            {capitalGainsBrackets.map((bracket, index) => (
              <tr key={index} className={ROW}>
                <td className={STUB}>{formatBracketRange(bracket.min, bracket.max)}</td>
                <td className={FIGURE}>{formatPercent(bracket.rate)}</td>
              </tr>
            ))}
          </BooktabsTable>
        </Section>
      )}

      {/* RMD/RRIF table */}
      <Section title={isCanada ? 'RRIF minimum withdrawal table' : 'Required minimum distribution (RMD) table'}>
        <Subsection title={isCanada ? 'RRIF minimum formula' : 'RMD formula'}>
          {isCanada ? (
            <>
              <Formula>Minimum withdrawal = RRIF balance × minimum percentage</Formula>
              <p className="mt-2.5">
                RRIF minimums begin at age {RRIF_START_AGE}. You must convert your RRSP to a RRIF by the end of the
                year you turn 71.
              </p>
            </>
          ) : (
            <>
              <Formula>RMD = traditional account balance / life expectancy divisor</Formula>
              <p className="mt-2.5">
                RMDs begin at age {rmdStartAge} per the SECURE 2.0 Act (73 if born before 1960, 75 otherwise). The
                divisor decreases with age, requiring larger withdrawals.
              </p>
            </>
          )}
        </Subsection>

        <div className="mt-6">
          <BooktabsTable
            columns={[
              { label: 'Age' },
              { label: isCanada ? 'Minimum %' : 'Divisor', align: 'right' },
              { label: '% of balance', align: 'right' },
            ]}
          >
            {isCanada
              ? RRIF_MINIMUM_TABLE.filter((_, i) => i % 4 === 0 || i === RRIF_MINIMUM_TABLE.length - 1).map(entry => (
                  <tr key={entry.age} className={ROW}>
                    <td className={STUB}>{entry.age}</td>
                    <td className={FIGURE}>{(entry.minimumPercentage * 100).toFixed(2)}%</td>
                    <td className={FIGURE}>{(entry.minimumPercentage * 100).toFixed(2)}%</td>
                  </tr>
                ))
              : RMD_TABLE.filter((_, i) => i % 5 === 0 || i === RMD_TABLE.length - 1).map(entry => (
                  <tr key={entry.age} className={ROW}>
                    <td className={STUB}>{entry.age}</td>
                    <td className={FIGURE}>{entry.divisor.toFixed(1)}</td>
                    <td className={FIGURE}>{((1 / entry.divisor) * 100).toFixed(2)}%</td>
                  </tr>
                ))}
          </BooktabsTable>
          <TableNote>
            {isCanada
              ? 'Based on CRA RRIF minimum withdrawal rates. Showing every 4th year; full table used in calculations.'
              : 'Based on IRS Uniform Lifetime Table. Showing every 5th year; full table used in calculations.'}
          </TableNote>
        </div>
      </Section>

      {/* Government benefits */}
      <Section title={isCanada ? 'Government benefits (CPP & OAS)' : 'Retirement income streams'}>
        {isCanada ? (
          <div className="space-y-8">
            <Subsection title="Canada Pension Plan (CPP)">
              <ul className={BULLETS}>
                <li>Maximum monthly benefit at 65: {formatCurrency(CPP_MAX_MONTHLY, currency)}/month</li>
                <li>Can start as early as age 60 (reduced) or as late as 70 (increased)</li>
                <li>Early reduction: 0.6% per month before age 65</li>
                <li>Late increase: 0.7% per month after age 65</li>
                <li>CPP income is 100% taxable</li>
              </ul>
            </Subsection>
            <Subsection title="Old Age Security (OAS)">
              <ul className={BULLETS}>
                <li>Maximum monthly benefit at 65: {formatCurrency(OAS_MAX_MONTHLY, currency)}/month</li>
                <li>Available from age 65 to 70</li>
                <li>Deferral increases benefit by 0.6% per month</li>
                <li>
                  Clawback begins at {formatCurrency(OAS_CLAWBACK_THRESHOLD, currency)} net income (in today's
                  dollars; the threshold is indexed to inflation)
                </li>
                <li>Clawback rate: 15% of income above threshold</li>
                <li>
                  Clawback is based on the prior year's simulated taxable income (the first retirement year uses an
                  estimate based on target spending)
                </li>
              </ul>
            </Subsection>
          </div>
        ) : (
          <Subsection title="Income streams">
            <ul className={BULLETS}>
              <li>
                Configure Social Security, pensions, and other retirement income in the Income streams panel
              </li>
              <li>Each stream has a name, monthly benefit, start age, and tax treatment</li>
              <li>Benefits are inflation-adjusted annually</li>
              <li>
                Social Security streams: 0–85% taxable via the IRS provisional-income phase-in (thresholds frozen by
                law)
              </li>
              <li>Pension streams: 100% taxable as ordinary income</li>
              <li>Tax-free streams (e.g., VA disability): excluded from taxable income</li>
            </ul>
          </Subsection>
        )}
      </Section>

      {/* Important notes */}
      <section className="rounded-2xl border border-warn/40 bg-warn/10 px-5 py-4">
        <h3 className="mb-3 flex items-center gap-2.5 font-serif text-xl font-bold text-warn">
          <WarningIcon />
          Important notes & limitations
        </h3>
        <ul className={`${BULLETS} text-ink`}>
          <li>
            Tax brackets, deductions, and personal amounts are {isCanada ? CA_TAX_DATA_YEAR : TAX_DATA_YEAR} values,
            assumed to grow with your inflation assumption in future years (both countries index them to inflation by
            law).
          </li>
          {isCanada ? (
            <>
              <li>CPP and OAS benefits are fully (100%) taxable.</li>
              <li>
                OAS clawback is based on the prior year's simulated taxable income (the first retirement year is
                estimated from target spending). The clawback threshold is assumed to grow with inflation, matching how
                it is indexed in law.
              </li>
              <li>
                Quebec has a separate tax system; calculations use simplified Quebec brackets and apply the 16.5%
                federal abatement for Quebec residents.
              </li>
              <li>
                The Ontario surtax (20%/36% on basic provincial tax) is modeled; the Ontario Health Premium (up to
                $900/year) is not.
              </li>
              <li>
                LIRA/LIF accounts follow RRIF minimum withdrawals from age 71; LIF withdrawal maximums are not modeled.
              </li>
              <li>TFSA withdrawals are completely tax-free.</li>
              <li>
                FHSA balances are modeled as transferring to an RRSP if unused, and are treated as fully taxable on
                withdrawal like other registered accounts.
              </li>
            </>
          ) : (
            <>
              <li>
                Social Security taxability uses the provisional-income phase-in (0% to 85%). The withdrawal strategy's
                bracket-fill step estimates with the 85% maximum before the year's exact income is known.
              </li>
              <li>State tax uses a simplified flat rate; actual state taxes vary significantly.</li>
              <li>HSA withdrawals are treated as tax-free, assuming qualified medical expenses.</li>
            </>
          )}
          <li>
            Taxable account cost basis starts from the account's Cost basis input (defaulting to the full current
            balance) and grows with each contribution; investment growth is treated as unrealized gains until
            withdrawn.
          </li>
          <li>
            Annual taxes on dividends and interest inside taxable accounts (tax drag) are not modeled; gains are only
            taxed when withdrawn.
          </li>
          <li>Investment returns are applied uniformly; actual returns vary year to year.</li>
          <li>
            The spending target is treated as a pre-tax withdrawal goal. Taxes are paid out of the amount withdrawn, so
            after-tax income can land below the target; withdrawals are not grossed up to cover taxes.
          </li>
          <li>
            Required minimum withdrawals (RMDs/RRIF minimums) that exceed the year's spending need are counted as
            income and spent rather than reinvested in a taxable account.
          </li>
          <li>
            This calculator is for educational purposes and should not replace professional financial advice.
          </li>
        </ul>
      </section>
    </div>
  );
}
