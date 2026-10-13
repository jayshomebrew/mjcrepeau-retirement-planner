import { useState } from 'react';
import { IncomeStream, IncomeTaxTreatment, getIncomeTaxTreatmentLabel } from '../types';
import { NumberInput } from './NumberInput';
import { v4 as uuidv4 } from 'uuid';

interface IncomeStreamFormProps {
  incomeStream?: IncomeStream;
  onSave: (stream: IncomeStream) => void;
  onCancel: () => void;
}


const TAX_TREATMENTS: IncomeTaxTreatment[] = ['social_security', 'fully_taxable', 'other_income', 'tax_free'];

const TAX_TREATMENT_DESCRIPTIONS: Record<IncomeTaxTreatment, string> = {
  social_security: '0–85% taxable via the IRS provisional-income phase-in',
  fully_taxable: '100% taxable as ordinary income',
  other_income: '100% taxable as ordinary income',
  tax_free: 'Not included in taxable income (e.g., VA disability)',
};

export function IncomeStreamForm({ incomeStream, onSave, onCancel }: IncomeStreamFormProps) {
  const [formData, setFormData] = useState<Omit<IncomeStream, 'id'>>(() => {
    if (incomeStream) {
      const { id: _id, ...rest } = incomeStream;
      void _id;
      return rest;
    }
    return {
      name: '',
      monthlyAmount: 0,
      startAge: 67,
      taxTreatment: 'social_security',
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof Omit<IncomeStream, 'id'>, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      newErrors.name = 'Name is required';
    }
    if (formData.monthlyAmount <= 0) {
      newErrors.monthlyAmount = 'Monthly amount must be greater than 0';
    }
    if (formData.startAge < 0 || formData.startAge > 120) {
      newErrors.startAge = 'Start age must be between 0 and 120';
    }
    if (formData.endAge !== undefined && formData.endAge < formData.startAge) {
      newErrors.endAge = 'End age must be at or after start age';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      id: incomeStream?.id || uuidv4(),
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label className="field-label">
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Social Security"
          aria-invalid={errors.name ? true : undefined}
          className="field"
        />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">
            Monthly amount ($)
          </label>
          <NumberInput
            value={formData.monthlyAmount}
            onChange={(val) => handleChange('monthlyAmount', val)}
            min={0}
            defaultValue={0}
            invalid={!!errors.monthlyAmount}
            className="field"
          />
          {errors.monthlyAmount ? (
            <p className="field-error">{errors.monthlyAmount}</p>
          ) : (
            <p className="field-hint">
              In today's dollars. Adjusted for inflation automatically.
            </p>
          )}
        </div>

        <div>
          <label className="field-label">
            Start age
          </label>
          <NumberInput
            value={formData.startAge}
            onChange={(val) => handleChange('startAge', val)}
            min={0}
            max={120}
            defaultValue={67}
            invalid={!!errors.startAge}
            className="field"
          />
          {errors.startAge && <p className="field-error">{errors.startAge}</p>}
        </div>
      </div>

      <div>
        <label className="field-label">
          End age <span className="font-normal">(optional, blank for lifetime)</span>
        </label>
        <input
          type="number"
          value={formData.endAge ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : Number(e.target.value);
            setFormData(prev => ({ ...prev, endAge: val }));
            if (errors.endAge) {
              setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.endAge;
                return newErrors;
              });
            }
          }}
          min={0}
          max={120}
          placeholder="62"
          aria-invalid={errors.endAge ? true : undefined}
          className="field"
        />
        {errors.endAge && <p className="field-error">{errors.endAge}</p>}
      </div>

      <div>
        <label className="field-label">
          Tax treatment
        </label>
        <select
          value={formData.taxTreatment}
          onChange={(e) => handleChange('taxTreatment', e.target.value as IncomeTaxTreatment)}
          className="field"
        >
          {TAX_TREATMENTS.map(treatment => (
            <option key={treatment} value={treatment}>
              {getIncomeTaxTreatmentLabel(treatment)}
            </option>
          ))}
        </select>
        <p className="field-hint">
          {TAX_TREATMENT_DESCRIPTIONS[formData.taxTreatment]}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {incomeStream ? 'Save changes' : 'Add income stream'}
        </button>
      </div>
    </form>
  );
}
