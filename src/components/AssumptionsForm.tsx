import { Assumptions } from '../types';
import { NumberInput } from './NumberInput';
import { Tooltip } from './Tooltip';

interface AssumptionsFormProps {
  assumptions: Assumptions;
  onChange: (assumptions: Assumptions) => void;
}


export function AssumptionsForm({ assumptions, onChange }: AssumptionsFormProps) {
  const handleChange = (field: keyof Assumptions, value: number) => {
    onChange({
      ...assumptions,
      [field]: value,
    });
  };

  return (
    <div>
      <div className="space-y-3.5">
        <div>
          <label className="field-label">
            Inflation rate (%)
            <Tooltip text="Expected annual inflation rate" />
          </label>
          <NumberInput
            value={assumptions.inflationRate}
            onChange={(val) => handleChange('inflationRate', val)}
            min={0}
            max={10}
            isPercentage
            decimals={1}
            defaultValue={0.03}
            className="field"
          />
          <p className="field-hint">Historical average: ~3%</p>
        </div>

        <div>
          <label className="field-label">
            Safe withdrawal rate (%)
            <Tooltip text="Percentage of portfolio to withdraw annually in retirement" />
          </label>
          <NumberInput
            value={assumptions.safeWithdrawalRate}
            onChange={(val) => handleChange('safeWithdrawalRate', val)}
            min={1}
            max={10}
            isPercentage
            decimals={1}
            defaultValue={0.04}
            className="field"
          />
          <p className="field-hint">Traditional rule: 4%</p>
        </div>

        <div>
          <label className="field-label">
            Return in retirement (%)
            <Tooltip text="Expected annual return during retirement (typically more conservative)" />
          </label>
          <NumberInput
            value={assumptions.retirementReturnRate}
            onChange={(val) => handleChange('retirementReturnRate', val)}
            min={0}
            max={15}
            isPercentage
            decimals={1}
            defaultValue={0.05}
            className="field"
          />
          <p className="field-hint">Conservative assumption: 5%</p>
        </div>
      </div>
    </div>
  );
}
