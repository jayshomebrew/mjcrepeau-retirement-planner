import { useState } from 'react';
import { IncomeStream, getIncomeTaxTreatmentLabel } from '../types';
import { IncomeStreamForm } from './IncomeStreamForm';
import { CHART_COLORS } from '../utils/constants';

interface IncomeStreamListProps {
  incomeStreams: IncomeStream[];
  onAdd: (stream: IncomeStream) => void;
  onUpdate: (stream: IncomeStream) => void;
  onDelete: (id: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function getTaxTreatmentColor(treatment: IncomeStream['taxTreatment']): string {
  switch (treatment) {
    case 'social_security': return CHART_COLORS.socialSecurity;
    case 'fully_taxable': return CHART_COLORS.pension;
    case 'other_income': return CHART_COLORS.otherIncome;
    case 'tax_free': return CHART_COLORS.taxFreeIncome;
  }
}

export function IncomeStreamList({ incomeStreams, onAdd, onUpdate, onDelete }: IncomeStreamListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingStream, setEditingStream] = useState<IncomeStream | undefined>();

  const handleSave = (stream: IncomeStream) => {
    if (editingStream) {
      onUpdate(stream);
    } else {
      onAdd(stream);
    }
    setShowForm(false);
    setEditingStream(undefined);
  };

  const handleEdit = (stream: IncomeStream) => {
    setEditingStream(stream);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStream(undefined);
  };

  const totalMonthly = incomeStreams.reduce((sum, s) => sum + s.monthlyAmount, 0);

  return (
    <div>
      {showForm && (
        <div className="rounded-2xl bg-well px-3.5 py-4 mb-3">
          <h4 className="font-serif text-base font-bold text-ink mb-3">
            {editingStream ? 'Edit income stream' : 'New income stream'}
          </h4>
          <IncomeStreamForm
            key={editingStream?.id ?? 'new'}
            incomeStream={editingStream}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      {incomeStreams.length === 0 && !showForm ? (
        <p className="text-ink-2 text-sm py-3">
          Add Social Security, pensions, or other income you expect in retirement.
        </p>
      ) : (
        <ul>
          {incomeStreams.map(stream => (
            <li
              key={stream.id}
              className="grid grid-cols-[8px_minmax(0,1fr)_auto_auto] items-center gap-x-3 py-2.5 border-b border-hair"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getTaxTreatmentColor(stream.taxTreatment) }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink truncate">{stream.name}</div>
                <div className="text-xs text-ink-2 truncate">
                  {getIncomeTaxTreatmentLabel(stream.taxTreatment)}, age {stream.startAge}{stream.endAge ? `–${stream.endAge}` : '+'}
                </div>
              </div>
              <div className="text-right">
                <div className="num text-[15px] text-ink">{formatCurrency(stream.monthlyAmount)}/mo</div>
                <div className="num text-xs text-ink-2">{formatCurrency(stream.monthlyAmount * 12)}/yr</div>
              </div>
              <div className="flex -mr-1.5">
                <button
                  onClick={() => handleEdit(stream)}
                  className="icon-btn w-7 h-7"
                  title="Edit"
                  aria-label={`Edit ${stream.name}`}
                >
                  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(stream.id)}
                  className="icon-btn w-7 h-7 hover:text-bad"
                  title="Delete"
                  aria-label={`Delete ${stream.name}`}
                >
                  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}

          {incomeStreams.length > 0 && (
            <li className="flex justify-between items-baseline pt-2.5">
              <span className="text-sm font-medium text-ink-2">Total</span>
              <span className="num text-base font-bold text-ink mr-[3.75rem]">
                {formatCurrency(totalMonthly)}/mo
              </span>
            </li>
          )}
        </ul>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="glass btn w-full mt-3 text-ink hover:bg-hover">
          Add income stream
        </button>
      )}
    </div>
  );
}
