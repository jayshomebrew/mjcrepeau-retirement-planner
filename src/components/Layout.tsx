import { ReactNode, useEffect, useRef, useState } from 'react';
import { CountrySelector } from './CountrySelector';
import { TAX_DATA_YEAR } from '../utils/constants';
import { ExportMenu, type ExportMenuActions } from './ExportMenu';

interface LayoutProps {
  children: ReactNode;
  /** Primary navigation, shown in the toolbar. */
  tabs?: ReactNode;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onReset: () => void;
  exportActions: ExportMenuActions;
}

const ResetIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const SunIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export function Layout({
  children,
  tabs,
  isDarkMode,
  onToggleDarkMode,
  onReset,
  exportActions,
}: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const themeLabel = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    // `no-print` hides the whole interactive app while the print report renders.
    <div className="no-print min-h-screen flex flex-col">
      {/* Toolbar: a floating glass bar that page content scrolls beneath. */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3">
        <div className="glass rounded-[26px] max-w-7xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 py-1.5 pl-5 pr-1.5">
          <h1 className="font-serif text-lg font-bold text-ink whitespace-nowrap mr-auto lg:mr-0">
            Retirement planner
          </h1>

          {tabs && (
            <nav className="order-last w-full -ml-3.5 pb-1 overflow-x-auto scrollbar-hide lg:order-none lg:w-auto lg:ml-auto lg:mr-auto lg:pb-0">
              {tabs}
            </nav>
          )}

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-1">
            <CountrySelector />
            <ExportMenu {...exportActions} />
            <button onClick={onReset} className="icon-btn hover:text-bad" title="Reset all data" aria-label="Reset all data">
              <ResetIcon />
            </button>
            <button onClick={onToggleDarkMode} className="icon-btn" title={themeLabel} aria-label={themeLabel}>
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          {/* Mobile menu */}
          <div className="md:hidden relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(open => !open)}
              className="icon-btn"
              aria-label="Menu"
              aria-expanded={isMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="glass glass-strong absolute right-0 mt-2 w-64 rounded-2xl p-1.5 z-50">
                <div className="px-2.5 pt-1.5 pb-2.5">
                  <CountrySelector />
                </div>
                <div className="my-1 border-t border-hair" />
                <ExportMenu {...exportActions} inline onAfterAction={() => setIsMenuOpen(false)} />
                <div className="my-1 border-t border-hair" />
                <button
                  onClick={() => {
                    onReset();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-sm text-ink hover:bg-hover flex items-center gap-3"
                >
                  <ResetIcon />
                  Reset all data
                </button>
                <button
                  onClick={() => {
                    onToggleDarkMode();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl text-left text-sm text-ink hover:bg-hover flex items-center gap-3"
                >
                  {isDarkMode ? <SunIcon /> : <MoonIcon />}
                  {isDarkMode ? 'Light mode' : 'Dark mode'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-6 pb-12">{children}</main>

      <footer className="max-w-7xl w-full mx-auto px-3 sm:px-6 pb-8">
        <div className="border-t border-hair pt-5 flex items-start justify-between gap-4">
          <p className="text-xs text-ink-2 leading-relaxed max-w-2xl">
            This tool provides estimates only. Consult a financial advisor for personalized advice.
            Tax calculations use {TAX_DATA_YEAR} federal brackets.
          </p>
          <a
            href="https://github.com/mjcrepeau/retirement-planner"
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn shrink-0 -mt-1.5"
            title="View on GitHub"
            aria-label="View on GitHub"
          >
            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
