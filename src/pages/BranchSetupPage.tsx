import { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, BookOpen, Layers } from 'lucide-react';
import { GateBranch, GATE_BRANCHES } from '../lib/types';
import { fireCelebrationConfetti } from '../lib/confetti';

interface BranchSetupPageProps {
  onSelectBranch: (branch: GateBranch, customName?: string) => void;
  onContinue: () => void;
}

export default function BranchSetupPage({
  onSelectBranch,
  onContinue,
}: BranchSetupPageProps) {
  const [selectedBranch, setSelectedBranch] = useState<GateBranch>('CS');
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (branch: GateBranch) => {
    setSelectedBranch(branch);
    setError(null);
  };

  const handleConfirm = () => {
    if (selectedBranch === 'CUSTOM' && !customName.trim()) {
      setError('Please enter a name for your custom branch or stream.');
      return;
    }
    onSelectBranch(selectedBranch, customName.trim());
    fireCelebrationConfetti();
    onContinue();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 font-sans px-4 py-8 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-glow-brand text-3xl shadow-xl mb-2">
            🎓
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">GATE Prep</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto">
            Select your GATE engineering branch to load the standard official syllabus with dual checklists, daily streaks, duration logs, and mock test analytics.
          </p>
        </div>

        {/* Branch Selection Grid */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-300 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Choose Your Branch
            </h2>
            <span className="text-xs text-slate-400">Standard Syllabus Included</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {GATE_BRANCHES.map((b) => {
              const isSelected = selectedBranch === b.code;
              return (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => handleSelect(b.code)}
                  className={`text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden flex items-start gap-3 ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-600/30 to-indigo-600/20 border-brand-500 shadow-glow-brand'
                      : 'bg-slate-900/60 hover:bg-slate-800/60 border-white/5 hover:border-white/15'
                  }`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold ${isSelected ? 'text-brand-300' : 'text-white'}`}>
                        {b.shortName}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {b.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Branch Input */}
          {selectedBranch === 'CUSTOM' && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-brand-500/40 space-y-2 animate-slide-up">
              <label className="block text-xs font-semibold text-brand-300">
                Custom Branch / Syllabus Name:
              </label>
              <input
                type="text"
                placeholder="e.g. GATE Metallurgical Engineering or Custom Prep"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setError(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-500 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-brand-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>Load Syllabus & Launch App</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] text-slate-400">
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-white/5">
            <span className="block text-white font-bold mb-0.5">Dual Checklist</span>
            Coverage & Multi-revision
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-white/5">
            <span className="block text-white font-bold mb-0.5">Daily Streak</span>
            Study log & Pomodoro
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-white/5">
            <span className="block text-white font-bold mb-0.5">Duration Calc</span>
            Timeline & target planner
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-white/5">
            <span className="block text-white font-bold mb-0.5">Mock Test Log</span>
            NPTEL & score analysis
          </div>
        </div>
      </div>
    </div>
  );
}
