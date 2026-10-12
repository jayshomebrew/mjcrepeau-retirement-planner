import { ReactNode, useId, useState } from 'react';
import {
  Account,
  AccumulationResult,
  RetirementResult,
  Profile,
  Assumptions,
  IncomeStream,
} from '../types';
import { STANDARD_DEDUCTION_MFJ, STANDARD_DEDUCTION_SINGLE } from '../utils/constants';
import { useCountry } from '../contexts/CountryContext';
import { presentValue } from '../utils/export/realDollars';
import { formatCompactCurrency, formatCurrency as formatCurrencyWithCode } from '../utils/format';
import { birthYearFromAge } from '../utils/withdrawalDefaults';
import { RetirementTimeline, type TimelineEvent } from './RetirementTimeline';

interface SummaryCardsProps {
  accounts: Account[];
  profile: Profile;
  assumptions: Assumptions;
  incomeStreams: IncomeStream[];
  accumulationResult: AccumulationResult;
  retirementResult: RetirementResult;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`chevron w-3.5 h-3.5 shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

function Callout({ tone, title, children }: { tone: 'warn' | 'bad'; title: string; children: ReactNode }) {
  const toneClasses =
    tone === 'warn' ? 'border-warn/40 bg-warn/10 text-warn' : 'border-bad/40 bg-bad/10 text-bad';
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <WarningIcon />
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-sm text-ink mt-0.5">{children}</p>
      </div>
    </div>
  );
}

/** Formula line and supporting notes for a figure's "how it's calculated" panel. */
function Derivation({ formula, children }: { formula?: ReactNode; children?: ReactNode }) {
  return (
    <div className="space-y-2.5">
      {formula && <p className="num text-[15px] text-ink leading-snug">{formula}</p>}
      {children && <div className="text-[13px] text-ink-2 leading-relaxed space-y-1.5">{children}</div>}
    </div>
  );
}

interface Tile {
  id: string;
  label: string;
  /** Exact value: shown on hover and to screen readers. */
  fullValue: string;
  /** Compact value shown in the tile. */
  value: string;
  valueClassName?: string;
  note?: string;
  noteClassName?: string;
  formula?: ReactNode;
  details?: ReactNode;
}

export function SummaryCards({
  accounts,
  profile,
  assumptions,
  incomeStreams,
  accumulationResult,
  retirementResult,
}: SummaryCardsProps) {
  const { country, config: countryConfig } = useCountry();
  const isCanada = country === 'CA';
  const currency = isCanada ? 'CAD' : 'USD';
  const formatCurrency = (value: number) => formatCurrencyWithCode(value, currency);
  const [openTile, setOpenTile] = useState<string | null>(null);
  const [heroOpen, setHeroOpen] = useState(false);
  const heroDetailsId = useId();
  const tileDetailsId = useId();

  const { totalAtRetirement, breakdownByGroup } = accumulationResult;
  const accountGroupings = countryConfig.getAccountGroupings();
  const {
    sustainableMonthlyWithdrawal,
    sustainableAnnualWithdrawal,
    portfolioDepletionAge,
    lifetimeTaxesPaid,
    yearlyWithdrawals,
  } = retirementResult;

  // Validate age configuration
  const hasInvalidAges = profile.lifeExpectancy <= profile.retirementAge ||
    profile.retirementAge <= profile.currentAge;

  const depletesEarly =
    portfolioDepletionAge !== null &&
    portfolioDepletionAge !== undefined &&
    portfolioDepletionAge < profile.lifeExpectancy;

  const standardDeduction = profile.filingStatus === 'married_filing_jointly'
    ? STANDARD_DEDUCTION_MFJ
    : STANDARD_DEDUCTION_SINGLE;

  const yearsToRetirement = Math.max(0, profile.retirementAge - profile.currentAge);
  const retirementYears = Math.max(0, profile.lifeExpectancy - profile.retirementAge);

  // Deflate nominal future-dollar values to today's purchasing power.
  // The model runs in nominal dollars (returns compound at the nominal rate,
  // target spending inflates each year); the "today" figures make the
  // magnitudes meaningful to the user now.
  const inflationRate = assumptions.inflationRate;
  const totalAtRetirementReal = presentValue(totalAtRetirement, yearsToRetirement, inflationRate);
  const sustainableMonthlyWithdrawalReal = presentValue(sustainableMonthlyWithdrawal, yearsToRetirement, inflationRate);
  const sustainableAnnualWithdrawalReal = presentValue(sustainableAnnualWithdrawal, yearsToRetirement, inflationRate);
  // Lifetime taxes: deflate each year's nominal tax to today's dollars, then sum.
  // Using a single deflator on the nominal total would understate (older years
  // weigh less than younger ones); per-year is the correct present-value sum.
  const lifetimeTaxesReal = yearlyWithdrawals.reduce(
    (sum, y) => sum + presentValue(y.totalTax, y.age - profile.currentAge, inflationRate),
    0
  );
  const lifetimeFederalTaxReal = yearlyWithdrawals.reduce(
    (sum, y) => sum + presentValue(y.federalTax, y.age - profile.currentAge, inflationRate),
    0
  );
  const lifetimeStateTaxReal = yearlyWithdrawals.reduce(
    (sum, y) => sum + presentValue(y.stateTax, y.age - profile.currentAge, inflationRate),
    0
  );

  // Nominal federal and state totals (used to surface the breakdown that sums
  // back to the headline lifetimeTaxesPaid when combined with penalties).
  const lifetimeFederalTax = yearlyWithdrawals.reduce((sum, y) => sum + y.federalTax, 0);
  const lifetimeStateTax = yearlyWithdrawals.reduce((sum, y) => sum + y.stateTax, 0);

  // Lifetime effective tax rate, dollar-weighted (total tax / total income).
  // Matches the taxes export footer; an unweighted average of yearly rates
  // would let low-income years dilute the figure.
  const lifetimeGrossIncome = yearlyWithdrawals.reduce((sum, y) => sum + y.grossIncome, 0);
  const avgEffectiveTaxRate = lifetimeGrossIncome > 0
    ? lifetimeTaxesPaid / lifetimeGrossIncome
    : 0;

  // Lifetime early-withdrawal penalties, nominal and real.
  const lifetimePenalties = yearlyWithdrawals.reduce(
    (sum, year) => sum + year.totalPenalties,
    0
  );
  const lifetimePenaltiesReal = yearlyWithdrawals.reduce(
    (sum, y) => sum + presentValue(y.totalPenalties, y.age - profile.currentAge, inflationRate),
    0
  );

  const avgAnnualPenalty = yearlyWithdrawals.length > 0
    ? lifetimePenalties / yearlyWithdrawals.length
    : 0;

  // "≈ $X today" note. Omitted when nominal and real round to the same value
  // (already retired, zero inflation), so tiles don't repeat themselves.
  const todayNote = (nominal: number, real: number) =>
    Math.round(nominal) === Math.round(real) ? undefined : `≈ ${formatCompactCurrency(real)} today`;

  const groups = accountGroupings
    .filter(g => (breakdownByGroup[g.id] || 0) > 0)
    .map(g => {
      const amount = breakdownByGroup[g.id] || 0;
      return {
        ...g,
        amount,
        amountReal: presentValue(amount, yearsToRetirement, inflationRate),
        share: totalAtRetirement > 0 ? amount / totalAtRetirement : 0,
      };
    });

  const finalBalance = yearlyWithdrawals[yearlyWithdrawals.length - 1]?.totalRemainingBalance || 0;

  const tiles: Tile[] = [
    {
      id: 'monthly',
      label: 'Monthly withdrawal',
      fullValue: formatCurrency(sustainableMonthlyWithdrawal),
      value: formatCompactCurrency(sustainableMonthlyWithdrawal),
      note: todayNote(sustainableMonthlyWithdrawal, sustainableMonthlyWithdrawalReal),
      formula: `${formatCurrency(totalAtRetirement)} × ${formatPercent(assumptions.safeWithdrawalRate)} ÷ 12 = ${formatCurrency(sustainableMonthlyWithdrawal)}`,
      details: (
        <>
          <p>
            Based on the {formatPercent(assumptions.safeWithdrawalRate)} safe withdrawal rate applied to your{' '}
            {formatCurrency(totalAtRetirement)} portfolio at retirement.
          </p>
          <p>
            Actual withdrawals are adjusted for {formatPercent(assumptions.inflationRate)} annual inflation. In
            today's dollars that's {formatCurrency(sustainableMonthlyWithdrawalReal)} a month, roughly constant year
            over year.
          </p>
        </>
      ),
    },
    {
      id: 'annual',
      label: 'Annual withdrawal',
      fullValue: formatCurrency(sustainableAnnualWithdrawal),
      value: formatCompactCurrency(sustainableAnnualWithdrawal),
      note: todayNote(sustainableAnnualWithdrawal, sustainableAnnualWithdrawalReal),
      formula: `${formatCurrency(totalAtRetirement)} × ${formatPercent(assumptions.safeWithdrawalRate)} = ${formatCurrency(sustainableAnnualWithdrawal)}`,
      details: (
        <p>
          This is your first-year withdrawal. Each year it increases by the inflation rate (
          {formatPercent(assumptions.inflationRate)}), so its buying power stays roughly constant: about{' '}
          {formatCurrency(sustainableAnnualWithdrawalReal)} in today's dollars.
        </p>
      ),
    },
    {
      id: 'longevity',
      label: 'Portfolio lasts',
      fullValue: portfolioDepletionAge ? `Until age ${portfolioDepletionAge}` : `Past age ${profile.lifeExpectancy}`,
      value: portfolioDepletionAge ? `Age ${portfolioDepletionAge}` : `Past ${profile.lifeExpectancy}`,
      valueClassName: depletesEarly ? 'text-bad' : undefined,
      note: depletesEarly
        ? `Runs out ${profile.lifeExpectancy - portfolioDepletionAge!} years early`
        : 'Never runs out',
      noteClassName: depletesEarly ? 'text-bad' : undefined,
      formula: 'Simulated year by year until the balance reaches $0',
      details: (
        <>
          <p>
            Simulation runs from age {profile.retirementAge} to {profile.lifeExpectancy} ({retirementYears} years),
            assuming a {formatPercent(assumptions.retirementReturnRate)} annual return during retirement.
          </p>
          {depletesEarly ? (
            <p className="text-bad">
              The portfolio runs out {profile.lifeExpectancy - portfolioDepletionAge!} years before your planned life
              expectancy.
            </p>
          ) : (
            <p className="text-good">
              Final balance at age {profile.lifeExpectancy}: {formatCurrency(finalBalance)}
            </p>
          )}
        </>
      ),
    },
    {
      id: 'taxes',
      label: 'Lifetime taxes',
      fullValue: formatCurrency(lifetimeTaxesPaid),
      value: formatCompactCurrency(lifetimeTaxesPaid),
      valueClassName: 'text-tax',
      note: todayNote(lifetimeTaxesPaid, lifetimeTaxesReal) ?? 'Paid in retirement',
      formula: isCanada
        ? 'Federal + provincial taxes + early withdrawal penalties, summed over every retirement year'
        : 'Federal + state taxes + early withdrawal penalties, summed over every retirement year',
      details: (
        <>
          <p>Over {retirementYears} years of retirement:</p>
          <ul className="space-y-0.5 pl-3">
            <li>Federal taxes: {formatCurrency(lifetimeFederalTax)}</li>
            <li>{isCanada ? 'Provincial' : 'State'} taxes: {formatCurrency(lifetimeStateTax)}</li>
            {lifetimePenalties > 0 && <li>Early withdrawal penalties: {formatCurrency(lifetimePenalties)}</li>}
          </ul>
          <p>Lifetime effective tax rate: {formatPercent(avgEffectiveTaxRate)}</p>
          {todayNote(lifetimeTaxesPaid, lifetimeTaxesReal) && (
            <p>
              In today's dollars (deflated year by year): federal {formatCurrency(lifetimeFederalTaxReal)},{' '}
              {isCanada ? 'provincial' : 'state'} {formatCurrency(lifetimeStateTaxReal)}
              {lifetimePenalties > 0 && <>, penalties {formatCurrency(lifetimePenaltiesReal)}</>}.
            </p>
          )}
          {!isCanada && (
            <p>
              Standard deduction: {formatCurrency(standardDeduction)} (
              {profile.filingStatus === 'married_filing_jointly' ? 'married filing jointly' : 'single'})
            </p>
          )}
        </>
      ),
    },
    ...(lifetimePenalties > 0
      ? [{
          id: 'penalties',
          label: 'Early withdrawal penalties',
          fullValue: formatCurrency(lifetimePenalties),
          value: formatCompactCurrency(lifetimePenalties),
          valueClassName: 'text-bad',
          note: `Avg ${formatCompactCurrency(avgAnnualPenalty)} a year`,
          formula: 'Sum of all early withdrawal penalties across retirement years',
          details: (
            <>
              <p>Penalties on withdrawals from traditional accounts before age 59½.</p>
              <ul className="space-y-0.5 pl-3">
                <li>Total penalties: {formatCurrency(lifetimePenalties)}</li>
                <li>Average per year: {formatCurrency(avgAnnualPenalty)}</li>
                <li>Years with penalties: {yearlyWithdrawals.filter(y => y.totalPenalties > 0).length}</li>
              </ul>
              <p>Delaying retirement or drawing from penalty-free accounts first would reduce these costs.</p>
            </>
          ),
        } satisfies Tile]
      : []),
  ];

  const activeTile = tiles.find(t => t.id === openTile);

  // Timeline milestones: income that starts during the plan, plus the age
  // required minimum withdrawals begin if any traditional account exists.
  const events: TimelineEvent[] = incomeStreams.map(s => ({ age: s.startAge, label: s.name }));
  if (isCanada && (profile.socialSecurityBenefit ?? 0) > 0) {
    events.push({ age: profile.socialSecurityStartAge ?? 65, label: 'CPP' });
  }
  if (isCanada && (profile.secondaryBenefitAmount ?? 0) > 0) {
    events.push({ age: profile.secondaryBenefitStartAge ?? 65, label: 'OAS' });
  }
  if (accounts.some(a => countryConfig.isTraditionalAccount(a.type))) {
    events.push({
      age: countryConfig.getRMDStartAge(birthYearFromAge(profile.currentAge)),
      label: isCanada ? 'RRIF minimums begin' : 'RMDs begin',
    });
  }

  return (
    <div className="space-y-6">
      {hasInvalidAges && (
        <Callout tone="warn" title="Check your ages">
          Current age ({profile.currentAge}) should be less than retirement age ({profile.retirementAge}), which
          should be less than life expectancy ({profile.lifeExpectancy}).
        </Callout>
      )}

      {/* At retirement: the headline figure, in full */}
      <section className="glass rounded-[28px] px-5 py-5 sm:px-7 sm:py-6" aria-label="At retirement">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink-2">Portfolio at retirement, age {profile.retirementAge}</p>
            <p className="num text-[2.5rem] sm:text-[3.375rem] leading-none tracking-[-0.015em] text-ink mt-2">
              {formatCurrency(totalAtRetirement)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {Math.round(totalAtRetirement) !== Math.round(totalAtRetirementReal) && (
              <p className="text-[13px] text-ink-2">
                <span className="num text-[15px] text-ink">{formatCurrency(totalAtRetirementReal)}</span> in today's dollars
              </p>
            )}
            <button
              type="button"
              onClick={() => setHeroOpen(open => !open)}
              aria-expanded={heroOpen}
              aria-controls={heroDetailsId}
              aria-label={heroOpen ? 'Hide calculation details' : 'Show calculation details'}
              className="icon-btn -mr-2"
            >
              <Chevron open={heroOpen} />
            </button>
          </div>
        </div>

        {groups.length > 0 && (
          <>
            <div className="flex gap-[3px] h-2.5 mt-6 mb-4" aria-hidden="true">
              {groups.map(g => (
                <span key={g.id} className="rounded-full min-w-[6px]" style={{ flexGrow: g.amount, backgroundColor: g.color }} />
              ))}
            </div>
            <dl className="grid grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-x-6 gap-y-4">
              {groups.map(g => (
                <div key={g.id} className="min-w-0">
                  <dt className="flex items-center gap-2 text-[13px] text-ink-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} aria-hidden="true" />
                    {g.label}
                  </dt>
                  <dd className="mt-1 flex items-baseline gap-2 flex-wrap">
                    <span className="num text-[1.375rem] leading-tight text-ink">{formatCurrency(g.amount)}</span>
                    <span className="text-xs text-ink-2">{Math.round(g.share * 100)}%</span>
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {heroOpen && (
          <div id={heroDetailsId} className="mt-5 pt-4 border-t border-hair">
            <Derivation formula={`Sum of all account balances after ${yearsToRetirement} years of growth`}>
              <ul className="space-y-0.5">
                {groups.map(g => (
                  <li key={g.id}>
                    {g.label}: {formatCurrency(g.amount)} ({formatCurrency(g.amountReal)} today). {g.description}.
                  </li>
                ))}
              </ul>
              <p>
                In today's dollars: {formatCurrency(totalAtRetirementReal)}, deflated at {formatPercent(inflationRate)}{' '}
                inflation over {yearsToRetirement} years.
              </p>
            </Derivation>
          </div>
        )}
      </section>

      {/* During retirement: compact tiles, one shared details panel */}
      <section aria-label="During retirement">
        <div className="summary-tiles grid grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
          {tiles.map(tile => {
            const isOpen = tile.id === openTile;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => setOpenTile(isOpen ? null : tile.id)}
                aria-expanded={isOpen}
                aria-controls={tileDetailsId}
                className={`glass rounded-[20px] px-4 pt-3.5 pb-3.5 text-left transition-[background] ${isOpen ? 'bg-[var(--lens)]' : ''}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink-2 leading-snug">{tile.label}</span>
                  <Chevron open={isOpen} />
                </span>
                <span
                  className={`block num text-[1.75rem] leading-tight mt-2 ${tile.valueClassName ?? 'text-ink'}`}
                  title={tile.fullValue}
                >
                  {tile.value}
                  <span className="sr-only"> ({tile.fullValue})</span>
                </span>
                {tile.note && (
                  <span className={`block text-xs mt-1 ${tile.noteClassName ?? 'text-ink-2'}`}>{tile.note}</span>
                )}
              </button>
            );
          })}
        </div>

        {activeTile && (
          <div id={tileDetailsId} className="glass rounded-[20px] px-5 py-4 mt-3">
            <div className="flex items-baseline justify-between gap-4 mb-2.5">
              <h4 className="font-serif text-base font-bold text-ink">{activeTile.label}</h4>
              <span className="num text-base text-ink">{activeTile.fullValue}</span>
            </div>
            <Derivation formula={activeTile.formula}>{activeTile.details}</Derivation>
          </div>
        )}
      </section>

      <RetirementTimeline
        currentAge={profile.currentAge}
        retirementAge={profile.retirementAge}
        lifeExpectancy={profile.lifeExpectancy}
        depletionAge={depletesEarly ? portfolioDepletionAge! : undefined}
        events={events}
      />

      {depletesEarly && (
        <Callout tone="bad" title="Your portfolio runs out early">
          It's projected to run out at age {portfolioDepletionAge}, {profile.lifeExpectancy - portfolioDepletionAge!}{' '}
          years before your planned life expectancy. Saving more, lowering the withdrawal rate, or retiring later would
          extend it.
        </Callout>
      )}
    </div>
  );
}
