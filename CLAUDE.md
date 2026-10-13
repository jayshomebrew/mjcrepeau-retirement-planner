# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # TypeScript check + production build
npm run lint     # ESLint
npm test         # Run calculation + export tests
npm run test:watch  # Re-run calculation tests on change
npm run preview  # Serve the production build
```

## Architecture

This is a React retirement planning calculator that projects portfolio growth and simulates tax-optimized withdrawals.

### Core Calculation Flow

1. **Accumulation Phase** (`src/utils/projections.ts`): Projects account growth from current age to retirement using compound interest, annual contributions, contribution growth rates, and employer matching.

2. **Withdrawal Phase** (`src/utils/withdrawals.ts`): Simulates retirement spending with a tax-optimized withdrawal strategy:
   - Takes Required Minimum Distributions (RMDs) from traditional accounts first. The start age comes from `getRMDStartAge(birthYear)`: US 73 if born before 1960, 75 otherwise (SECURE 2.0); Canada RRIF minimums from 72 (RRSP-family accounts convert at 71; no minimum is due in the conversion year, so the first minimum is at 72, using the CRA factor for age on January 1, i.e. age − 1). Birth year is estimated from current age (`birthYearFromAge`), so it can be off by one
   - Fills the tax bracket with additional traditional withdrawals, country-aware: US fills the standard deduction + 12% bracket, Canada fills to the top of the first (14%) federal bracket
   - Uses Roth accounts (tax-free)
   - Uses taxable accounts (with capital gains tracking)
   - Uses HSA last
   - Falls back to additional traditional withdrawals if needed
   - Final fallback: if all available accounts are exhausted, withdraws from accounts before their configured start age, incurring early-withdrawal penalties (10% for US traditional accounts before age 59.5)

3. **Tax Calculations** (`src/countries/{usa,canada}/taxes.ts`, exposed as `CountryConfig.calculateYearlyTaxes`; `src/utils/taxes.ts` is only a legacy US wrapper): computes federal + regional tax including capital gains (US: 2026 brackets with 0%/15%/20% capital gains rates, with any standard deduction unused by ordinary income offsetting gains; Canada: 50% capital gains inclusion stacked on ordinary income, federal and provincial basic personal amounts applied as non-refundable credits at the lowest bracket rate rather than deductions, plus the Quebec abatement and Ontario surtax). Brackets, deductions, and basic personal amounts are indexed by the assumed inflation rate for future years (via the `indexFactor` parameter and `scaleBrackets` in `src/utils/taxBrackets.ts`), matching how both countries index them in law. CPP and OAS are modeled as 100% taxable; US Social Security taxability follows the provisional-income phase-in (0–85%, `calculateTaxableSocialSecurity`) with statutorily frozen thresholds that are deliberately NOT inflation-indexed. The bracket-fill planning step still estimates benefit income at the flat 85% maximum (the exact amount depends on withdrawals not yet decided at that point). The OAS clawback compares prior-year taxable income (deflated to today's dollars) against the current-year threshold — all clawback math is done in today's dollars.

### Data Flow

- `App.tsx` holds state for accounts, profile, assumptions, and income streams (persisted to localStorage via `useLocalStorage`). The country lives in `CountryContext`, which also owns the switch-country confirmation dialog; the theme lives in `useDarkMode` (`darkMode` key)
- `useRetirementCalc` hook orchestrates calculations, returning `AccumulationResult` and `RetirementResult`
- Chart components receive results and render visualizations using Recharts

### Key Types (`src/types/index.ts`)

- `Account`: Investment account with balance, contributions, return rate, type (traditional_401k, roth_ira, etc.)
- `Profile`: User info including ages, filing status, region. The `socialSecurity*` fields are Canada's CPP and `secondaryBenefit*` is OAS; US Social Security is an `IncomeStream`
- `IncomeStream`: Social Security, pensions and other income, in today's dollars, with a tax treatment and start/end ages
- `Account.costBasis`: taxable accounts' basis for capital gains
- `Assumptions`: Economic parameters (inflation, withdrawal rate, retirement return)
- `AccumulationResult` / `RetirementResult`: Yearly projections with balances, withdrawals, taxes

### Key Features

**Configurable Withdrawal Ages:**
- Each account has optional `withdrawalRules: { startAge: number }`
- Defaults are smart: US accounts with an early-withdrawal penalty default to 60; everything else defaults to retirement age, capped at the RMD/RRIF age for accounts that have one
- Validation enforces RMD age constraints (can't delay past the RMD age: 73 or 75 US, 72 Canada)
- Early withdrawals trigger 10% penalty for US traditional accounts before age 59.5

**Export (`src/utils/export/`):**

Three export paths share one foundation. `tables.ts` turns results into presentation-neutral `ExportTable` objects (columns + rows + metadata); `csv.ts` serializes them for spreadsheets and `PrintReport.tsx` renders the same objects as HTML. Add a column once and both outputs get it.

- **Scenario JSON** (`scenario.ts`): saves/loads all five localStorage keys plus `schemaVersion`. Import validates every field, drops unknown ones, then writes storage and reloads — the same approach country switching uses, so providers re-initialize cleanly. Bump `SCENARIO_SCHEMA_VERSION` on any breaking shape change.
- **CSV**: one button per data-table view, exporting whatever view is active. Header row first (so spreadsheets auto-detect it), metadata after a trailing blank line, raw unformatted numbers, UTF-8 BOM, CRLF.
- **Print report** (`PrintReport.tsx`): mounts off-screen at a fixed 720px (7.5in at 96dpi) because Recharts measures its container and cannot size an element with no layout. Charts must be passed `animate={false}` — Recharts reveals series by animating a clip path from zero width, so an animating chart prints blank. Dark mode is stripped for the duration and restored afterward.

**Nominal vs. real dollars:**

Everything the engine outputs is nominal (future) dollars. `presentValue`/`inflationFactor` in `export/realDollars.ts` are the single conversion point, used by both `SummaryCards` and the exports. Exports carry nominal as the primary columns, a Real column for headline figures, and an `Inflation Factor` column so any other column can be deflated in a spreadsheet. Tax brackets and thresholds are indexed to the assumed inflation rate, so deflated tax figures reflect constant real tax policy (no artificial bracket creep).

**Known Simplifications (Penalty Calculations):**
- Roth contributions vs earnings not tracked separately. In reality, Roth contributions can be withdrawn penalty-free at any time; only earnings face the 10% penalty before age 59.5.
- HSA non-medical penalty (20% before age 65) not implemented. HSA withdrawals are modeled as penalty-free.
- 5-year rule for Roth accounts not tracked. Account opening dates are not stored.
- FHSA accounts are modeled as traditional/pretax (assumed transferred to RRSP and taxed on withdrawal).

**Known Simplifications (Tax Credits & Deductions):**
- US: only the regular standard deduction; the additional 65+ standard deduction and the OBBBA $6,000 senior deduction (2025–2028) are not modeled.
- Canada: only the basic personal amount credit, at its maximum (high-income phase-down ignored); the age amount and pension income amount credits are not modeled.

**Known Simplifications (Spending & Income):**
- The spending target is pre-tax; withdrawals are not grossed up to cover taxes.
- RMD/RRIF withdrawals in excess of the spending need are counted as income for that year rather than reinvested.

### Tailwind v4

Uses `@tailwindcss/vite` plugin. Dark mode requires this CSS directive:
```css
@custom-variant dark (&:where(.dark, .dark *));
```

### Design system (`src/index.css`)

Two materials: results are typeset directly on the page like a paper; instruments float above it in "liquid glass". Light mode is bright neutral paper ("vellum") with daylight gradients, dark mode is honed slate with a cool bloom. The page light (`bg-page`) is what the glass blurs.

- **Serif on paper, sans on glass.** Anything set on the page (headline figure, key figures, timeline, chart legends and captions, data-table headers, methodology prose, footer) is Computer Modern: italic for labels and captions, roman for figures and prose. Controls on glass (labels, buttons, tabs, menu items, tooltips) are the system UI sans. Figures are Computer Modern everywhere via the `num` utility (serif + tabular lining figures), which is why field values (`.field`), the toolbar title and dialog titles are serif too.
- **Theme tokens, not `dark:` variants.** Colors are CSS variables with light values on `:root` and dark values on `.dark`, exposed to Tailwind via `@theme inline`: `text-ink` / `text-ink-2` / `text-ink-3`, `border-hair` / `border-hair-strong` / `border-rule` (the heavy rules above and below tables and key figures), `bg-well`, `bg-hover`, `bg-paper`, data colors (`text-pretax`, `text-roth`, `text-taxable`, `text-hsa`, `text-tax`, `text-social`, …) and `text-good` / `text-bad` / `text-warn`. Components should not use Tailwind palette colors or `dark:`. The one exception is `PrintReport`, which always renders light and uses fixed `gray-*`/`white` classes. `.dark` is applied before first paint by an inline script in `index.html` that mirrors `useDarkMode`; keep the two in sync.
- **Type.** Computer Modern Serif (CMU, vendored unmodified in `src/assets/fonts/` with its OFL license) via `font-serif` or `num`. Three faces are vendored: 500 roman (serves weights 300–500), 700 roman (600–800) and 500 italic. There is no bold italic, so `font-bold italic` is synthesized; avoid it.
- **Component classes.** `.glass` (instrument surfaces: 22px blur, lit rim, a thin dark bottom edge for thickness), `.glass-strong` (a modifier used as `glass glass-strong` for menus, dialogs, tooltips that float over content), `.key-figures` / `.key-figure` / `.key-figure-lens` (the ruled key-figures table and the glass lens `SummaryCards` slides behind the selected cell), `.field` / `.field-label` / `.field-hint` / `.field-error`, `.btn` + `.btn-primary` / `.btn-ghost` / `.btn-danger`, `.icon-btn`. `SegmentedControl` is the tab strip with the sliding glass lens; `Figure` is an on-page heading for charts and tables with an italic caption beneath.
- **Radii.** 20px for the inputs panel and dialogs, 16px for menus, 14px for the key-figure lens and chart tooltips, 12px for info tooltips and menu items, 8px for fields; buttons and segmented controls are pills. The toolbar is a fixed 26px rather than a pill so it holds its shape when it wraps to two rows below `lg`.
- **Key figures** use `formatCompactCurrency` (`src/utils/format.ts`: $14.5k, $1.44M); the headline figure keeps full digits. Chart axes use `formatAxisCurrency` ($2M, $150k) on a round scale from `niceTicks`, via `currencyAxisProps` in `chartTheme.ts`; Recharts' own "nice" domain is not applied consistently, so every currency axis sets `domain` and `ticks` explicitly.
- **Callouts and notes** (`Callout` in `SummaryCards`, the methodology's limitations) are ruled remarks, not tinted cards: a 2px left rule and heading in the tone colour, body in ink, no fill. Nothing on the paper gets a filled box except formulas (`bg-well`).
- **Number fields** (`NumberInput`) show grouped thousands at rest ("150,000") and raw digits while focused; separators in typed input are ignored. They commit on blur or Enter, not per keystroke.
- **Empty table cells** use an en dash (–), never a hyphen.

### Motion and disclosure components

Nothing snaps open or shut; everything eases, and stays mounted until its exit finishes.

- `Collapse` eases height to the measured content height (so it also follows content that changes size while open), clips only while moving, keeps children mounted until the close ends, and is `inert` when closed.
- `Modal` stays mounted until its scrim fades out, so callers keep feeding it the content it showed via `useRetained` (the last non-null value). While open it focuses its first action, traps Tab, closes on Escape or a scrim click, and returns focus on close. Render dialogs at the root, never inside `.glass`: `backdrop-filter` makes a containing block that traps `position: fixed`.
- `SidebarSection` is the inputs-panel accordion (one section open at a time, with a summary readout in its header).
- `lens.ts` holds the motion shared by `SegmentedControl` and the key-figure lens: each edge transitions separately, springing through open space and settling without overshoot against the track's outer wall.
- `RetirementTimeline` measures its labels and stacks overlapping ones into rows; milestones at the same age merge ("Social Security and RMDs").
- `.popover` menus stay mounted and flip `visibility` after their fade. `prefers-reduced-motion` shortens every transition to ~0 (they still fire `transitionend`, which the unmount logic relies on), and `prefers-reduced-transparency` swaps glass for an opaque fill.

### Chart Components

Charts take no theme prop. `CHART_COLORS` (`src/utils/constants.ts`) values are `var(--…)` references and `src/components/chartTheme.ts` holds the shared axis, grid, cursor, legend, and tooltip styling (`AXIS_PROPS`, `LEGEND_PROPS`, `TOOLTIP_CLASS`, `LINE_CURSOR`, `BAR_CURSOR`), so SVG fills follow the theme through CSS. `currencyAxisProps(max)` must be given the largest *stacked* total, not the largest single series. Every chart takes an `animate` prop (see Print report above).
