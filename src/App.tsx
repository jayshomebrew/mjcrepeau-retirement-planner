import { useState, useCallback, useEffect, useRef } from 'react';
import { Account, Profile, Assumptions, IncomeStream } from './types';
import { DEFAULT_PROFILE, DEFAULT_ASSUMPTIONS, DEFAULT_INCOME_STREAMS } from './utils/constants';
import { createDefaultAccounts, getCountryDefaultPlan } from './utils/defaultPlan';
import { STORAGE_KEYS } from './utils/storageKeys';
import {
  buildScenario,
  downloadJson,
  parseScenario,
  scenarioFilename,
  type ScenarioFile,
} from './utils/export';
import { useRetirementCalc } from './hooks/useRetirementCalc';
import { useLocalStorage, useDarkMode } from './hooks/useLocalStorage';
import { CountryProvider, useCountry } from './contexts/CountryContext';
import { getCountryConfig, type CountryCode } from './countries';
import { getDefaultWithdrawalAge, birthYearFromAge } from './utils/withdrawalDefaults';
import { Layout } from './components/Layout';
import { AccountList } from './components/AccountList';
import { ProfileForm } from './components/ProfileForm';
import { AssumptionsForm } from './components/AssumptionsForm';
import { IncomeStreamList } from './components/IncomeStreamList';
import { SummaryCards } from './components/SummaryCards';
import { ChartAccumulation } from './components/ChartAccumulation';
import { ChartDrawdown } from './components/ChartDrawdown';
import { ChartIncome } from './components/ChartIncome';
import { ChartTax } from './components/ChartTax';
import { ChartComposition } from './components/ChartComposition';
import { MethodologyPanel } from './components/MethodologyPanel';
import { DataTableAccumulation } from './components/DataTableAccumulation';
import { DataTableWithdrawal } from './components/DataTableWithdrawal';
import { PrintReport } from './components/PrintReport';
import { SegmentedControl } from './components/SegmentedControl';
import { SidebarSection } from './components/SidebarSection';
import { Figure } from './components/Figure';
import { Modal } from './components/Modal';
import { useRetained } from './hooks/useRetained';
import { v4 as uuidv4 } from 'uuid';

/**
 * Normalize accounts loaded from localStorage to add withdrawal rules if missing
 * This ensures backwards compatibility with accounts saved before withdrawal rules were added
 */
function normalizeAccount(
  account: Account,
  profile: Profile
): Account {
  // If account already has withdrawal rules, return as-is
  if (account.withdrawalRules) {
    return account;
  }

  // Apply default withdrawal age based on account type and country config
  const countryConfig = getCountryConfig(profile.country);
  const defaultAge = getDefaultWithdrawalAge(
    account,
    profile.retirementAge,
    countryConfig,
    birthYearFromAge(profile.currentAge)
  );

  return {
    ...account,
    withdrawalRules: { startAge: defaultAge },
  };
}

/**
 * Persist a country's default accounts, profile and income streams. Callers
 * reload afterwards so every hook and provider re-initializes from storage.
 */
function writeCountryDefaultPlan(country: CountryCode): void {
  const plan = getCountryDefaultPlan(country);
  localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(plan.accounts));
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(plan.profile));
  localStorage.setItem(STORAGE_KEYS.incomeStreams, JSON.stringify(plan.incomeStreams));
}

type TabType = 'accumulation' | 'retirement' | 'summary' | 'methodology';

