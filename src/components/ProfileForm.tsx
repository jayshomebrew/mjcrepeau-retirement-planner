import { Profile, FilingStatus } from '../types';
import { NumberInput } from './NumberInput';
import { Tooltip } from './Tooltip';
import { useCountry } from '../contexts/CountryContext';

interface ProfileFormProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
}


export function ProfileForm({ profile, onChange }: ProfileFormProps) {
  const { country } = useCountry();

  const handleChange = (field: keyof Profile, value: number | string) => {
    onChange({
      ...profile,
      [field]: value,
    });
  };

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <label className="field-label">
            Current age
          </label>
          <NumberInput
            value={profile.currentAge}
            onChange={(val) => handleChange('currentAge', val)}
            min={18}
            max={100}
            defaultValue={35}
            className="field"
          />
        </div>

        <div>
          <label className="field-label">
            Retirement age
          </label>
          <NumberInput
            value={profile.retirementAge}
            onChange={(val) => handleChange('retirementAge', val)}
            min={18}
            max={100}
            defaultValue={65}
            className="field"
          />
        </div>

        <div>
          <label className="field-label">
            Life expectancy
          </label>
          <NumberInput
            value={profile.lifeExpectancy}
            onChange={(val) => handleChange('lifeExpectancy', val)}
            min={18}
            max={120}
            defaultValue={90}
            className="field"
          />
        </div>

        {country === 'CA' && (
          <div className="col-span-2">
            <label className="field-label">
              Province
            </label>
            <select
              value={profile.region || 'ON'}
              onChange={(e) => handleChange('region', e.target.value)}
              className="field"
            >
              <option value="AB">Alberta</option>
              <option value="BC">British Columbia</option>
              <option value="MB">Manitoba</option>
              <option value="NB">New Brunswick</option>
              <option value="NL">Newfoundland and Labrador</option>
              <option value="NS">Nova Scotia</option>
              <option value="NT">Northwest Territories</option>
              <option value="NU">Nunavut</option>
              <option value="ON">Ontario</option>
              <option value="PE">Prince Edward Island</option>
              <option value="QC">Quebec</option>
              <option value="SK">Saskatchewan</option>
              <option value="YT">Yukon</option>
            </select>
          </div>
        )}

        {country === 'US' && (
          <div>
            <label className="field-label">
              State tax rate (%)
            </label>
            <NumberInput
              value={profile.stateTaxRate || 0}
              onChange={(val) => handleChange('stateTaxRate', val)}
              min={0}
              max={15}
              isPercentage
              decimals={1}
              defaultValue={0.05}
              className="field"
            />
          </div>
        )}

        {country === 'US' && (
          <div className="col-span-2">
            <label className="field-label">
              Filing status
            </label>
            <select
              value={profile.filingStatus}
              onChange={(e) => handleChange('filingStatus', e.target.value as FilingStatus)}
              className="field"
            >
              <option value="single">Single</option>
              <option value="married_filing_jointly">Married filing jointly</option>
            </select>
          </div>
        )}
      </div>

      {country === 'CA' && (
        <>
          <h4 className="text-[13px] font-semibold text-ink pt-3.5 border-t border-hair">
            Canada Pension Plan (CPP)
          </h4>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="field-label">
                Annual benefit at 65 (today's $)
                <Tooltip text="Your estimated annual CPP benefit at age 65, in today's dollars. If you start CPP earlier or later, this amount is automatically adjusted (−0.6%/month before 65, +0.7%/month after)." />
              </label>
              <NumberInput
                value={profile.socialSecurityBenefit || 0}
                onChange={(val) => handleChange('socialSecurityBenefit', val)}
                min={0}
                placeholder="0"
                defaultValue={0}
                className="field"
              />
            </div>

            <div>
              <label className="field-label">
                Start age
              </label>
              <NumberInput
                value={profile.socialSecurityStartAge || 65}
                onChange={(val) => handleChange('socialSecurityStartAge', val)}
                min={60}
                max={70}
                defaultValue={65}
                className="field"
              />
            </div>
          </div>
        </>
      )}

      {/* OAS Section - Canada Only */}
      {country === 'CA' && (
        <>
          <h4 className="text-[13px] font-semibold text-ink pt-3.5 border-t border-hair">
            Old Age Security (OAS)
          </h4>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="field-label">
                Annual benefit (today's $)
                <Tooltip text="Your estimated annual OAS benefit in today's dollars. Max is ~$8,900/year in 2026." />
              </label>
              <NumberInput
                value={profile.secondaryBenefitAmount || 0}
                onChange={(val) => handleChange('secondaryBenefitAmount', val)}
                min={0}
                placeholder="0"
                defaultValue={0}
                className="field"
              />
            </div>

            <div>
              <label className="field-label">
                Start age
              </label>
              <NumberInput
                value={profile.secondaryBenefitStartAge || 65}
                onChange={(val) => handleChange('secondaryBenefitStartAge', val)}
                min={65}
                max={70}
                defaultValue={65}
                className="field"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
