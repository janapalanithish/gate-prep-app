import { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  Trophy,
  Zap,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useStore, useActions } from '../lib/store';
import { DailyLog, DailyTaskItem } from '../lib/types';
import {
  formatDateKey,
  formatReadableDate,
  subDays,
  addDays,
  calculateStreakStats,
  generateHeatmapGrid,
} from '../lib/streakEngine';
import PomodoroTimer from '../components/PomodoroTimer';
import { fireCelebrationConfetti } from '../lib/confetti';

export default function DailyActivityPage() {
  const appData = useStore();
  const actions = useActions();

  // Selected date for viewing / logging (defaults to today)
  const todayKey = formatDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);

  // New task input state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [newTaskMins, setNewTaskMins] = useState<number | ''>('');

  // Daily goals summary
  const [goalsInput, setGoalsInput] = useState('');
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  // Recalculate streak stats from history
  const streakStats = useMemo(() => {
    return calculateStreakStats(appData);
  }, [appData]);

  // Heatmap grid (12 weeks)
  const heatmapDays = useMemo(() => {
    return generateHeatmapGrid(appData, 14);
  }, [appData]);

  // Get current log for selected date
  const currentLog: DailyLog = useMemo(() => {
    const existing = appData.dailyLogs?.[selectedDate];
    if (existing) return existing;
    return {
      id: `log_${selectedDate}`,
      date: selectedDate,
      goals: '',
      notes: '',
      tasks: [],
      totalStudyMinutes: 0,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [appData.dailyLogs, selectedDate]);

  // Sync goals input when date changes
  useEffect(() => {
    setGoalsInput(currentLog.goals || '');
    setIsEditingGoals(!currentLog.goals);
  }, [selectedDate, currentLog.goals]);

  // Navigate dates
  const goToPrevDay = () => {
    const prev = subDays(new Date(selectedDate), 1);
    setSelectedDate(formatDateKey(prev));
  };

  const goToNextDay = () => {
    const next = addDays(new Date(selectedDate), 1);
    setSelectedDate(formatDateKey(next));
  };

  const goToToday = () => {
    setSelectedDate(todayKey);
  };

  // Add a task to the selected day
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: DailyTaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newTaskTitle.trim(),
      completed: false,
      subjectName: newTaskSubject.trim() || undefined,
      estimatedMinutes: typeof newTaskMins === 'number' && newTaskMins > 0 ? newTaskMins : undefined,
    };

    const updatedTasks = [...(currentLog.tasks || []), newTask];
    const updatedLog: DailyLog = {
      ...currentLog,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    };

    actions.addOrUpdateDailyLog(updatedLog);
    setNewTaskTitle('');
    setNewTaskSubject('');
    setNewTaskMins('');
  };

  // Toggle task completion
  const handleToggleTask = (taskId: string) => {
    const updatedTasks = (currentLog.tasks || []).map((t) => {
      if (t.id === taskId) {
        const nextState = !t.completed;
        if (nextState) fireCelebrationConfetti();
        return {
          ...t,
          completed: nextState,
          completedAt: nextState ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });

    const anyCompleted = updatedTasks.some((t) => t.completed);

    const updatedLog: DailyLog = {
      ...currentLog,
      tasks: updatedTasks,
      completed: anyCompleted || currentLog.totalStudyMinutes > 0,
      updatedAt: new Date().toISOString(),
    };

    actions.addOrUpdateDailyLog(updatedLog);
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = (currentLog.tasks || []).filter((t) => t.id !== taskId);
    const anyCompleted = updatedTasks.some((t) => t.completed);

    const updatedLog: DailyLog = {
      ...currentLog,
      tasks: updatedTasks,
      completed: anyCompleted || currentLog.totalStudyMinutes > 0,
      updatedAt: new Date().toISOString(),
    };

    actions.addOrUpdateDailyLog(updatedLog);
  };

  // Save Goals
  const handleSaveGoals = () => {
    const updatedLog: DailyLog = {
      ...currentLog,
      goals: goalsInput.trim(),
      updatedAt: new Date().toISOString(),
    };
    actions.addOrUpdateDailyLog(updatedLog);
    setIsEditingGoals(false);
  };

  // Pomodoro session complete handler
  const handlePomodoroComplete = (minutes: number) => {
    const newMinutes = (currentLog.totalStudyMinutes || 0) + minutes;
    const updatedLog: DailyLog = {
      ...currentLog,
      totalStudyMinutes: newMinutes,
      completed: true,
      updatedAt: new Date().toISOString(),
    };
    actions.addOrUpdateDailyLog(updatedLog);
    fireCelebrationConfetti();
  };

  // Calculate total completed tasks for selected date
  const completedCount = (currentLog.tasks || []).filter((t) => t.completed).length;
  const totalTasksCount = (currentLog.tasks || []).length;
  const isToday = selectedDate === todayKey;

  // Streak status message
  const streakMessage = useMemo(() => {
    if (streakStats.currentStreak === 0) {
      return "Start your streak today! Complete any task or study session.";
    }
    if (streakStats.currentStreak >= 30) {
      return "🔥 30+ Day Master Streak! Unstoppable consistency!";
    }
    if (streakStats.currentStreak >= 7) {
      return "⚡ 7+ Day Streak! You're building serious momentum!";
    }
    return `🔥 ${streakStats.currentStreak} Day Streak! Keep the fire burning!`;
  }, [streakStats.currentStreak]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* DYNAMIC STREAK BANNER */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-amber-500/30 bg-gradient-to-r from-slate-900/90 via-amber-950/30 to-slate-900/90 shadow-glow-amber relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center text-2xl font-black shadow-lg shadow-amber-500/30 shrink-0 animate-pulse-subtle">
              🔥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                  {streakStats.currentStreak}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Day Streak
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-medium mt-0.5">{streakMessage}</p>
            </div>
          </div>

          {/* Stats Chips */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-2 min-w-[70px]">
              <span className="text-base sm:text-lg font-mono font-bold text-amber-400 block">
                {streakStats.longestStreak}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                Longest
              </span>
            </div>
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-2 min-w-[70px]">
              <span className="text-base sm:text-lg font-mono font-bold text-emerald-400 block">
                {streakStats.totalActiveDays}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                Active Days
              </span>
            </div>
            <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-2 min-w-[70px]">
              <span className="text-base sm:text-lg font-mono font-bold text-brand-400 block">
                {Math.round(
                  Object.values(appData.dailyLogs || {}).reduce(
                    (acc, l) => acc + (l.totalStudyMinutes || 0),
                    0
                  ) / 60
                )}
                h
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                Hours
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVITY HEATMAP (GitHub-style calendar grid) */}
      <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Activity & Consistency Map (Last 14 Weeks)
          </h3>
          <span className="text-[10px] text-slate-400">
            {streakStats.totalActiveDays} Active Study Days
          </span>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-1">
          <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-[320px]">
            {heatmapDays.map((day) => {
              const isCurrent = day.dateKey === selectedDate;
              return (
                <button
                  key={day.dateKey}
                  onClick={() => setSelectedDate(day.dateKey)}
                  className={`w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 relative ${
                    isCurrent ? 'ring-2 ring-white z-10' : ''
                  } ${
                    day.intensity === 4
                      ? 'bg-emerald-400 shadow-glow-emerald'
                      : day.intensity === 3
                      ? 'bg-emerald-500'
                      : day.intensity === 2
                      ? 'bg-emerald-600/80'
                      : day.intensity === 1
                      ? 'bg-emerald-800/60'
                      : 'bg-slate-900 border border-white/[0.03]'
                  }`}
                  title={`${day.dateKey}: ${
                    day.active
                      ? `${day.tasksDone} tasks done, ${day.minutes} mins studied`
                      : 'No activity'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
          <span>Less active</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-white/10" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-800/60" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
          </div>
          <span>More active</span>
        </div>
      </div>

      {/* FOCUS STUDY TIMER (POMODORO) */}
      <PomodoroTimer onSessionComplete={handlePomodoroComplete} />

      {/* DAILY TASK LOG & GOAL SECTION */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
        {/* Date Selector Header */}
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-2xl border border-white/5">
          <button
            onClick={goToPrevDay}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-sm font-bold text-white">
                {formatReadableDate(selectedDate)}
              </h3>
              {isToday && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
                  Today
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {completedCount}/{totalTasksCount} tasks completed •{' '}
              {currentLog.totalStudyMinutes} mins studied
            </p>
          </div>

          <div className="flex items-center gap-1">
            {!isToday && (
              <button
                onClick={goToToday}
                className="px-2.5 py-1 rounded-xl bg-brand-600/30 text-brand-300 text-[10px] font-semibold hover:bg-brand-600/50 transition-colors"
              >
                Today
              </button>
            )}
            <button
              onClick={goToNextDay}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Daily Goal / Focus Input */}
        <div className="bg-slate-950/40 rounded-2xl p-3 border border-white/5">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Day's Core Goal / Milestone
            </label>
            {!isEditingGoals && currentLog.goals && (
              <button
                onClick={() => setIsEditingGoals(true)}
                className="text-[10px] text-slate-400 hover:text-brand-300"
              >
                Edit Goal
              </button>
            )}
          </div>

          {isEditingGoals ? (
            <div className="space-y-2">
              <input
                type="text"
                value={goalsInput}
                onChange={(e) => setGoalsInput(e.target.value)}
                placeholder="e.g. Master Virtual Memory + Practice 20 PYQs from Algorithms"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveGoals();
                }}
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveGoals}
                  className="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-semibold"
                >
                  Save Goal
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-200 italic">
              "{currentLog.goals || 'No specific goal set for this day.'}"
            </p>
          )}
        </div>

        {/* Add New Daily Task Form */}
        <form onSubmit={handleAddTask} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Add a study task (e.g. Solve 15 Network Layer PYQs)..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />

            <div className="flex gap-2">
              <select
                value={newTaskSubject}
                onChange={(e) => setNewTaskSubject(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select Subject (Optional)</option>
                {appData.subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="5"
                step="5"
                placeholder="Mins"
                value={newTaskMins}
                onChange={(e) =>
                  setNewTaskMins(e.target.value === '' ? '' : parseInt(e.target.value))
                }
                className="w-20 px-2 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white placeholder-slate-500 text-center focus:outline-none focus:border-brand-500"
              />

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-brand-900/30 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </form>

        {/* Task List */}
        <div className="space-y-2">
          {(!currentLog.tasks || currentLog.tasks.length === 0) ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No tasks entered for {selectedDate}. Use the form above to log tasks.
            </div>
          ) : (
            currentLog.tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  task.completed
                    ? 'bg-emerald-950/30 border-emerald-500/30'
                    : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-slate-600 hover:border-brand-400 text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <span
                      onClick={() => handleToggleTask(task.id)}
                      className={`text-xs font-medium cursor-pointer select-none block leading-tight ${
                        task.completed
                          ? 'line-through text-slate-400 font-normal'
                          : 'text-white'
                      }`}
                    >
                      {task.title}
                    </span>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      {task.subjectName && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold">
                          {task.subjectName}
                        </span>
                      )}
                      {task.estimatedMinutes && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" /> {task.estimatedMinutes}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition-colors shrink-0"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
