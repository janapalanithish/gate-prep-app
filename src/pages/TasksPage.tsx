/**
 * Dedicated Tasks & Schedule Page
 * High-impact UI for task management
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  Plus,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Bell,
  Clock as ClockIcon,
  X,
  CalendarPlus,
  Target,
  Sparkles,
} from 'lucide-react';
import { useStore, useActions } from '../lib/store';
import { DailyLog, DailyTaskItem } from '../lib/types';
import { formatDateKey, formatReadableDate, subDays, addDays } from '../lib/streakEngine';
import {
  initializeNotifications,
  scheduleTaskStartReminder,
  scheduleTaskEndReminder,
  cancelNotification,
  showImmediateNotification,
} from '../lib/notificationService';

type ReminderOption =
  | 'at_start'
  | '5min'
  | '10min'
  | '30min'
  | '1hour'
  | '1day';

const REMINDER_LABELS: Record<ReminderOption, string> = {
  at_start: 'At start time',
  '5min': '5 minutes before',
  '10min': '10 minutes before',
  '30min': '30 minutes before',
  '1hour': '1 hour before',
  '1day': '1 day before',
};

const REMINDER_OFFSET_MS: Record<ReminderOption, number> = {
  at_start: 0,
  '5min': 5 * 60 * 1000,
  '10min': 10 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
};

export default function TasksPage() {
  const appData = useStore();
  const actions = useActions();

  const todayKey = formatDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications().catch(console.error);
  }, []);

  // ---- Section: Current Log ----
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
      pomodoroSessions: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [appData.dailyLogs, selectedDate]);

  const [goalsInput, setGoalsInput] = useState('');
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  const completedCount = (currentLog.tasks || []).filter((t) => t.completed).length;
  const totalTasksCount = (currentLog.tasks || []).length;
  const isToday = selectedDate === todayKey;

  // Sync goals when date changes
  useEffect(() => {
    setGoalsInput(currentLog.goals || '');
    setIsEditingGoals(!currentLog.goals);
  }, [selectedDate, currentLog.goals]);

  // ---- Date navigation ----
  const goToPrevDay = () => setSelectedDate(formatDateKey(subDays(new Date(selectedDate), 1)));
  const goToNextDay = () => setSelectedDate(formatDateKey(addDays(new Date(selectedDate), 1)));
  const goToToday = () => setSelectedDate(todayKey);

  // ---- Goals ----
  const handleSaveGoals = () => {
    const updatedLog: DailyLog = {
      ...currentLog,
      goals: goalsInput.trim(),
      updatedAt: new Date().toISOString(),
    };
    actions.addOrUpdateDailyLog(updatedLog);
    setIsEditingGoals(false);
  };

  // ---- Task Manager State ----
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [snoozeModal, setSnoozeModal] = useState<{ taskId: string; title: string } | null>(null);
  const [snoozeDate, setSnoozeDate] = useState(formatDateKey(new Date()));

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskStartTime, setTaskStartTime] = useState('');
  const [taskEndTime, setTaskEndTime] = useState('');
  const [taskReminder, setTaskReminder] = useState<ReminderOption | ''>('');

  // ---- Add Task ----
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: DailyTaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: taskTitle.trim(),
      completed: false,
      subjectName: taskSubject.trim() || undefined,
      description: taskDescription.trim() || undefined,
      startTime: taskStartTime || undefined,
      endTime: taskEndTime || undefined,
    };

    const updatedLog: DailyLog = {
      ...currentLog,
      tasks: [...(currentLog.tasks || []), newTask],
      updatedAt: new Date().toISOString(),
    };
    actions.addOrUpdateDailyLog(updatedLog);

    // Request notification permission & schedule
    await initializeNotifications();

    const now = new Date();
    if (taskStartTime) {
      const [sh, sm] = taskStartTime.split(':').map(Number);
      const startTarget = new Date(now);
      startTarget.setHours(sh, sm, 0, 0);

      if (taskReminder && taskReminder !== 'at_start') {
        const reminderOffset = REMINDER_OFFSET_MS[taskReminder];
        const reminderTime = new Date(startTarget.getTime() - reminderOffset);
        if (reminderTime > now) {
          showImmediateNotification(
            `⏰ Reminder: ${taskTitle}`,
            REMINDER_LABELS[taskReminder] + ' — ' + taskTitle
          );
        }
      }

      if (startTarget > now) {
        await scheduleTaskStartReminder(
          newTask.id,
          taskTitle,
          startTarget
        );
      }
    }

    if (taskEndTime) {
      const [eh, em] = taskEndTime.split(':').map(Number);
      const endTarget = new Date(now);
      endTarget.setHours(eh, em, 0, 0);

      if (endTarget > now) {
        await scheduleTaskEndReminder(
          newTask.id,
          taskTitle,
          endTarget
        );
      }
    }

    // Reset form
    setTaskTitle('');
    setTaskDescription('');
    setTaskSubject('');
    setTaskStartTime('');
    setTaskEndTime('');
    setTaskReminder('');
    setShowTaskModal(false);
  };

  // ---- Toggle Task ----
  const handleToggleTask = async (taskId: string) => {
    const task = (currentLog.tasks || []).find((t) => t.id === taskId);
    const updatedTasks = (currentLog.tasks || []).map((t) => {
      if (t.id === taskId) {
        const next = !t.completed;
        return { ...t, completed: next, completedAt: next ? new Date().toISOString() : undefined };
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

    // If task marked complete, cancel any pending end-time notifications
    if (task && task.completed === false) {
      await cancelNotification(`start_${taskId}`);
      await cancelNotification(`end_${taskId}`);
    }
  };

  // ---- Snooze / Postpone ----
  const handleSnoozeTask = async (targetDate: string) => {
    if (!snoozeModal) return;
    const { taskId, title } = snoozeModal;

    // Cancel existing notifications
    await cancelNotification(`start_${taskId}`);
    await cancelNotification(`end_${taskId}`);

    // Remove from current day's tasks
    const updatedTasks = (currentLog.tasks || []).filter((t) => t.id !== taskId);
    const updatedLog: DailyLog = {
      ...currentLog,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    };
    actions.addOrUpdateDailyLog(updatedLog);

    // Add to target date
    const targetLog = appData.dailyLogs?.[targetDate] || {
      id: `log_${targetDate}`,
      date: targetDate,
      goals: '',
      notes: '',
      tasks: [],
      totalStudyMinutes: 0,
      completed: false,
      pomodoroSessions: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const originalTask = currentLog.tasks.find((t) => t.id === taskId);
    const migratedTask: DailyTaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      completed: false,
      subjectName: originalTask?.subjectName,
      description: originalTask?.description,
      startTime: originalTask?.startTime,
      endTime: originalTask?.endTime,
    };
    const migratedLog: DailyLog = {
      ...targetLog,
      tasks: [...(targetLog.tasks || []), migratedTask],
      updatedAt: new Date().toISOString(),
    };
    actions.addOrUpdateDailyLog(migratedLog);
    setSnoozeModal(null);

    showImmediateNotification(
      '📋 Task Postponed',
      `"${title}" moved to ${formatReadableDate(targetDate)}`
    );
  };

  const completionPercentage = totalTasksCount > 0
    ? Math.round((completedCount / totalTasksCount) * 100)
    : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ================================================================
          HEADER: Date Navigator & Today's Core Goal
      ================================================================ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center shadow-glow-brand">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Tasks &amp; Schedule</h2>
            <p className="text-[10px] text-slate-400">Plan your study goals & track daily tasks</p>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="glass-card rounded-2xl p-3 border border-white/5">
          <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-white/5">
            <button
              onClick={goToPrevDay}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center flex-1">
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
              <p className="text-[10px] text-slate-400">
                {completedCount}/{totalTasksCount} tasks completed
                {totalTasksCount > 0 && ` • ${completionPercentage}% done`}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="px-2.5 py-1 rounded-lg bg-brand-600/30 text-brand-300 text-[10px] font-semibold hover:bg-brand-600/50 transition-colors"
                >
                  Today
                </button>
              )}
              <button
                onClick={goToNextDay}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Today's Core Goal / Milestone Card */}
        <div className="glass-card rounded-2xl p-4 border border-brand-500/30 bg-gradient-to-br from-slate-900/90 via-indigo-950/30 to-slate-900/90 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {isToday ? "Today's Core Goal" : 'Day\'s Milestone'}
              </label>
              {!isEditingGoals && currentLog.goals && (
                <button
                  onClick={() => setIsEditingGoals(true)}
                  className="text-[10px] text-slate-400 hover:text-brand-300 font-semibold"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingGoals ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={goalsInput}
                  onChange={(e) => setGoalsInput(e.target.value)}
                  placeholder="e.g. Master Virtual Memory + Practice 20 Network PYQs..."
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
              <p className="text-xs sm:text-sm text-slate-200 italic font-medium">
                &ldquo;{currentLog.goals || 'No specific goal set for this day.'}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          PROMINENT + ADD TASK FAB
      ================================================================ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Today's Tasks</h3>
        </div>

        <button
          onClick={() => setShowTaskModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-900/30 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* ================================================================
          INTERACTIVE TASK CARDS
      ================================================================ */}
      <div className="space-y-2.5">
        {(!currentLog.tasks || currentLog.tasks.length === 0) ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-white/5">
            <Calendar className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">No tasks yet</h4>
            <p className="text-xs text-slate-400 mb-4">
              Add your first task for {formatReadableDate(selectedDate)} to get started.
            </p>
            <button
              onClick={() => setShowTaskModal(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Task
            </button>
          </div>
        ) : (
          currentLog.tasks.map((task) => (
            <div
              key={task.id}
              className={`glass-card rounded-2xl p-3.5 border transition-all ${
                task.completed
                  ? 'bg-emerald-950/20 border-emerald-500/30 opacity-75'
                  : 'border-white/10 hover:border-brand-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleTask(task.id)}
                  className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                    task.completed
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-glow-emerald'
                      : 'border-slate-600 hover:border-brand-400 text-transparent'
                  }`}
                  title={task.completed ? 'Completed' : 'Mark as complete'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                </button>

                {/* Task Details */}
                <div className="flex-1 min-w-0">
                  <span
                    onClick={() => handleToggleTask(task.id)}
                    className={`text-sm font-medium cursor-pointer select-none block leading-tight ${
                      task.completed
                        ? 'line-through text-slate-400 font-normal'
                        : 'text-white'
                    }`}
                  >
                    {task.title}
                  </span>

                  {task.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Time & Subject Badges */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {task.subjectName && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                        {task.subjectName}
                      </span>
                    )}
                    {task.startTime && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[10px] font-medium">
                        <ClockIcon className="w-3 h-3" />
                        {task.startTime}
                        {task.endTime && ` – ${task.endTime}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Snooze / Postpone Button */}
                {!task.completed && (
                  <button
                    type="button"
                    onClick={() => setSnoozeModal({ taskId: task.id, title: task.title })}
                    className="p-2 rounded-lg hover:bg-amber-500/20 text-slate-500 hover:text-amber-300 transition-colors shrink-0 border border-transparent hover:border-amber-500/30"
                    title="Snooze / Postpone to another date"
                  >
                    <CalendarPlus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Add Task FAB (Mobile) */}
      <button
        onClick={() => setShowTaskModal(true)}
        className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-400 hover:to-indigo-500 text-white shadow-2xl shadow-brand-900/50 flex items-center justify-center active:scale-95 transition-all"
        aria-label="Add Task"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ================================================================
          TASK CREATION MODAL
      ================================================================ */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                New Task
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Task Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Practice 20 Network Layer PYQs..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Add details, links, or notes..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subject <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <select
                  value={taskSubject}
                  onChange={(e) => setTaskSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select a subject</option>
                  {appData.subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={taskStartTime}
                    onChange={(e) => setTaskStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    End Time
                  </label>
                  <input
                    type="time"
                    value={taskEndTime}
                    onChange={(e) => setTaskEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Reminder */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  Reminder
                </label>
                <select
                  value={taskReminder}
                  onChange={(e) => setTaskReminder((e.target.value || '') as ReminderOption | '')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-brand-500"
                >
                  <option value="">No reminder</option>
                  {(Object.entries(REMINDER_LABELS) as [ReminderOption, string][]).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold transition-colors shadow-md shadow-brand-900/30"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          SNOOZE / POSTPONE MODAL
      ================================================================ */}
      {snoozeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 w-full max-w-sm border border-white/10 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-amber-400" />
                Postpone Task
              </h3>
              <button
                onClick={() => setSnoozeModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Move &ldquo;<span className="text-white font-medium">{snoozeModal.title}</span>&rdquo; to another date:
            </p>

            <input
              type="date"
              value={snoozeDate}
              onChange={(e) => setSnoozeDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500 mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setSnoozeModal(null)}
                className="flex-1 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSnoozeTask(snoozeDate)}
                className="flex-1 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-md"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
