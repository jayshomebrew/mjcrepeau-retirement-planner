import { useState } from 'react';
import { Account, AccountType, Profile, getAccountTypeLabel, is401k, getTaxTreatment } from '../types';
import { NumberInput } from './NumberInput';
import { Tooltip } from './Tooltip';
import { v4 as uuidv4 } from 'uuid';
import { useCountry } from '../contexts/CountryContext';
import { getDefaultWithdrawalAge, getMaxWithdrawalAge, birthYearFromAge } from '../utils/withdrawalDefaults';
import { getCountryConfig } from '../countries';

interface AccountFormProps {
  account?: Account;
  profile: Profile;
  onSave: (account: Account) => void;
  onCancel: () => void;
}

const defaultAccount: Omit<Account, 'id'> = {
  name: '',
  type: 'traditional_401k',
  balance: 0,
  annualContribution: 0,
  contributionGrowthRate: 0.03,
  returnRate: 0.07,
};


export function AccountForm({ account, profile, onSave, onCancel }: AccountFormProps) {
  const { config: countryConfig } = useCountry();

  // Initialize form data from account prop (component is re-mounted with key when account changes)
  const [formData, setFormData] = useState<Omit<Account, 'id'>>(() => {
    if (account) {
      const { id: _id, ...rest } = account;
      void _id; // Explicitly mark as intentionally unused
      return rest;
    }
    // Use first account type from country config as default
    const defaultType = countryConfig.accountTypes[0]?.type || 'traditional_401k';
    return { ...defaultAccount, type: defaultType as AccountType };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get country config for penalty info and defaults
  const fullCountryConfig = getCountryConfig(profile.country);
  const penaltyInfo = fullCountryConfig.getPenaltyInfo(formData.type);

  // Calculate min/max withdrawal ages
  const minWithdrawalAge = profile.currentAge;
  const birthYear = birthYearFromAge(profile.currentAge);
  const maxWithdrawalAge = getMaxWithdrawalAge(
    { ...formData, id: account?.id || '' },
    profile.lifeExpectancy,
    fullCountryConfig,
    birthYear
  );

  // Get current withdrawal age (or default)
  const currentWithdrawalAge = formData.withdrawalRules?.startAge ??
    getDefaultWithdrawalAge(
      { ...formData, id: account?.id || '' },
      profile.retirementAge,
      fullCountryConfig,
      birthYear
    );

  // Derive warning state instead of storing in state
  const showPenaltyWarning = penaltyInfo.appliesToAccountType && currentWithdrawalAge < penaltyInfo.penaltyAge;

  const handleChange = (field: keyof Omit<Account, 'id'>, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }

    if (formData.balance < 0) {
      newErrors.balance = 'Balance cannot be negative';
    }

    if (formData.annualContribution < 0) {
      newErrors.annualContribution = 'Contribution cannot be negative';
    }

    if (formData.costBasis !== undefined) {
      if (formData.costBasis < 0) {
        newErrors.costBasis = 'Cost basis cannot be negative';
      } else if (formData.costBasis > formData.balance) {
        newErrors.costBasis = 'Cost basis cannot exceed the current balance';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Cost basis only applies to taxable accounts; drop it if the account
    // type was switched to something else.
    const { costBasis, ...rest } = formData;
    const saved: Omit<Account, 'id'> =
      getTaxTreatment(formData.type) === 'taxable' && costBasis !== undefined
        ? { ...rest, costBasis }
        : rest;

    onSave({
      id: account?.id || uuidv4(),
      ...saved,
    });
  };

  // Get account types from country config
  const accountTypes: AccountType[] = countryConfig.accountTypes.map(
    (config) => config.type as AccountType
  );

  // Show employer match fields for 401k or employer RRSP
  const showEmployerMatchFields = is401k(formData.type) || formData.type === 'employer_rrsp';

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label className="field-label">
          Account name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Company 401(k)"
          aria-invalid={errors.name ? true : undefined}
          className="field"
        />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>

      <div>
        <label className="field-label">
          Account type
        </label>
        <select
          value={formData.type}
          onChange={(e) => handleChange('type', e.target.value as AccountType)}
          className="field"
        >
          {accountTypes.map(type => (
            <option key={type} value={type}>
              {getAccountTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <label className="field-label">
            Current balance ($)
          </label>
          <NumberInput
            value={formData.balance}
            onChange={(val) => handleChange('balance', val)}
            min={0}
            defaultValue={0}
            invalid={!!errors.balance}
            className="field"
          />
          {errors.balance && <p className="field-error">{errors.balance}</p>}
        </div>

        {getTaxTreatment(formData.type) === 'taxable' && (
          <div>
            <label className="field-label">
              Cost basis ($)
              <Tooltip text="The amount you originally invested (contributions, not growth). Used to compute the taxable gains portion of withdrawals. Leave equal to the balance if you have no unrealized gains; future contributions are added to it automatically." />
            </label>
            <NumberInput
              value={formData.costBasis ?? formData.balance}
              onChange={(val) => handleChange('costBasis', val)}
              min={0}
              defaultValue={formData.balance}
              invalid={!!errors.costBasis}
            className="field"
            />
            {errors.costBasis && <p className="field-error">{errors.costBasis}</p>}
          </div>
        )}

        <div>
          <label className="field-label">
            Annual contribution ($)
          </label>
          <NumberInput
            value={formData.annualContribution}
            onChange={(val) => handleChange('annualContribution', val)}
            min={0}
            defaultValue={0}
            invalid={!!errors.annualContribution}
            className="field"
          />
          {errors.annualContribution && (
            <p className="field-error">{errors.annualContribution}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <label className="field-label">
            Contribution growth (%)
            <Tooltip text="Annual increase in contributions (e.g., salary raises)" />
          </label>
          <NumberInput
            value={formData.contributionGrowthRate}
            onChange={(val) => handleChange('contributionGrowthRate', val)}
            min={0}
            max={20}
            isPercentage
            decimals={1}
            defaultValue={0.03}
            className="field"
          />
        </div>

        <div>
          <label className="field-label">
            Expected return (%)
          </label>
          <NumberInput
            value={formData.returnRate}
            onChange={(val) => handleChange('returnRate', val)}
            min={0}
            max={20}
            isPercentage
            decimals={1}
            defaultValue={0.07}
            className="field"
          />
        </div>
      </div>

      {showEmployerMatchFields && (
        <div className="border-t border-hair pt-3.5">
          <h4 className="text-[13px] font-semibold text-ink mb-2.5">
            {is401k(formData.type) ? '401(k) employer match' : 'Employer match'}
          </h4>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="field-label">
                Match rate (%)
                <Tooltip text="What percent of your contribution does employer match?" />
              </label>
              <NumberInput
                value={formData.employerMatchPercent || 0}
                onChange={(val) => handleChange('employerMatchPercent', val)}
                min={0}
                max={200}
                isPercentage
                decimals={0}
                defaultValue={0}
                className="field"
              />
            </div>

            <div>
              <label className="field-label">
                Match limit ($)
                <Tooltip text="Maximum annual employer match in dollars" />
              </label>
              <NumberInput
                value={formData.employerMatchLimit || 0}
                onChange={(val) => handleChange('employerMatchLimit', val)}
                min={0}
                defaultValue={0}
                className="field"
              />
            </div>
          </div>
        </div>
      )}

      {/* Withdrawals */}
      <div className="border-t border-hair pt-3.5">
        <h4 className="text-[13px] font-semibold text-ink mb-2.5">
          Withdrawals
        </h4>

        <div>
          <label className="field-label">
            Start withdrawals at age
            <Tooltip text="Age when you plan to start withdrawing from this account. Cannot be later than RMD age if applicable." />
          </label>
          <NumberInput
            value={currentWithdrawalAge}
            onChange={(val) => {
              setFormData(prev => ({
                ...prev,
                withdrawalRules: { startAge: val }
              }));
            }}
            min={minWithdrawalAge}
            max={maxWithdrawalAge}
            defaultValue={currentWithdrawalAge}
            className="field"
          />
          {showPenaltyWarning && (
            <p className="field-hint text-warn">
              Withdrawing before age {Math.ceil(penaltyInfo.penaltyAge)} incurs a {(penaltyInfo.penaltyRate * 100).toFixed(0)}% penalty
            </p>
          )}
          <p className="field-hint">
            Default: {getDefaultWithdrawalAge(
              { ...formData, id: account?.id || '' },
              profile.retirementAge,
              fullCountryConfig,
              birthYear
            )}
            {maxWithdrawalAge < profile.lifeExpectancy && ` (Max: ${maxWithdrawalAge} due to RMD)`}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {account ? 'Save changes' : 'Add account'}
        </button>
      </div>
    </form>
  );
}
