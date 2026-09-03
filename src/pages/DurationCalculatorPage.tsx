import { useState, useMemo } from 'react';
import {
  Calculator,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Layers,
  ArrowRight,
  BookOpen,
  Filter,
  Check,
} from 'lucide-react';
import { useStore, useActions } from '../lib/store';
import { DurationRecord, DurationStatus } from '../lib/types';
import { formatDateKey, parseDateKey } from '../lib/streakEngine';
import { fireCelebrationConfetti } from '../lib/confetti';

export default function DurationCalculatorPage() {
  const appData = useStore();
  const actions = useActions();

  // Form states
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [startDate, setStartDate] = useState(formatDateKey(new Date()));
  const [endDate, setEndDate] = useState(
    formatDateKey(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
  );
  const [plannedHoursPerDay, setPlannedHoursPerDay] = useState<number | ''>(4);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Filter state for history
  const [statusFilter, setStatusFilter] = useState<'all' | DurationStatus>('all');

  // Compute live duration in days for the input dates
  const liveCalculatedDuration = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (isNaN(start) || isNaN(end)) return 0;
    const diff = end - start;
    if (diff < 0) return -1; // End before start
    const days = Math.round(diff / (1000 * 60 * 60 * 24)) + 1; // Inclusive
    return days;
  }, [startDate, endDate]);

  // Determine status for a record based on current date
  const computeStatus = (startStr: string, endStr: string, completedAt?: string): DurationStatus => {
    if (completedAt) return 'completed';
    const nowKey = formatDateKey(new Date());
    if (nowKey < startStr) return 'upcoming';
    if (nowKey > endStr) return 'overdue';
    return 'in_progress';
  };

  // Handle adding duration calculation record
  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let subjectName = '';
    if (selectedSubjectId === '__custom__') {
      if (!customSubjectName.trim()) {
        setError('Please enter a custom subject name.');
        return;
      }
      subjectName = customSubjectName.trim();
    } else {
      const found = appData.subjects.find((s) => s.id === selectedSubjectId);
      if (!found) {
        setError('Please select a subject.');
        return;
      }
      subjectName = found.name;
    }

    if (liveCalculatedDuration <= 0) {
      setError('End date must be on or after start date.');
      return;
    }

    const targetHours =
      typeof plannedHoursPerDay === 'number' && plannedHoursPerDay > 0
        ? plannedHoursPerDay * liveCalculatedDuration
        : undefined;

    const newRecord: DurationRecord = {
      id: `dur_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      subjectId: selectedSubjectId,
      subjectName,
      startDate,
      endDate,
      durationDays: liveCalculatedDuration,
      plannedHoursPerDay:
        typeof plannedHoursPerDay === 'number' && plannedHoursPerDay > 0
          ? plannedHoursPerDay
          : undefined,
      totalTargetHours: targetHours,
      notes: notes.trim() || undefined,
      status: computeStatus(startDate, endDate),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    actions.addDurationRecord(newRecord);
    fireCelebrationConfetti();

    // Reset inputs
    setNotes('');
    setCustomSubjectName('');
  };

  // Toggle complete on a record
  const handleToggleComplete = (record: DurationRecord) => {
    const isDone = !!record.completedAt;
    actions.updateDurationRecord(record.id, {
      completedAt: isDone ? undefined : new Date().toISOString(),
      status: isDone ? computeStatus(record.startDate, record.endDate) : 'completed',
    });
    if (!isDone) fireCelebrationConfetti();
  };

  // Delete duration record
  const handleDeleteRecord = (id: string, name: string) => {
    if (confirm(`Delete duration record for "${name}"?`)) {
      actions.deleteDurationRecord(id);
    }
  };

  // Cumulative timeline stats
  const timelineStats = useMemo(() => {
    const records = appData.durationRecords || [];
    const totalDays = records.reduce((acc, r) => acc + r.durationDays, 0);
    const totalHours = records.reduce((acc, r) => acc + (r.totalTargetHours || 0), 0);
    const completedRecords = records.filter((r) => r.status === 'completed' || r.completedAt).length;

    return {
      totalSubjectsScheduled: records.length,
      totalCumulativeDays: totalDays,
      totalTargetStudyHours: totalHours,
      completedSubjectsCount: completedRecords,
    };
  }, [appData.durationRecords]);

  // Filtered history records
  const filteredRecords = useMemo(() => {
    const list = appData.durationRecords || [];
    if (statusFilter === 'all') return list;
    return list.filter((r) => {
      const currStatus = r.completedAt ? 'completed' : computeStatus(r.startDate, r.endDate, r.completedAt);
      return currStatus === statusFilter;
    });
  }, [appData.durationRecords, statusFilter]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* HEADER & SUMMARY METRICS */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-indigo-500/30 bg-gradient-to-r from-slate-900/90 via-indigo-950/30 to-slate-900/90 shadow-glow-brand relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-brand-500/30 shrink-0">
              ⏱️
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Subject Duration Calculator
              </h2>
              <p className="text-xs text-indigo-200/80 font-medium">
                Calculate, plan, and permanently track subject prep timelines.
              </p>
            </div>
          </div>

          {/* Timeline Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-2 min-w-[70px]">
              <span className="text-base sm:text-lg font-mono font-bold text-brand-400 block">
                {timelineStats.totalCumulativeDays}d
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                Total Days
              </span>
            </div>
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-2 min-w-[70px]">
              <span className="text-base sm:text-lg font-mono font-bold text-purple-400 block">
                {timelineStats.totalSubjectsScheduled}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                Scheduled
              </span>
            </div>
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-2 min-w-[70px]">
              <span className="text-base sm:text-lg font-mono font-bold text-emerald-400 block">
                {timelineStats.completedSubjectsCount}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                Completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* INPUT FORM SECTION */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Calculate New Subject Timeline
        </h3>

        <form onSubmit={handleAddRecord} className="space-y-4">
          {/* Subject Dropdown / Custom name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Choose Subject from Syllabus --</option>
                {appData.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="__custom__">➕ Other / Custom Subject</option>
              </select>
            </div>

            {selectedSubjectId === '__custom__' && (
              <div className="animate-slide-up">
                <label className="block text-xs font-semibold text-brand-300 mb-1">
                  Custom Subject Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Compiler Design or Engineering Math"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-brand-500/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            )}
          </div>

          {/* Date Pickers & Live Duration Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                End Date (Target)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Calculated Duration Display Box */}
            <div className="bg-slate-950/80 border border-brand-500/30 rounded-xl p-2.5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Calculated Duration
              </span>
              <div className="text-base font-mono font-black text-brand-400">
                {liveCalculatedDuration > 0
                  ? `${liveCalculatedDuration} Days`
                  : 'Invalid Range'}
              </div>
              {liveCalculatedDuration > 0 && (
                <span className="text-[10px] text-slate-400">
                  {Math.floor(liveCalculatedDuration / 7)}w {liveCalculatedDuration % 7}d
                </span>
              )}
            </div>
          </div>

          {/* Planned Hours and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Planned Study Hours / Day (Optional)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                step="0.5"
                placeholder="e.g. 4 hours"
                value={plannedHoursPerDay}
                onChange={(e) =>
                  setPlannedHoursPerDay(
                    e.target.value === '' ? '' : parseFloat(e.target.value)
                  )
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Milestones / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Standard theory + 150 PYQs from 2005-2024"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-brand-900/30 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Save Duration Record Permanently</span>
          </button>
        </form>
      </div>

      {/* HISTORY LOG TABLE & CARDS */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-400" />
              Saved Subject Timelines & History Log
            </h3>
            <p className="text-[11px] text-slate-400">
              Permanently preserved across app restarts until explicitly deleted.
            </p>
          </div>

          {/* Filter Status Chips */}
          <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' },
                { id: 'overdue', label: 'Overdue' },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === chip.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Records List */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No subject timeline records found. Use the calculator above to plan your subjects.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRecords.map((record) => {
              const currStatus = record.completedAt
                ? 'completed'
                : computeStatus(record.startDate, record.endDate, record.completedAt);

              const statusBadge = {
                completed: {
                  bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                  label: 'Completed',
                },
                in_progress: {
                  bg: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
                  label: 'In Progress',
                },
                upcoming: {
                  bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                  label: 'Upcoming',
                },
                overdue: {
                  bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                  label: 'Overdue',
                },
              }[currStatus];

              return (
                <div
                  key={record.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    record.completedAt
                      ? 'bg-slate-900/40 border-white/5 opacity-80'
                      : 'bg-slate-900/80 border-white/10 hover:border-brand-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(record)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                          record.completedAt
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-glow-emerald'
                            : 'border-slate-600 hover:border-brand-400 text-transparent'
                        }`}
                        title={
                          record.completedAt
                            ? 'Mark incomplete'
                            : 'Mark subject duration complete'
                        }
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate">
                            {record.subjectName}
                          </h4>
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadge.bg}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                          <span>{record.startDate}</span>
                          <span>➔</span>
                          <span>{record.endDate}</span>
                        </div>

                        {record.notes && (
                          <p className="text-xs text-slate-400 mt-1 italic">
                            "{record.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Duration Badges */}
                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <div className="text-right">
                        <span className="text-base font-black font-mono text-brand-400 block leading-none">
                          {record.durationDays} Days
                        </span>
                        {record.totalTargetHours && (
                          <span className="text-[10px] text-purple-300 font-mono">
                            ~{record.totalTargetHours}h total
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
