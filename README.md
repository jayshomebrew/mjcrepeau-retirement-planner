# Retirement Planner

A comprehensive retirement planning calculator that projects portfolio growth, simulates tax-optimized withdrawals, and visualizes your financial future through retirement.

✨Vibe✨ coded with Claude -- check results manually for accuracy.

Hosted at: [https://mjcrepeau.github.io/retirement-planner/](https://mjcrepeau.github.io/retirement-planner/)

![Dashboard showing retirement account totals, income, etc.](screenshots/dashboard.png "Main dashboard")

## Features

### Multi-Country Support
The calculator supports retirement planning for both **United States** and **Canada**:

#### United States
- **Account Types**: Traditional 401(k), Roth 401(k), Traditional IRA, Roth IRA, Taxable Brokerage, HSA
- **Tax System**: Federal income tax brackets, state tax rates, capital gains rates
- **Benefits**: Social Security modeled via Income Streams (see below)
- **RMDs**: Required Minimum Distributions starting at age 73 (born before 1960) or 75 (born 1960 or later), per SECURE 2.0

#### Canada
- **Account Types**: RRSP, TFSA, RRIF, LIRA, LIF, FHSA, Non-registered, Employer RRSP
- **Tax System**: Federal tax brackets, provincial tax rates by region
- **Benefits**: CPP (Canada Pension Plan) and OAS (Old Age Security)
- **RRIF Minimums**: Mandatory withdrawals starting at age 72 (the year after RRSP-to-RRIF conversion at 71)

Switching countries asks for confirmation, then resets accounts, profile, and income streams to that country's defaults. Economic assumptions are kept.

### Portfolio Management
- **Multiple Account Types**: Support for US and Canadian retirement account types
- **Employer Matching**: Configure employer match percentage and limits for 401(k) (traditional and Roth) and Employer RRSP accounts
- **Individual Returns**: Set expected return rates per account for the accumulation phase (retirement uses a single retirement return rate)
- **Cost Basis**: Enter a taxable account's cost basis so withdrawals are taxed only on the gains
- **Contribution Growth**: Model salary increases affecting future contributions
- **Configurable Withdrawal Ages**: Set when withdrawals begin from each account to model early retirement scenarios

### Income Streams
Model multiple sources of retirement income beyond portfolio withdrawals:
- **Flexible Sources**: Social Security, pensions, annuities, part-time work, VA disability, rental income, etc.
- **Tax Treatment Options**: Each stream is assigned one of four tax categories:
  - *Social Security* — 0–85% taxable via the IRS provisional-income formula (US); 85% for US benefits received by a Canadian resident, per the tax treaty
  - *Pension / Annuity* — 100% taxable as ordinary income
  - *Other Income* — 100% taxable as ordinary income
  - *Tax-Free* — excluded from taxable income (e.g., VA disability)
- **Start & End Ages**: Configure when each stream begins and optionally when it ends
- **Inflation Adjusted**: Amounts are stored in today's dollars and automatically adjusted for inflation

### Retirement Projections
- **Accumulation Phase**: Project portfolio growth from now until retirement with compound interest and contributions
- **Withdrawal Phase**: Simulate retirement spending with tax-optimized withdrawal strategies
- **Income Stream Integration**: Income streams reduce the amount needed from portfolio withdrawals
- **Inflation Adjustment**: All projections account for inflation over time

### Tax-Optimized Withdrawals
The withdrawal algorithm follows a tax-efficient strategy:
1. **Required Minimum Distributions (RMDs)**: Mandatory withdrawals from traditional accounts starting at age 73 or 75 depending on birth year (RRIF minimums from 72 in Canada)
2. **Account Availability**: Respects configured withdrawal start ages (e.g., delaying IRA withdrawals until age 60)
3. **Early Withdrawal Penalties**: Calculates 10% penalty for US traditional account withdrawals before age 59.5
4. **Tax Bracket Optimization**: Fill lower tax brackets with traditional withdrawals
5. **Roth Withdrawals**: Tax-free withdrawals for remaining needs
6. **Taxable Account Withdrawals**: With capital gains tracking
7. **HSA**: Used after taxable accounts; modeled as tax-free and penalty-free (assumes qualified medical expenses)
8. **Early Withdrawal Fallback**: If all available accounts are exhausted, withdraws from accounts before their configured start age, incurring early-withdrawal penalties (10% for US traditional accounts before age 59.5)

### Tax Calculations

#### United States
- 2026 Federal income tax brackets (Single and Married Filing Jointly)
- Long-term capital gains rates with 0%/15%/20% brackets
- State tax rate configuration
- Standard deduction applied automatically
- Social Security taxation via the provisional-income phase-in (0–85% taxable; the thresholds are frozen by law, not indexed)

#### Canada
- 2026 Federal tax brackets with Basic Personal Amount
- Provincial tax rates for all provinces and territories
- Capital gains inclusion rate (flat 50%, stacked on ordinary income)
- CPP/OAS benefit integration

### Visualizations
- **Accumulation Chart**: Stacked area chart showing portfolio growth by account
- **Drawdown Chart**: Portfolio balance through retirement years
- **Income Chart**: Annual retirement income breakdown (withdrawals, income streams by tax treatment, taxes)
- **Tax Chart**: Tax burden over time
- **Composition Chart**: Donut charts of the portfolio at retirement, by account type and by account, each with a table of figures
- **Timeline**: Today, retirement, benefit start ages, RMD/RRIF start, and the end of the plan on one line, with a marker if the money runs out early

### Screenshots
![Graph showing cash accumulation over working years](screenshots/accumulation.png "Accumulation graph")
![Graph showing account drawdown over retirement years](screenshots/drawdown.png "Drawdown graph")
![Graph showing retirement income year by year](screenshots/income.png "Income graph")
![Graph showing retirement tax burden year by year](screenshots/taxes.png "Tax burden graph")
![Table showing yearly income and spending calculations](screenshots/yearly.png "Yearly income table")


### Calculation Transparency
Full visibility into how every number is calculated:

- **Methodology Tab**: Complete reference documentation including:
  - All formulas used in accumulation and withdrawal phases
  - 2026 federal tax brackets (Single and MFJ)
  - Long-term capital gains rate tables
  - IRS Required Minimum Distribution (RMD) table
  - Tax-optimized withdrawal strategy explanation
  - Important assumptions and limitations

- **Year-by-Year Data Tables**: Expandable tables showing detailed projections:
  - *Accumulation Phase*: Summary, per-account balances, and contributions (with employer match)
  - *Withdrawal Phase*: Income & spending, income streams breakdown, withdrawals by account, remaining balances, and tax details
  - Lifetime totals and color-coded by tax treatment

- **Key Figures**: The headline portfolio figure and a ruled table of key figures (withdrawals, how long the portfolio lasts, lifetime taxes, penalties). Click any figure to see:
  - The formula used to calculate it
  - Step-by-step calculation breakdown
  - Context and explanations for the values

### Exporting Your Data
Three ways to get data out of the planner, from the **Export** menu in the header:

- **Save plan (.json)**: Writes your full plan — accounts, profile, income streams, assumptions, and country — to a dated file. Nothing leaves your browser.
- **Load plan (.json)**: Restores a saved plan. Every field is validated with readable errors, unknown fields are dropped rather than written to storage, and a confirmation modal previews the incoming plan before anything is overwritten. Plans saved in one country can be loaded in the other; the modal flags the switch.
- **Print / Save as PDF**: Renders a full report — cover page, plan inputs, summary, charts, year-by-year tables, and methodology — and hands it to your browser's print dialog, so "Save as PDF" produces the file.

Each year-by-year data panel, once expanded, also has a **Download CSV** button in its header that exports whichever view is currently active. CSVs lead with the header row so spreadsheets auto-detect it, carry raw unformatted numbers, and append a metadata block after a trailing blank line.

**A note on nominal vs. real dollars**: every figure the engine produces is in nominal (future) dollars. Exports keep nominal as the primary columns, add a Real column for headline figures, and include an `Inflation Factor` column so any other column can be deflated in a spreadsheet. Tax brackets, deductions, and benefit thresholds are indexed to the assumed inflation rate, as both countries do in law, so deflated tax figures reflect constant real tax policy rather than bracket creep. The exception is the US thresholds for taxing Social Security, which are frozen by statute and stay fixed.

### User Experience
- **Design**: Results are typeset on the page in Computer Modern; inputs and controls float above it on "liquid glass" panels
- **Dark Mode**: Toggle between light and dark themes (follows the system setting until you choose)
- **Data Persistence**: All data saved to localStorage automatically
- **Reset Function**: Clear accounts, profile, income streams, and assumptions and start fresh (country and theme are kept)
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS v4** for styling
- **Recharts** for data visualization
- **UUID** for unique account identifiers

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+ (required by Vite 7; CI uses Node 24)
- npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd retirement-planner

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Docker

```bash
# Build and start in production mode
docker compose up -d --build

# Stop and remove container
docker compose down

# View logs
docker compose logs -f
```

The app will be available at `http://localhost`.

## Project Structure

```
src/
├── components/           # React components
│   ├── AccountForm.tsx           # Form for adding/editing accounts
│   ├── AccountList.tsx           # List of investment accounts
│   ├── AssumptionsForm.tsx       # Economic assumptions input
│   ├── ChartAccumulation.tsx     # Portfolio growth chart
│   ├── ChartComposition.tsx      # Donut charts of allocation at retirement
│   ├── ChartDrawdown.tsx         # Retirement drawdown chart
│   ├── ChartIncome.tsx           # Retirement income chart
│   ├── ChartTax.tsx              # Tax burden chart
│   ├── chartTheme.ts             # Shared axis, legend, tooltip styling
│   ├── Collapse.tsx              # Eased open/close region
│   ├── CountrySelector.tsx       # Country switching dropdown
│   ├── CsvDownloadButton.tsx     # Per-table CSV download button
│   ├── DataTableAccumulation.tsx # Year-by-year accumulation data
│   ├── DataTableWithdrawal.tsx   # Year-by-year withdrawal data
│   ├── ExportMenu.tsx            # Save/load plan & print report menu
│   ├── Figure.tsx                # On-page heading + caption for charts/tables
│   ├── IncomeStreamForm.tsx     # Form for adding/editing income streams
│   ├── IncomeStreamList.tsx     # List of income streams
│   ├── Layout.tsx                # App layout with glass toolbar/footer
│   ├── lens.ts                   # Motion for the sliding glass lenses
│   ├── MethodologyPanel.tsx      # Formulas & assumptions reference
│   ├── Modal.tsx                 # Confirmation dialog
│   ├── NumberInput.tsx           # Numeric field with grouped thousands
│   ├── PrintReport.tsx           # Printable full-report rendering
│   ├── ProfileForm.tsx           # Personal information form
│   ├── RetirementTimeline.tsx    # Milestones from today to plan end
│   ├── SegmentedControl.tsx      # Tab strip with a sliding glass lens
│   ├── SidebarSection.tsx        # Inputs-panel accordion section
│   ├── SummaryCards.tsx          # Headline figure + key figures table
│   └── Tooltip.tsx               # Reusable tooltip component
├── contexts/
│   └── CountryContext.tsx    # Country selection state management
├── countries/                # Country-specific configurations
│   ├── index.ts              # Country config interface & registry
│   ├── usa/                  # United States configuration
│   │   ├── index.ts          # US account types, tax functions
│   │   ├── constants.ts      # US tax brackets, states
│   │   ├── taxes.ts          # US tax calculations
│   │   ├── withdrawals.ts    # US RMD calculations
│   │   └── benefits.ts       # Social Security calculations
│   └── canada/               # Canada configuration
│       ├── index.ts          # CA account types, tax functions
│       ├── constants.ts      # CA tax brackets, provinces
│       ├── taxes.ts          # CA tax calculations
│       ├── withdrawals.ts    # RRIF minimum calculations
│       └── benefits.ts       # CPP/OAS calculations
├── assets/fonts/             # Computer Modern Serif (CMU) + OFL license
├── hooks/
│   ├── useLocalStorage.ts    # localStorage persistence + dark mode
│   ├── useRetained.ts        # Keeps content while a dialog animates closed
│   └── useRetirementCalc.ts  # Main calculation orchestrator
├── types/
│   └── index.ts              # TypeScript type definitions
├── utils/
│   ├── export/               # Data export (CSV, JSON, print report)
│   │   ├── index.ts          # Public export surface
│   │   ├── types.ts          # ExportTable column/row/metadata types
│   │   ├── tables.ts         # Results -> presentation-neutral tables
│   │   ├── csv.ts            # CSV serialization (RFC 4180)
│   │   ├── scenario.ts       # Plan save/load + validation
│   │   ├── realDollars.ts    # Nominal -> real dollar conversion
│   │   ├── format.ts         # Shared value/filename formatting
│   │   └── download.ts       # Browser file download helper
│   ├── constants.ts          # Chart colors, defaults (re-exports US tax tables)
│   ├── format.ts             # Currency, compact and axis formatting
│   ├── incomeStreams.ts      # Income stream tax calculations
│   ├── penaltyCalculator.ts  # Early withdrawal penalty rules
│   ├── projections.ts        # Accumulation phase calculations
│   ├── storageKeys.ts        # Shared localStorage key names
│   ├── taxBrackets.ts        # Inflation indexing of brackets
│   ├── taxes.ts              # Legacy US tax wrapper
│   ├── withdrawalDefaults.ts # Default withdrawal start ages
│   └── withdrawals.ts        # Withdrawal phase simulation
├── tests/
│   ├── calculations.test.ts  # Comprehensive math tests (US & CA)
│   └── export.test.ts        # CSV, table builder & scenario tests
├── App.tsx                   # Main application component
├── index.css                 # Design system: theme tokens, glass, components
└── main.tsx                  # Application entry point
```

## How It Works

### Accumulation Phase
For each year until retirement:
1. Apply investment returns to existing balance
2. Add annual contribution (with employer match if applicable)
3. Grow contribution amount by contribution growth rate

### Withdrawal Phase
For each year of retirement:
1. Calculate Required Minimum Distribution (from age 73 or 75 by birth year; RRIF minimums from 72)
2. Determine target spending (safe withdrawal rate + inflation)
3. Subtract income streams and government benefits from spending need
4. Withdraw from accounts in tax-optimized order
5. Apply investment returns to remaining balance
6. Calculate federal and state taxes

### Key Assumptions
- Investment returns are applied annually
- Contributions are made at year-end
- RMDs follow the IRS Uniform Lifetime Table
- Income streams and government benefits grow with inflation
- Investment returns are per account while saving; in retirement every account earns the single retirement return rate
- Tax brackets, deductions, and basic personal amounts are 2026 values, indexed to the assumed inflation rate in future years
- CPP and OAS are modeled as 100% taxable income; US Social Security follows the provisional-income phase-in (0–85% taxable)
- The spending target is pre-tax; taxes are paid out of withdrawals rather than added on top
- RMD/RRIF withdrawals in excess of the spending need are counted as income for that year rather than reinvested

## Configuration

### Default Values
| Setting | Default |
|---------|---------|
| Current Age | 35 |
| Retirement Age | 65 |
| Life Expectancy | 90 |
| Inflation Rate | 3% |
| Safe Withdrawal Rate | 4% |
| Retirement Return Rate | 5% |
| CPP Benefit (Canada) | $18,092/year (CPP maximum at 65) |
| CPP Start Age (Canada) | 65 |
| OAS Benefit (Canada) | $8,908/year (OAS maximum at 65) |
| OAS Start Age (Canada) | 65 |

### Account Defaults
| Setting | Default |
|---------|---------|
| Expected Return | 7% |
| Contribution Growth | 3% |

## Testing

The project includes comprehensive tests for all calculations and exports:

```bash
npm test
```

Tests cover:
- Federal and state/provincial tax calculations (US & Canada)
- Capital gains taxation with country-specific rules
- RMD calculations (US) and RRIF minimums (Canada)
- Accumulation phase projections
- Withdrawal phase simulations
- Canadian account type recognition
- Edge cases (zero balances, long retirements, etc.)
- CSV escaping and structure (quoting, formula neutralization, metadata block)
- Nominal-to-real dollar conversion
- Export table builders for every data-table view
- Plan save/load round-tripping and import validation

Run `npm test` for the full suite and current test count.

## Credits

### Contributors
- **bwillem** ([@bguenther3](mailto:bguenther3@gmail.com)) - Multi-country support (Canada)
- **Josh Smith** ([smithgotsurf@gmail.com](mailto:smithgotsurf@gmail.com)) - Configurable account withdrawal age, Income Streams feature

## Disclaimer

This tool provides estimates only and should not be considered financial advice. Tax laws change frequently, and individual circumstances vary. Consult a qualified financial advisor for personalized retirement planning.

## License

MIT
