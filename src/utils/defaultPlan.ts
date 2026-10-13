import { v4 as uuidv4 } from 'uuid';
import type { Account, IncomeStream, Profile } from '../types';
import { getCountryConfig, type CountryCode } from '../countries';
import { DEFAULT_PROFILE, DEFAULT_INCOME_STREAMS } from './constants';

// Default accounts for US
const createUSDefaultAccounts = (): Account[] => [
  {
    id: uuidv4(),
    name: 'Company 401(k)',
    type: 'traditional_401k',
    balance: 150000,
    annualContribution: 15000,
    contributionGrowthRate: 0.03,
    returnRate: 0.07,
    employerMatchPercent: 0.5,
    employerMatchLimit: 3000,
  },
  {
    id: uuidv4(),
    name: 'Roth IRA',
    type: 'roth_ira',
    balance: 40000,
    annualContribution: 7000,
    contributionGrowthRate: 0,
    returnRate: 0.07,
  },
];

// Default accounts for Canada
const createCADefaultAccounts = (): Account[] => [
  {
    id: uuidv4(),
    name: 'Employer RRSP',
    type: 'employer_rrsp',
    balance: 150000,
    annualContribution: 15000,
    contributionGrowthRate: 0.03,
    returnRate: 0.07,
    employerMatchPercent: 0.5,
    employerMatchLimit: 3000,
  },
  {
    id: uuidv4(),
    name: 'TFSA',
    type: 'tfsa',
    balance: 40000,
    annualContribution: 7000,
    contributionGrowthRate: 0,
    returnRate: 0.07,
  },
];

// Get default accounts based on country
export const createDefaultAccounts = (country: CountryCode = 'US'): Account[] => {
  return country === 'CA' ? createCADefaultAccounts() : createUSDefaultAccounts();
};

export interface CountryDefaultPlan {
  accounts: Account[];
  profile: Profile;
  incomeStreams: IncomeStream[];
}

/**
 * The starting plan for a country. Shared by country switching and "Reset
 * all data" so the two can't drift apart (reset used to fall back to the US
 * defaults even in Canada mode). Assumptions are country-neutral and are
 * not included.
 */
export function getCountryDefaultPlan(country: CountryCode): CountryDefaultPlan {
  return {
    accounts: createDefaultAccounts(country),
    profile: {
      ...DEFAULT_PROFILE,
      ...getCountryConfig(country).getDefaultProfile(),
      country,
    },
    // Default SS for US, empty for Canada
    incomeStreams: country === 'US' ? DEFAULT_INCOME_STREAMS : [],
  };
}