// Inner app component that uses the country context
function AppContent() {
  // Country context
  const { country, config: countryConfig } = useCountry();

  // Load profile first (needed for account normalization)
  const [profile, setProfile] = useLocalStorage<Profile>(
    'retirement-planner-profile',
    DEFAULT_PROFILE
  );

  // Use localStorage for accounts with normalization
  const [rawAccounts, setRawAccounts] = useLocalStorage<Account[]>(
    'retirement-planner-accounts',
    createDefaultAccounts()
  );

  // Normalize accounts to add withdrawal rules if missing (backwards compatibility)
  const accounts = rawAccounts.map(account => normalizeAccount(account, profile));

  // Wrapper for setAccounts that saves normalized accounts
  const setAccounts = useCallback((value: Account[] | ((prev: Account[]) => Account[])) => {
    if (typeof value === 'function') {
      setRawAccounts(prev => {
        const updated = value(prev);
        return updated.map(account => normalizeAccount(account, profile));
      });
    } else {
      setRawAccounts(value.map(account => normalizeAccount(account, profile)));
    }
  }, [setRawAccounts, profile]);

  const [assumptions, setAssumptions] = useLocalStorage<Assumptions>(
    'retirement-planner-assumptions',
    DEFAULT_ASSUMPTIONS
  );

  const [incomeStreams, setIncomeStreams] = useLocalStorage<IncomeStream[]>(
    'retirement-planner-income-streams',
    DEFAULT_INCOME_STREAMS
  );

  // One-time migration: pre-Income-Streams US profiles may have legacy
  // socialSecurityBenefit/socialSecurityStartAge values set (those fields are
  // now CPP-only for Canada). Convert any such legacy US Social Security into
  // an income stream so it isn't double-counted with the default SS stream,
  // then clear the legacy fields from the persisted profile.
  useEffect(() => {
    const isUS = profile.country === 'US' || (profile.country === undefined && country === 'US');
    if (!isUS) return;
    if (!profile.socialSecurityBenefit || profile.socialSecurityBenefit <= 0) return;

    const legacyBenefit = profile.socialSecurityBenefit;
    const legacyStartAge = profile.socialSecurityStartAge ?? 67;

    // Use a functional update so the "does a SS stream already exist?" check
    // sees the latest state, even under React strict-mode double-invocation.
    setIncomeStreams(prev => {
      const hasSocialSecurityStream = prev.some(s => s.taxTreatment === 'social_security');
      if (hasSocialSecurityStream) return prev;
      return [
        ...prev,
        {
          id: uuidv4(),
          name: 'Social Security',
          monthlyAmount: legacyBenefit / 12,
          startAge: legacyStartAge,
          taxTreatment: 'social_security',
        },
      ];
    });

    // Clear the legacy fields so this migration only runs once.
    setProfile(prev => {
      if (prev.socialSecurityBenefit === undefined && prev.socialSecurityStartAge === undefined) {
        return prev;
      }
      const next = { ...prev };
      delete next.socialSecurityBenefit;
      delete next.socialSecurityStartAge;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.country, profile.socialSecurityBenefit, profile.socialSecurityStartAge, country]);

  // Dark mode
  const [isDarkMode, toggleDarkMode] = useDarkMode();

  // UI state (not persisted)
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [expandedSection, setExpandedSection] = useState<string | null>('accounts');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<ScenarioFile | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  // What the import dialogs keep showing while they animate closed.
  const shownImport = useRetained(pendingImport);
  const shownImportError = useRetained(importError);
  const [isPrinting, setIsPrinting] = useState(false);
  const printGeneratedAt = useRef(new Date());

  const { accumulation, retirement } = useRetirementCalc(accounts, profile, assumptions, countryConfig, incomeStreams);

  const handleAddAccount = (account: Account) => {
    setAccounts(prev => [...prev, account]);
  };

  const handleUpdateAccount = (updatedAccount: Account) => {
    setAccounts(prev =>
      prev.map(acc => (acc.id === updatedAccount.id ? updatedAccount : acc))
    );
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const handleAddIncomeStream = (stream: IncomeStream) => {
    setIncomeStreams(prev => [...prev, stream]);
  };

  const handleUpdateIncomeStream = (updatedStream: IncomeStream) => {
    setIncomeStreams(prev =>
      prev.map(s => (s.id === updatedStream.id ? updatedStream : s))
    );
  };

  const handleDeleteIncomeStream = (id: string) => {
    setIncomeStreams(prev => prev.filter(s => s.id !== id));
  };

  const toggleSection = (section: string) => {
    setExpandedSection(prev => (prev === section ? null : section));
  };

  const handleReset = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const confirmReset = useCallback(() => {
    // Reset to the CURRENT country's defaults (the hooks' own reset values
    // are the US defaults). Write storage directly and reload, as country
    // switching and import do, so every hook re-initializes from it.
    writeCountryDefaultPlan(country);
    localStorage.setItem(STORAGE_KEYS.assumptions, JSON.stringify(DEFAULT_ASSUMPTIONS));
    setShowResetConfirm(false);
    window.location.reload();
  }, [country]);

  const cancelReset = useCallback(() => {
    setShowResetConfirm(false);
  }, []);

  // --- Save / load plan ---------------------------------------------------

  const handleSavePlan = useCallback(() => {
    const now = new Date();
    const scenario = buildScenario(
      {
        country,
        profile: { ...profile, country },
        accounts,
        incomeStreams,
        assumptions,
      },
      now
    );
    downloadJson(scenarioFilename(now), JSON.stringify(scenario, null, 2));
  }, [country, profile, accounts, incomeStreams, assumptions]);

  const handleLoadPlanFile = useCallback(async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      setPendingImport(null);
      setImportError('That file could not be read.');
      return;
    }

    const result = parseScenario(text);
    if (result.ok) {
      setImportError(null);
      setPendingImport(result.scenario);
    } else {
      setPendingImport(null);
      setImportError(result.error);
    }
  }, []);

  const confirmImport = useCallback(() => {
    if (!pendingImport) return;

    // Write the whole persisted state at once, then reload. This is the same
    // approach country switching uses: it guarantees every provider and hook
    // re-initializes from the new data (including account normalization and
    // the country config) rather than trying to sync state in place.
    localStorage.setItem(STORAGE_KEYS.country, pendingImport.country);
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(pendingImport.profile));
    localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(pendingImport.accounts));
    localStorage.setItem(
      STORAGE_KEYS.incomeStreams,
      JSON.stringify(pendingImport.incomeStreams)
    );
    localStorage.setItem(
      STORAGE_KEYS.assumptions,
      JSON.stringify(pendingImport.assumptions)
    );

    window.location.reload();
  }, [pendingImport]);

  const cancelImport = useCallback(() => {
    setPendingImport(null);
    setImportError(null);
  }, []);

  // --- Print report -------------------------------------------------------

  const handlePrintReport = useCallback(() => {
    printGeneratedAt.current = new Date();
    setIsPrinting(true);
  }, []);

  // Mount the report, let Recharts measure and draw it, then open the print
  // dialog. Dark mode is stripped for the duration so the report prints on
  // white instead of burning a page of dark backgrounds.
  useEffect(() => {
    if (!isPrinting) return;

    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    const restoreDarkMode = () => {
      if (wasDark) root.classList.add('dark');
    };
    if (wasDark) root.classList.remove('dark');

    const timer = window.setTimeout(() => {
      try {
        window.print();
      } finally {
        restoreDarkMode();
        setIsPrinting(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      restoreDarkMode();
    };
  }, [isPrinting]);

  const exportActions = {
    onSavePlan: handleSavePlan,
    onLoadPlanFile: handleLoadPlanFile,
    onPrintReport: handlePrintReport,
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'accumulation', label: 'Accumulation' },
    { id: 'retirement', label: 'Retirement' },
    { id: 'methodology', label: 'Methodology' },
  ];

  // One-line readouts for the collapsed sidebar sections.
  const formatMoney = (value: number) =>
    new Intl.NumberFormat(country === 'CA' ? 'en-CA' : 'en-US', {
      style: 'currency',
      currency: country === 'CA' ? 'CAD' : 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalMonthlyIncome = incomeStreams.reduce((sum, s) => sum + s.monthlyAmount, 0);

  const hasAccounts = accounts.length > 0;

  return (
    <>
    <Layout
      isDarkMode={isDarkMode}
      onToggleDarkMode={toggleDarkMode}
      onReset={handleReset}
      exportActions={exportActions}
      tabs={
        hasAccounts && (
          <SegmentedControl
            label="Results"
            options={tabs}
            value={activeTab}
            onChange={setActiveTab}
          />
        )
      }
    >
      {shownImport && (
        <Modal
          open={pendingImport !== null}
          title="Load this plan?"
          onClose={cancelImport}
          actions={
            <>
              <button onClick={cancelImport} className="btn btn-ghost">Cancel</button>
              <button onClick={confirmImport} className="btn btn-primary">Load plan</button>
            </>
          }
        >
          <p className="mb-3">
            This replaces your current accounts, profile, income streams, and assumptions. It can't
            be undone.
          </p>
          <dl className="rounded-xl bg-well px-3.5 py-3 space-y-1.5">
            <div className="flex justify-between gap-4">
              <dt>Country</dt>
              <dd className="text-ink font-medium">
                {shownImport.country === 'CA' ? 'Canada' : 'United States'}
                {shownImport.country !== country && (
                  <span className="text-warn"> (switching)</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Accounts</dt>
              <dd className="text-ink num">{shownImport.accounts.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Income streams</dt>
              <dd className="text-ink num">{shownImport.incomeStreams.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Ages</dt>
              <dd className="text-ink num">
                {shownImport.profile.currentAge} → {shownImport.profile.retirementAge}{' '}
                → {shownImport.profile.lifeExpectancy}
              </dd>
            </div>
            {shownImport.exportedAt && (
              <div className="flex justify-between gap-4">
                <dt>Saved</dt>
                <dd className="text-ink num">{shownImport.exportedAt.slice(0, 10)}</dd>
              </div>
            )}
          </dl>
        </Modal>
      )}

      <Modal
        open={importError !== null}
        title="Couldn't load that file"
        onClose={cancelImport}
        actions={<button onClick={cancelImport} className="btn btn-primary">OK</button>}
      >
        <p className="mb-2 text-ink">{shownImportError}</p>
        <p>Your current plan hasn't changed.</p>
      </Modal>

      <Modal
        open={showResetConfirm}
        title="Reset all data?"
        onClose={cancelReset}
        actions={
          <>
            <button onClick={cancelReset} className="btn btn-ghost">Cancel</button>
            <button onClick={confirmReset} className="btn btn-danger">Reset everything</button>
          </>
        }
      >
        <p>
          This clears your saved accounts, profile, income streams, and assumptions. It can't be
          undone.
        </p>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
        {/* Inputs: one glass panel floating over the page */}
        <aside className="glass rounded-[20px] p-1.5" aria-label="Plan inputs">
          <SidebarSection
            title="Investment accounts"
            summary={formatMoney(totalBalance)}
            isOpen={expandedSection === 'accounts'}
            onToggle={() => toggleSection('accounts')}
          >
            <AccountList
              accounts={accounts}
              profile={profile}
              countryConfig={countryConfig}
              onAdd={handleAddAccount}
              onUpdate={handleUpdateAccount}
              onDelete={handleDeleteAccount}
            />
          </SidebarSection>

          <SidebarSection
            title="Personal profile"
            summary={`Age ${profile.currentAge}, retire at ${profile.retirementAge}`}
            isOpen={expandedSection === 'profile'}
            onToggle={() => toggleSection('profile')}
          >
            <ProfileForm profile={profile} onChange={setProfile} />
          </SidebarSection>

          <SidebarSection
            title="Income streams"
            summary={totalMonthlyIncome > 0 ? `${formatMoney(totalMonthlyIncome)}/mo` : 'None'}
            isOpen={expandedSection === 'incomeStreams'}
            onToggle={() => toggleSection('incomeStreams')}
          >
            <IncomeStreamList
              incomeStreams={incomeStreams}
              onAdd={handleAddIncomeStream}
              onUpdate={handleUpdateIncomeStream}
              onDelete={handleDeleteIncomeStream}
            />
          </SidebarSection>

          <SidebarSection
            title="Economic assumptions"
            summary={`${(assumptions.inflationRate * 100).toFixed(1)}% inflation`}
            isOpen={expandedSection === 'assumptions'}
            onToggle={() => toggleSection('assumptions')}
          >
            <AssumptionsForm assumptions={assumptions} onChange={setAssumptions} />
          </SidebarSection>
        </aside>

        {/* Results, read directly on the page */}
        <div
          className="min-w-0 space-y-12"
          role={hasAccounts ? 'tabpanel' : undefined}
          aria-label={hasAccounts ? tabs.find(t => t.id === activeTab)?.label : undefined}
        >
          {!hasAccounts ? (
            <div className="py-16 text-center">
              <h3 className="font-serif text-2xl font-bold text-ink mb-2">Add your first account</h3>
              <p className="font-serif text-[15px] leading-relaxed text-ink-2 max-w-sm mx-auto mb-5">
                Projections, withdrawals, and taxes appear here once you add an investment account.
              </p>
              <button onClick={() => setExpandedSection('accounts')} className="btn btn-primary">
                Open accounts
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'summary' && (
                <>
                  <SummaryCards
                    accounts={accounts}
                    profile={profile}
                    assumptions={assumptions}
                    incomeStreams={incomeStreams}
                    accumulationResult={accumulation}
                    retirementResult={retirement}
                  />

                  <Figure
                    title="Portfolio composition at retirement"
                    caption={`Balances at age ${profile.retirementAge} by tax treatment and by account.`}
                  >
                    <ChartComposition accounts={accounts} result={accumulation} />
                  </Figure>
                </>
              )}

              {activeTab === 'accumulation' && (
                <>
                  <Figure
                    title="Account growth"
                    caption={`Projected balance of each account from age ${profile.currentAge} to ${profile.retirementAge}, in the dollars of each year.`}
                  >
                    <ChartAccumulation accounts={accounts} result={accumulation} />
                  </Figure>

                  <DataTableAccumulation
                    accounts={accounts}
                    result={accumulation}
                    profile={profile}
                    assumptions={assumptions}
                  />

                  <Figure title="Portfolio composition at retirement">
                    <ChartComposition accounts={accounts} result={accumulation} />
                  </Figure>
                </>
              )}

              {activeTab === 'retirement' && (
                <>
                  <Figure
                    title="Portfolio drawdown"
                    caption={`Remaining balance of each account from age ${profile.retirementAge} to ${profile.lifeExpectancy}, after that year's withdrawals.`}
                  >
                    <ChartDrawdown accounts={accounts} result={retirement} />
                  </Figure>

                  <Figure
                    title="Annual retirement income"
                    caption="Gross income by source each year, with the tax paid and what remains after it."
                  >
                    <ChartIncome result={retirement} incomeStreams={incomeStreams} />
                  </Figure>

                  <Figure
                    title="Tax burden over time"
                    caption="Tax paid each year of retirement, and the effective rate on that year's income."
                  >
                    <ChartTax result={retirement} />
                  </Figure>

                  <DataTableWithdrawal
                    accounts={accounts}
                    result={retirement}
                    incomeStreams={incomeStreams}
                    profile={profile}
                    assumptions={assumptions}
                  />
                </>
              )}

              {activeTab === 'methodology' && (
                <MethodologyPanel profile={profile} assumptions={assumptions} />
              )}
            </>
          )}
        </div>
      </div>
    </Layout>

    {isPrinting && accounts.length > 0 && (
      <PrintReport
        accounts={accounts}
        profile={profile}
        assumptions={assumptions}
        incomeStreams={incomeStreams}
        accumulation={accumulation}
        retirement={retirement}
        country={country}
        generatedAt={printGeneratedAt.current}
      />
    )}
    </>
  );
}

// Wrapper component that provides the CountryProvider with reset callback
function App() {
  const handleCountryChange = useCallback((newCountry: CountryCode) => {
    // Reset accounts, profile and income streams to country-specific
    // defaults (assumptions carry over), then reload to reinitialize.
    writeCountryDefaultPlan(newCountry);
    window.location.reload();
  }, []);

  return (
    <CountryProvider initialCountry="US" onCountryChange={handleCountryChange}>
      <AppContent />
    </CountryProvider>
  );
}

export default App;
