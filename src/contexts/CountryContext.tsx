/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CountryCode, CountryConfig, getCountryConfig } from '../countries';
import { Modal } from '../components/Modal';
import { useRetained } from '../hooks/useRetained';

interface CountryContextValue {
  country: CountryCode;
  config: CountryConfig;
  /** Asks for confirmation, then switches and resets the plan to that country's defaults. */
  setCountry: (country: CountryCode) => void;
}

const CountryContext = createContext<CountryContextValue | undefined>(undefined);

interface CountryProviderProps {
  children: ReactNode;
  initialCountry?: CountryCode;
  onCountryChange?: (newCountry: CountryCode) => void;
}

// Load country from localStorage or use default
const getInitialCountry = (defaultCountry: CountryCode): CountryCode => {
  try {
    const stored = localStorage.getItem('retirement-planner-country');
    if (stored === 'US' || stored === 'CA') {
      return stored;
    }
  } catch (error) {
    console.error('Error loading country from localStorage:', error);
  }
  return defaultCountry;
};

export function CountryProvider({ children, initialCountry = 'US', onCountryChange }: CountryProviderProps) {
  const [country, setCountryState] = useState<CountryCode>(() => getInitialCountry(initialCountry));
  const [config, setConfig] = useState<CountryConfig>(() => getCountryConfig(getInitialCountry(initialCountry)));

  // Persist country to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('retirement-planner-country', country);
    } catch (error) {
      console.error('Error saving country to localStorage:', error);
    }
  }, [country]);

  // Switching resets the plan, so it waits for confirmation in a dialog. The
  // dialog renders here, at the root, rather than beside the selector: the
  // selector sits inside glass, whose backdrop-filter would trap a fixed
  // overlay inside the toolbar.
  const [pendingCountry, setPendingCountry] = useState<CountryCode | null>(null);
  const shownCountry = useRetained(pendingCountry);

  const setCountry = useCallback((newCountry: CountryCode) => {
    if (newCountry !== country) setPendingCountry(newCountry);
  }, [country]);

  const cancelSwitch = useCallback(() => setPendingCountry(null), []);

  const confirmSwitch = useCallback(() => {
    if (!pendingCountry) return;
    setPendingCountry(null);
    setCountryState(pendingCountry);
    setConfig(getCountryConfig(pendingCountry));
    // Resets profile, accounts and income streams, then reloads.
    onCountryChange?.(pendingCountry);
  }, [pendingCountry, onCountryChange]);

  return (
    <CountryContext.Provider value={{ country, config, setCountry }}>
      {children}
      <Modal
        open={pendingCountry !== null}
        title={`Switch to ${shownCountry === 'CA' ? 'Canada' : 'the United States'}?`}
        onClose={cancelSwitch}
        actions={
          <>
            <button onClick={cancelSwitch} className="btn btn-ghost">Cancel</button>
            <button onClick={confirmSwitch} className="btn btn-primary">Switch country</button>
          </>
        }
      >
        <p>
          This resets your accounts, profile, and income streams to {shownCountry === 'CA' ? 'Canadian' : 'US'}{' '}
          defaults. Your economic assumptions are kept. It can't be undone.
        </p>
      </Modal>
    </CountryContext.Provider>
  );
}

export function useCountry(): CountryContextValue {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
}
