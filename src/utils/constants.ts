import type { IncomeStream } from '../types';
import { v4 as uuidv4 } from 'uuid';

// US federal tax brackets, standard deductions, capital gains brackets, and
// RMD table/divisor are defined canonically in src/countries/usa/constants.ts.
// Re-exported here so existing imports throughout the app continue to work.
export {
  TAX_DATA_YEAR,
  TAX_BRACKETS_MFJ,
  TAX_BRACKETS_SINGLE,
  STANDARD_DEDUCTION_MFJ,
  STANDARD_DEDUCTION_SINGLE,
  CAPITAL_GAINS_BRACKETS_MFJ,
  CAPITAL_GAINS_BRACKETS_SINGLE,
  RMD_START_AGE,
  RMD_TABLE,
  getRMDDivisor,
  getRMDStartAge,
} from '../countries/usa/constants';

// Chart colors. Each is a CSS variable defined in index.css with separate
// light and dark values, so SVG fills and inline styles follow the theme
// without components needing to know which mode is active.
export const CHART_COLORS = {
  pretax: 'var(--pretax)',
  roth: 'var(--roth)',
  taxable: 'var(--taxable)',
  hsa: 'var(--hsa)',
  locked: 'var(--locked)',
  tax: 'var(--tax)',
  socialSecurity: 'var(--social)',
  spending: 'var(--spending)',
  pension: 'var(--pension)',
  otherIncome: 'var(--other-income)',
  taxFreeIncome: 'var(--tax-free)',
  retirementIncome: 'var(--retirement-income)',
};

// Default values for new app state
export const DEFAULT_PROFILE = {
  country: 'US' as const,
  currentAge: 35,
  retirementAge: 65,
  lifeExpectancy: 90,
  region: 'CA', // California
  filingStatus: 'married_filing_jointly' as const,
  stateTaxRate: 0.05,
};

export const DEFAULT_ASSUMPTIONS = {
  inflationRate: 0.03,
  safeWithdrawalRate: 0.04,
  retirementReturnRate: 0.05,
};

export const DEFAULT_INCOME_STREAMS: IncomeStream[] = [
  {
    id: uuidv4(),
    name: 'Social Security',
    monthlyAmount: 2500,
    startAge: 67,
    taxTreatment: 'social_security',
  },
];
