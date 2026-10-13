import { ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
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
import { Collapse } from './Collapse';
import { LENS_APPEAR_TRANSITION, lensEdgeTransition } from './lens';

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

const WarningIcon = () => (
  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

/**
 * A remark set in the margin of the page: a rule in the tone colour, the
 * title in that colour, the body in ink. No fill, so it reads as typeset
 * rather than as a card floating over the paper.
 */
function Callout({ tone, title, children }: { tone: 'warn' | 'bad'; title: string; children: ReactNode }) {
  const toneClasses = tone === 'warn' ? 'border-warn text-warn' : 'border-bad text-bad';
  return (
    <div role="alert" className={`flex items-start gap-3 border-l-2 pl-4 py-0.5 ${toneClasses}`}>
      <WarningIcon />
      <div className="font-serif">
        <h4 className="text-[15px] font-bold">{title}</h4>
        <p className="text-[14.5px] leading-relaxed text-ink mt-0.5">{children}</p>
      </div>
    </div>
  );
}

/** Formula line and supporting notes for a figure's "how it's calculated" note. */
function Derivation({ formula, children }: { formula?: ReactNode; children?: ReactNode }) {
  return (
    <div className="font-serif text-[14.5px] leading-relaxed">
      {formula && <p className="num text-ink mb-1.5">{formula}</p>}
      {children && <div className="text-ink-2 space-y-1">{children}</div>}
    </div>
  );
}

interface Tile {
  id: string;
  label: string;
  /** Exact value: shown on hover and to screen readers. */
  fullValue: string;
  /** Compact value shown in the table. */
  value: string;
  valueClassName?: string;
  note?: string;
  noteClassName?: string;
  formula?: ReactNode;
  details?: ReactNode;
}

/** Inset of the lens from the edges of the cell it sits behind. */
const LENS_INSET_X = 6;
const LENS_INSET_Y = 7;

interface LensBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** Which edges of the selected cell lie on the table's outer edges. */
  atLeft: boolean;
  atTop: boolean;
  atRight: boolean;
  atBottom: boolean;
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
  // The last selected figure, so its details stay visible while they close.
  const [shownTile, setShownTile] = useState<string | null>(null);
  const [heroOpen, setHeroOpen] = useState(false);
  const heroDetailsId = useId();
  const tileDetailsId = useId();

  // The glass lens sits behind the selected key figure. It is placed from the
  // cell's measured offset, so it follows wrapping and font swaps. When the
  // selection closes it fades out in place; the next selection appears where
  // it is rather than sweeping in from wherever it was last. Edges on the
  // table's outer edges settle without overshoot (see lens.ts).
  const tableRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const [lens, setLens] = useState<LensBox | null>(null);
  const [animate, setAnimate] = useState(false);

  const measure = useCallback(() => {
    if (!openTile) return;
    const table = tableRef.current;
    const cell = cellRefs.current.get(openTile);
    if (!table || !cell) return;
    const cellRight = table.clientWidth - cell.offsetLeft - cell.offsetWidth;
    const cellBottom = table.clientHeight - cell.offsetTop - cell.offsetHeight;
    const next: LensBox = {
      left: cell.offsetLeft + LENS_INSET_X,
      top: cell.offsetTop + LENS_INSET_Y,
      right: cellRight + LENS_INSET_X,
      bottom: cellBottom + LENS_INSET_Y,
      atLeft: cell.offsetLeft < 1,
      atTop: cell.offsetTop < 1,
      atRight: cellRight < 1,
      atBottom: cellBottom < 1,
    };
    setLens(prev =>
      prev &&
      prev.left === next.left &&
      prev.top === next.top &&
      prev.right === next.right &&
      prev.bottom === next.bottom
        ? prev
        : next
    );
  }, [openTile]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(table);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [measure]);

  // Enable the slide only once the lens has a resting place.
  useLayoutEffect(() => {
    if (openTile && lens && !animate) {
      const frame = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [openTile, lens, animate]);

  const selectTile = (id: string | null) => {
    // Opening from closed: snap to the new cell instead of sweeping in from
    // wherever the lens faded out last time.
    if (id && !openTile) setAnimate(false);
    if (id) setShownTile(id);
    setOpenTile(id);
  };

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

  // The simulation runs through the life-expectancy year, so the portfolio can
  // run out early, run out in that final year, or never run out.
  const depletes = portfolioDepletionAge !== null && portfolioDepletionAge !== undefined;
  const depletesEarly = depletes && portfolioDepletionAge < profile.lifeExpectancy;
  const depletesAtEnd = depletes && !depletesEarly;
  const yearsShort = depletesEarly ? profile.lifeExpectancy - portfolioDepletionAge : 0;
  const yearsShortText = `${yearsShort} ${yearsShort === 1 ? 'year' : 'years'}`;

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
  // (already retired, zero inflation), so figures don't repeat themselves.
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
      valueClassName: depletesEarly ? 'text-bad' : depletesAtEnd ? 'text-warn' : undefined,
      note: depletesEarly
        ? `Runs out ${yearsShortText} early`
        : depletesAtEnd
          ? 'Runs out in the final year'
          : 'Never runs out',
      noteClassName: depletesEarly ? 'text-bad' : depletesAtEnd ? 'text-warn' : undefined,
      formula: 'Simulated year by year until the balance reaches $0',
      details: (
        <>
          <p>
            Simulation runs from age {profile.retirementAge} to {profile.lifeExpectancy} ({retirementYears} years),
            assuming a {formatPercent(assumptions.retirementReturnRate)} annual return during retirement.
          </p>
          {depletesEarly ? (
            <p className="text-bad">
              The portfolio runs out {yearsShortText} before your planned life expectancy.
            </p>
          ) : depletesAtEnd ? (
            <p className="text-warn">
              The portfolio runs out at age {portfolioDepletionAge}, the final year of the plan, leaving no margin
              for a longer life or weaker returns.
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

  // A figure can disappear while selected (penalties drop to zero after an
  // input change); clear the selection so the lens and details close with it.
  if (openTile && !tiles.some(t => t.id === openTile)) setOpenTile(null);

  const activeTile = tiles.find(t => t.id === shownTile);

  // Four figures sit in one row; a fifth (penalties) splits 3 + 2 until there
  // is room for all five.
  const columns = tiles.length > 4 ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5' : 'grid-cols-2 md:grid-cols-4';

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

  const showReal = Math.round(totalAtRetirement) !== Math.round(totalAtRetirementReal);

  return (
    <div className="space-y-7">
      {hasInvalidAges && (
        <Callout tone="warn" title="Check your ages">
          Current age ({profile.currentAge}) should be less than retirement age ({profile.retirementAge}), which
          should be less than life expectancy ({profile.lifeExpectancy}).
        </Callout>
      )}

      {/* At retirement: the headline figure, typeset in full on the page */}
      <section aria-label="At retirement">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <div className="min-w-0">
            <p className="font-serif italic text-[15px] text-ink-2">
              Portfolio at retirement, age {profile.retirementAge}
            </p>
            <p className="num text-[2.75rem] sm:text-[3.625rem] leading-none tracking-[-0.015em] text-ink mt-2">
              {formatCurrency(totalAtRetirement)}
            </p>
          </div>
          {showReal && (
            <p className="font-serif text-[15px] text-ink-2">
              <span className="num text-[17px] text-ink">{formatCurrency(totalAtRetirementReal)}</span> in today's
              dollars
            </p>
          )}
        </div>

        {groups.length > 0 && (
          <div className="flex gap-[3px] h-1.5 mt-5 mb-2.5" aria-hidden="true">
            {groups.map(g => (
              <span key={g.id} className="rounded-[3px] min-w-[6px]" style={{ flexGrow: g.amount, backgroundColor: g.color }} />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-serif text-[14.5px] text-ink-2">
          {groups.map(g => (
            <span key={g.id} className="flex items-baseline">
              <span className="w-2 h-2 rounded-full shrink-0 mr-2 relative -top-px" style={{ backgroundColor: g.color }} aria-hidden="true" />
              {g.label}
              <span className="num text-ink ml-2">{formatCurrency(g.amount)}</span>
              <span className="text-[13px] text-ink-3 ml-1.5">{Math.round(g.share * 100)}%</span>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setHeroOpen(open => !open)}
            aria-expanded={heroOpen}
            aria-controls={heroDetailsId}
            className="no-print ml-auto italic text-[13.5px] text-ink-3 hover:text-ink underline-offset-4 hover:underline"
          >
            {heroOpen ? 'Hide calculation' : 'How this is calculated'}
          </button>
        </div>

        <Collapse open={heroOpen} id={heroDetailsId}>
          <div className="pt-3 max-w-[64ch]">
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
        </Collapse>
      </section>

      {/* During retirement: a ruled table of key figures; a glass lens marks the selected one */}
      <section aria-label="During retirement">
        <div className="key-figures">
          {lens && (
            <span
              aria-hidden="true"
              className="key-figure-lens glass"
              data-open={openTile ? true : undefined}
              style={{
                left: lens.left,
                top: lens.top,
                right: lens.right,
                bottom: lens.bottom,
                transition: [
                  ...(animate
                    ? [
                        lensEdgeTransition('left', lens.atLeft),
                        lensEdgeTransition('top', lens.atTop),
                        lensEdgeTransition('right', lens.atRight),
                        lensEdgeTransition('bottom', lens.atBottom),
                      ]
                    : []),
                  LENS_APPEAR_TRANSITION,
                ].join(', '),
              }}
            />
          )}
          <div ref={tableRef} className={`key-figures-grid ${columns}`}>
            {tiles.map(tile => {
              const isOpen = tile.id === openTile;
              return (
                <button
                  key={tile.id}
                  ref={el => {
                    if (el) cellRefs.current.set(tile.id, el);
                    else cellRefs.current.delete(tile.id);
                  }}
                  type="button"
                  onClick={() => selectTile(isOpen ? null : tile.id)}
                  aria-expanded={isOpen}
                  aria-controls={tileDetailsId}
                  className="key-figure group px-4 sm:px-5 pt-4 pb-3.5"
                >
                  <span className="block font-serif italic text-[14.5px] leading-snug text-ink-2 underline-offset-[5px] decoration-hair-strong group-hover:underline">
                    {tile.label}
                  </span>
                  <span
                    className={`block num text-[1.75rem] md:text-[1.9375rem] leading-[1.1] tracking-[-0.01em] mt-2 mb-1 ${tile.valueClassName ?? 'text-ink'}`}
                    title={tile.fullValue}
                  >
                    {tile.value}
                    <span className="sr-only"> ({tile.fullValue})</span>
                  </span>
                  {tile.note && (
                    <span className={`block font-serif text-[13.5px] ${tile.noteClassName ?? 'text-ink-3'}`}>{tile.note}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Collapse open={openTile !== null} id={tileDetailsId}>
          {activeTile && (
            <div key={activeTile.id} className="fade-in pt-3.5 pl-4 sm:pl-5 max-w-[64ch]">
              <div className="flex items-baseline gap-3.5 mb-1 font-serif">
                <h4 className="text-[15px] font-bold text-ink">{activeTile.label}</h4>
                <span className="num text-[15px] text-ink">{activeTile.fullValue}</span>
              </div>
              <Derivation formula={activeTile.formula}>{activeTile.details}</Derivation>
            </div>
          )}
        </Collapse>
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
          It's projected to run out at age {portfolioDepletionAge}, {yearsShortText} before your planned life
          expectancy. Saving more, lowering the withdrawal rate, or retiring later would
          extend it.
        </Callout>
      )}
    </div>
  );
}
