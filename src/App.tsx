import { useEffect, useState } from 'react';
import { AppData } from './lib/types';
import { loadAppData, createDefaultAppData } from './lib/storage';
import { useStore, useActions } from './lib/store';

import BranchSetupPage from './pages/BranchSetupPage';
import ChecklistHubPage from './pages/ChecklistHubPage';
import DailyActivityPage from './pages/DailyActivityPage';
import DurationCalculatorPage from './pages/DurationCalculatorPage';
import MockTestLogPage from './pages/MockTestLogPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [showBranchSetup, setShowBranchSetup] = useState(false);
  const [activePage, setActivePage] = useState<'checklist' | 'daily' | 'duration' | 'mocktest' | 'settings'>('checklist');

  const appData = useStore();
  const actions = useActions();

  // Initialize state from storage on mount
  useEffect(() => {
    const init = async () => {
      const saved = await loadAppData();
      if (saved) {
        // Validate and fix missing fields if data is old
        const fixed: AppData = {
          ...saved,
          settings: saved.settings || createDefaultAppData(saved.selectedBranch || 'CS').settings,
          streakInfo: saved.streakInfo || { currentStreak: 0, longestStreak: 0, totalActiveDays: 0, lastActiveDate: null, activityHistory: {} },
          dailyLogs: saved.dailyLogs || {},
          durationRecords: saved.durationRecords || [],
          mockTestRecords: saved.mockTestRecords || [],
          subjects: saved.subjects || [],
          firstLaunchCompleted: saved.firstLaunchCompleted || false,
        };
        // Re-hydrate store
        actions.hydrate(fixed);
      } else {
        // No saved data - show branch setup
        setShowBranchSetup(true);
      }
      setLoaded(true);
    };
    init();
  }, []);

  // First launch redirect to branch setup
  useEffect(() => {
    if (loaded && !appData.firstLaunchCompleted && !showBranchSetup) {
      setShowBranchSetup(true);
    }
  }, [loaded, appData.firstLaunchCompleted, showBranchSetup]);

  const handleBranchSelected = (branch: import('./lib/types').GateBranch, customName = '') => {
    actions.selectBranch(branch, customName);
    setShowBranchSetup(false);
  };

  const handleReset = () => {
    setShowBranchSetup(true);
    actions.resetBranch();
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center text-slate-300 font-sans">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow-brand flex items-center justify-center text-3xl shadow-2xl">🎓</div>
          <h2 className="text-xl font-semibold tracking-tight">GATE Prep</h2>
          <span className="text-sm text-slate-400">Loading your progress...</span>
        </div>
      </div>
    );
  }

  if (showBranchSetup) {
    return (
      <BranchSetupPage
        onSelectBranch={handleBranchSelected}
        onContinue={() => setShowBranchSetup(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel backdrop-blur-xl border-b border-white/5 shadow-glass">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => setActivePage('checklist')}
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow-brand flex items-center justify-center text-lg shadow-md transition-transform group-hover:scale-105">
              🎓
            </div>
            <div className="leading-none">
              <h1 className="text-base font-bold tracking-tight text-white">GATE Prep</h1>
              <span className="text-[10px] font-medium text-brand-300">Exam Prep Hub</span>
            </div>
          </button>

          <nav className="hidden sm:flex items-center gap-1 bg-white/5 rounded-full px-1.5 py-1 border border-white/10">
            {[
              { id: 'checklist' as const, label: 'Checklists' },
              { id: 'daily' as const, label: 'Daily' },
              { id: 'duration' as const, label: 'Duration' },
              { id: 'mocktest' as const, label: 'Mock Tests' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  activePage === item.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-900/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                aria-pressed={activePage === item.id}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setActivePage('settings')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-sm hover:text-brand-300"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex overflow-x-auto px-4 pb-2 gap-2 snap-x snap-mandatory scrollbar-none">
          {[
            { id: 'checklist' as const, label: 'Checklists' },
            { id: 'daily' as const, label: 'Daily' },
            { id: 'duration' as const, label: 'Duration' },
            { id: 'mocktest' as const, label: 'Mock Tests' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`snap-start shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activePage === item.id
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-900/20'
                  : 'bg-white/5 text-slate-300 border border-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Page 1: Dual Progress Hub */}
        {activePage === 'checklist' && (
          <ChecklistHubPage
            onEditBranch={() => setShowBranchSetup(true)}
          />
        )}

        {/* Page 2: Daily Activity */}
        {activePage === 'daily' && <DailyActivityPage />}

        {/* Page 3: Duration Calculator */}
        {activePage === 'duration' && <DurationCalculatorPage />}

        {/* Page 4: Mock Tests */}
        {activePage === 'mocktest' && <MockTestLogPage />}

        {/* Settings */}
        {activePage === 'settings' && (
          <SettingsPage
            onResetBranch={handleReset}
            onBack={() => setActivePage('checklist')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-[11px] text-slate-500 font-medium tracking-wide">
        GATE Prep App · Local Persistent Storage · Cross-Platform
      </footer>
    </div>
  );
}
