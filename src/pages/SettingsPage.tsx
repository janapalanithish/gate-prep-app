import { useState, useRef } from 'react';
import {
  Settings,
  ArrowLeft,
  Calendar,
  Clock,
  RotateCcw,
  Download,
  Upload,
  Layers,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Shield,
  Volume2,
  Smartphone,
} from 'lucide-react';
import { useStore, useActions } from '../lib/store';
import { UserSettings, GATE_BRANCHES } from '../lib/types';
import { exportDataAsJson, importDataFromJson } from '../lib/storage';
import { fireCelebrationConfetti } from '../lib/confetti';

interface SettingsPageProps {
  onResetBranch: () => void;
  onBack: () => void;
}

export default function SettingsPage({ onResetBranch, onBack }: SettingsPageProps) {
  const appData = useStore();
  const actions = useActions();

  const [settings, setSettings] = useState<UserSettings>(appData.settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentBranchInfo = GATE_BRANCHES.find((b) => b.code === appData.selectedBranch);

  const handleChange = (key: keyof UserSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    actions.updateSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportDataAsJson(appData);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gate-prep-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export backup:', err);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const imported = await importDataFromJson(text);
      actions.hydrate(imported);
      setImportSuccess(true);
      fireCelebrationConfetti();
      setTimeout(() => setImportSuccess(false), 4000);
    } catch (err: any) {
      setImportError(err.message || 'Invalid backup file format.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFullReset = () => {
    if (
      confirm(
        '⚠️ Are you sure you want to reset ALL app data? This will clear all checklist progress, logs, and mock tests.'
      )
    ) {
      actions.resetAllData(appData.selectedBranch || 'CS');
      alert('App data has been reset to defaults.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Prep
        </button>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-400" />
          <h2 className="text-xl font-bold text-white">Settings & Preferences</h2>
        </div>
        <div className="w-16" /> {/* spacer */}
      </div>

      {/* Save banner */}
      {saveSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Settings updated successfully!
        </div>
      )}

      {/* Branch Information */}
      <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-300 uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            Current Branch
          </div>
          <button
            onClick={onResetBranch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Change Branch
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
          <span className="text-2xl">{currentBranchInfo?.icon || '🎓'}</span>
          <div>
            <h3 className="text-sm font-bold text-white">
              {appData.selectedBranch === 'CUSTOM'
                ? appData.customBranchName || 'Custom Branch'
                : currentBranchInfo?.name || 'GATE Engineering'}
            </h3>
            <p className="text-xs text-slate-400">
              {appData.subjects.length} Subjects Loaded · Dual Checklist Active
            </p>
          </div>
        </div>
      </div>

      {/* Preferences Form */}
      <form
        onSubmit={handleSaveSettings}
        className="glass-panel rounded-3xl p-5 border border-white/10 space-y-5"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-brand-300 uppercase tracking-wider">
          <Calendar className="w-4 h-4" />
          Exam & Study Goals
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Target Exam Year
            </label>
            <input
              type="number"
              value={settings.targetExamYear}
              onChange={(e) => handleChange('targetExamYear', parseInt(e.target.value) || 2026)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Exam Date
            </label>
            <input
              type="date"
              value={settings.examDate}
              onChange={(e) => handleChange('examDate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Daily Study Goal (Hours)
            </label>
            <input
              type="number"
              min={1}
              max={24}
              value={settings.dailyStudyHourGoal}
              onChange={(e) => handleChange('dailyStudyHourGoal', parseInt(e.target.value) || 6)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Default Revision Target (Rounds)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.revisionRoundsDefault}
              onChange={(e) => handleChange('revisionRoundsDefault', parseInt(e.target.value) || 3)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-900/30"
          >
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      </form>

      {/* Backup & Restore */}
      <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-300 uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          Backup & Data Persistence
        </div>
        <p className="text-xs text-slate-300">
          Your progress is stored locally on your device. Export a JSON backup to keep your data safe or transfer it to another device.
        </p>

        {importSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Backup imported successfully!
          </div>
        )}

        {importError && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {importError}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4 text-brand-400" />
            Export JSON Backup
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            Import JSON Backup
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel rounded-3xl p-5 border border-red-500/20 bg-red-500/5 space-y-3">
        <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-xs text-slate-400">
          Reset all checklist progress, logs, streak data, duration records, and mock tests back to clean slate.
        </p>
        <button
          onClick={handleFullReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All App Data
        </button>
      </div>
    </div>
  );
}
