import { useState } from 'react';
import { Collapse } from './Collapse';
import { Account, Profile, getAccountTypeLabel, getTaxTreatment } from '../types';
import { AccountForm } from './AccountForm';
import { CHART_COLORS } from '../utils/constants';
import { getDefaultWithdrawalAge, birthYearFromAge } from '../utils/withdrawalDefaults';
import type { CountryConfig } from '../countries';

interface AccountListProps {
  accounts: Account[];
  profile: Profile;
  countryConfig: CountryConfig;
  onAdd: (account: Account) => void;
  onUpdate: (account: Account) => void;
  onDelete: (id: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function getTaxTreatmentColor(type: Account['type']): string {
  const treatment = getTaxTreatment(type);
  return CHART_COLORS[treatment];
}

export function AccountList({ accounts, profile, countryConfig, onAdd, onUpdate, onDelete }: AccountListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();

  const handleSave = (account: Account) => {
    if (editingAccount) {
      onUpdate(account);
    } else {
      onAdd(account);
    }
    setShowForm(false);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingAccount(undefined);
    setShowForm(true);
  };

  // The form keeps its account while it animates closed, so it is only
  // replaced when the form opens again.
  const handleCancel = () => {
    setShowForm(false);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div>
      <Collapse open={showForm}>
        <div className="rounded-xl bg-well px-3.5 py-4 mb-3">
          <h4 className="font-serif text-base font-bold text-ink mb-3">
            {editingAccount ? 'Edit account' : 'New account'}
          </h4>
          <AccountForm
            key={editingAccount?.id ?? 'new'}
            account={editingAccount}
            profile={profile}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </Collapse>

      {accounts.length === 0 && !showForm ? (
        <p className="text-ink-2 text-sm py-3">
          Add an account to see your projections.
        </p>
      ) : (
        <ul>
          {accounts.map(account => (
            <li
              key={account.id}
              className="group grid grid-cols-[8px_minmax(0,1fr)_auto_auto] items-center gap-x-3 py-2.5 border-b border-hair"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getTaxTreatmentColor(account.type) }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink truncate">{account.name}</div>
                <div className="text-xs text-ink-2 truncate">
                  {getAccountTypeLabel(account.type)}, from age {account.withdrawalRules?.startAge ?? getDefaultWithdrawalAge(account, profile.retirementAge, countryConfig, birthYearFromAge(profile.currentAge))}
                </div>
              </div>
              <div className="text-right">
                <div className="num text-[15px] text-ink">{formatCurrency(account.balance)}</div>
                <div className="num text-xs text-ink-2">+{formatCurrency(account.annualContribution)}/yr</div>
              </div>
              <div className="flex -mr-1.5">
                <button
                  onClick={() => handleEdit(account)}
                  className="icon-btn w-7 h-7"
                  title="Edit"
                  aria-label={`Edit ${account.name}`}
                >
                  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(account.id)}
                  className="icon-btn w-7 h-7 hover:text-bad"
                  title="Delete"
                  aria-label={`Delete ${account.name}`}
                >
                  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}

          {accounts.length > 0 && (
            <li className="flex justify-between items-baseline pt-2.5">
              <span className="text-sm font-medium text-ink-2">Total</span>
              <span className="num text-base font-bold text-ink mr-[3.75rem]">{formatCurrency(totalBalance)}</span>
            </li>
          )}
        </ul>
      )}

      <Collapse open={!showForm}>
        <button onClick={handleAdd} className="btn btn-primary w-full mt-3">
          Add account
        </button>
      </Collapse>
    </div>
  );
}
