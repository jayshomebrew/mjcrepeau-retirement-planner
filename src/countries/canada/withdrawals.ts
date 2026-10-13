import { RRIF_MINIMUM_TABLE, RRIF_START_AGE, RRIF_FIRST_MINIMUM_AGE } from './constants';

/**
 * Get RRIF minimum withdrawal percentage for a given age.
 *
 * `ageAtStartOfYear` is the age on January 1 of the withdrawal year, which is
 * how the CRA prescribed-factor table is keyed.
 */
export function getRRIFMinimumPercentage(ageAtStartOfYear: number): number {
  if (ageAtStartOfYear < RRIF_START_AGE) return 0;

  const entry = RRIF_MINIMUM_TABLE.find(e => e.age === ageAtStartOfYear);
  if (entry) return entry.minimumPercentage;

  // For ages beyond the table (95+), use the maximum percentage
  if (ageAtStartOfYear >= 95) return 0.20; // 20%

  return 0;
}

/**
 * Calculate RRIF minimum withdrawal.
 *
 * Applies to RRSP/RRIF (RRSP modeled as converted to RRIF at the end of the
 * year the holder turns 71) and to LIRA/LIF, which must likewise convert by
 * 71 and follow the same minimum table. LIF withdrawal MAXIMUMS are not
 * modeled.
 *
 * `age` is the age attained during the withdrawal year. No minimum is due in
 * the year a RRIF is opened, so the first minimum falls in the year the
 * holder turns 72; each year's rate is set by age on January 1 (age - 1).
 */
export function calculateRRIFMinimum(age: number, balance: number, accountType: string): number {
  if (!isRRIFAccount(accountType)) return 0;
  if (age < RRIF_FIRST_MINIMUM_AGE) return 0;
  if (balance <= 0) return 0;

  const percentage = getRRIFMinimumPercentage(age - 1);
  return balance * percentage;
}

/**
 * Check if RRSP must be converted to RRIF
 */
export function mustConvertRRSPToRRIF(age: number): boolean {
  return age >= RRIF_START_AGE;
}

/**
 * Check if account type is subject to RRIF-style minimums.
 * LIRA/LIF must convert to a LIF by 71 and follow the same minimum table.
 * Employer (group) RRSPs are RRSPs and convert the same way. FHSA balances
 * are modeled as transferred to an RRSP (see isTraditionalAccount), so they
 * follow RRSP rules too.
 */
export function isRRIFAccount(accountType: string): boolean {
  return (
    accountType === 'rrif' ||
    accountType === 'rrsp' ||
    accountType === 'employer_rrsp' ||
    accountType === 'fhsa' ||
    accountType === 'lif' ||
    accountType === 'lira'
  );
}
