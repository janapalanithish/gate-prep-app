import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  Plus,
  Zap,
  ChevronLeft,
  ChevronRight,
  Bell,
  Clock as ClockIcon,
  X,
  Trash2,
  CalendarPlus,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useStore, useActions } from '../lib/store';
import { DailyLog, DailyTaskItem } from '../lib/types';
import {
  formatDateKey,
  formatReadableDate,
  subDays,
  addDays,
  generateHeatmapGrid,
  groupHeatmapIntoWeeks,
} from '../lib/streakEngine';
import PomodoroTimer from '../components/PomodoroTimer';
import { fireCelebrationConfetti } from '../lib/confetti';
import {
  initializeNotifications,
  scheduleTaskStartReminder,
  scheduleTaskEndReminder,
  cancelTaskNotifications,
  showImmediateNotification,
  isPermissionGranted,
} from '../lib/notificationService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Notification Helper (uses Capacitor notificationService with web fallback)
// ---------------------------------------------------------------------------
function scheduleWebNotification(title: string, body: string, delayMs: number) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') doSchedule();
    });
    return;
  }
  doSchedule();

  function doSchedule() {
    setTimeout(() => {
      new Notification(title, { body, icon: '🎓' });
    }, Math.max(0, delayMs));
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function DailyActivityPage() {
  const appData = useStore();
  const actions = useActions();

  const todayKey = formatDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);

  // ---- Section 1 shared ----
  const heatmapDays = useMemo(() => generateHeatmapGrid(appData, 14), [appData]);
  const heatmapWeeks = useMemo(() => groupHeatmapIntoWeeks(heatmapDays), [heatmapDays]);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(0);

  // ---- Section 2 shared ----
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
  const totalActivityPoints =
    completedCount +
    (currentLog.pomodoroSessions || 0) +
    Math.floor(pomodoroMinutes / 25);
  const isToday = selectedDate === todayKey;

  // Sync goals when date changes
  useEffect(() => {
    setGoalsInput(currentLog.goals || '');
    setIsEditingGoals(!currentLog.goals);
    setPomodoroMinutes(0);
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

  // ---- Pomodoro ----
  const handlePomodoroComplete = (minutes: number) => {
    const updatedLog: DailyLog = {
      ...currentLog,
      totalStudyMinutes: (currentLog.totalStudyMinutes || 0) + minutes,
      completed: true,
      pomodoroSessions: (currentLog.pomodoroSessions || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    actions.addOrUpdateDailyLog(updatedLog);
    setPomodoroMinutes((m) => m + minutes);
    fireCelebrationConfetti();
  };

  // ---- Task Manager State ----
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [snoozeModal, setSnoozeModal] = useState<{ taskId: string; title: string } | null>(null);
  const [snoozeDate, setSnoozeDate] = useState(formatDateKey(new Date()));

  // Task highlight (notification deep-link) — Complete / Reschedule options.
  const [highlightedTask, setHighlightedTask] = useState<
    | { taskId: string; taskTitle: string; date: string }
    | null
  >(null);
  // Non-blocking toast for notification permission state.
  const [permToast, setPermToast] = useState<string | null>(null);
  useEffect(() => {
    if (!permToast) return;
    const t = setTimeout(() => setPermToast(null), 5000);
    return () => clearTimeout(t);
  }, [permToast]);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskStartTime, setTaskStartTime] = useState('');
  const [taskEndTime, setTaskEndTime] = useState('');
  const [taskReminder, setTaskReminder] = useState<ReminderOption | ''>('');

  // End-time notification timer refs
  const endTimeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Schedule end-time completion check
  useEffect(() => {
    // Clear old timers
    endTimeTimers.current.forEach((t) => clearTimeout(t));
    endTimeTimers.current.clear();

    const now = new Date();
    (currentLog.tasks || []).forEach((task) => {
      if (task.completed || !task.startTime) return;

      const [h, m] = task.startTime.split(':').map(Number);
      const [eh, em] = (task.endTime || task.startTime).split(':').map(Number);
      const target = new Date(now);
      target.setHours(eh, em, 0, 0);

      // If end time already passed today, skip
      if (target.getTime() <= now.getTime()) return;

      const delay = target.getTime() - now.getTime();
      const tid = setTimeout(() => {
        fireEndTimePrompt(task.id, task.title);
      }, delay);
      endTimeTimers.current.set(task.id, tid);
    });

    return () => {
      endTimeTimers.current.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLog.tasks]);

  const fireEndTimePrompt = (taskId: string, taskTitle: string) => {
    scheduleWebNotification(
      `⏰ Time's up!`,
      `Did you complete "${taskTitle}"?`,
      0
    );
  };

  // Listen for notification taps (deep-links from background).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        taskId: string;
        taskTitle: string;
        date?: string;
      };
      if (!detail?.taskId) return;
      const targetDate = detail.date || todayKey;
      setSelectedDate(targetDate);
      setHighlightedTask({ taskId: detail.taskId, taskTitle: detail.taskTitle, date: targetDate });
    };
    window.addEventListener('gate-prep:task-notification-tap', handler);
    return () => window.removeEventListener('gate-prep:task-notification-tap', handler);
  }, [todayKey]);

  // ---- Add Task ----
  const handleAddTask = (e: React.FormEvent) => {
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

    // Schedule start & end alarms using native notification engine.
    const now = new Date();
    if (taskStartTime) {
      const [sh, sm] = taskStartTime.split(':').map(Number);
      const startTarget = new Date(now);
      startTarget.setHours(sh, sm, 0, 0);
      if (startTarget.getTime() > now.getTime()) {
        scheduleTaskStartReminder(
          newTask.id,
          taskTitle.trim(),
          startTarget,
          taskSubject.trim() || undefined,
        ).catch(() => {});
      }
    }
    if (taskEndTime) {
      const [eh, em] = taskEndTime.split(':').map(Number);
      const endTarget = new Date(now);
      endTarget.setHours(eh, em, 0, 0);
      // If end time already passed today, skip scheduling (task already done or overdue).
      if (endTarget.getTime() > now.getTime()) {
        scheduleTaskEndReminder(newTask.id, taskTitle.trim(), endTarget).catch(() => {});
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
  const handleToggleTask = (taskId: string) => {
    const updatedTasks = (currentLog.tasks || []).map((t) => {
      if (t.id === taskId) {
        const next = !t.completed;
        if (next) {
          fireCelebrationConfetti();
          // Clear any pending end-time timer
          const tid = endTimeTimers.current.get(taskId);
          if (tid) {
            clearTimeout(tid);
            endTimeTimers.current.delete(taskId);
          }
        }
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
  };

  // ---- Snooze / Postpone ----
  const handleSnoozeTask = (targetDate: string) => {
    if (!snoozeModal) return;
    const { taskId, title } = snoozeModal;

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
    const migratedTask: DailyTaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      completed: false,
      subjectName: currentLog.tasks.find((t) => t.id === taskId)?.subjectName,
      description: currentLog.tasks.find((t) => t.id === taskId)?.description,
    };
    const migratedLog: DailyLog = {
      ...targetLog,
      tasks: [...(targetLog.tasks || []), migratedTask],
      updatedAt: new Date().toISOString(),
    };
    actions.addOrUpdateDailyLog(migratedLog);
    setSnoozeModal(null);
    scheduleWebNotification(
      `📋 Task Postponed`,
      `"${title}" moved to ${formatReadableDate(targetDate)}`,
      0
    );
  };

  // ---- Delete Task ----
  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    // Cancel BOTH scheduled start and end notifications for this task.
    await cancelTaskNotifications(taskId);
    const tid = endTimeTimers.current.get(taskId);
    if (tid) {
      clearTimeout(tid);
      endTimeTimers.current.delete(taskId);
    }
    const updatedTasks = (currentLog.tasks || []).filter((t) => t.id !== taskId);
    const updatedLog: DailyLog = {
      ...currentLog,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    };
    actions.addOrUpdateDailyLog(updatedLog);
    scheduleWebNotification(`🗑️ Task Deleted`, `"${taskTitle}" removed from schedule.`, 0);
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ================================================================
          SECTION 1: Daily Activity & Focus
      ================================================================ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Daily Activity &amp; Focus</h2>
        </div>

        {/* Activity Heatmap */}
        <div className="glass-card rounded-2xl p-4 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Consistency Heatmap (Last 14 Weeks)
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] text-slate-400">
                {totalActivityPoints} activity pts
              </span>
              <span className="text-[10px] text-slate-400">
                {heatmapDays.filter((d) => d.active).length} Active Days
              </span>
            </div>
          </div>

          {/* GitHub-style heatmap: weeks as columns, month labels above grid */}
          <div className="overflow-x-auto pb-1">
            {/* Month labels row */}
            <div className="flex gap-1 mb-0.5 min-w-[320px]">
              {heatmapWeeks.map((week, wi) => (
                <div
                  key={wi}
                  className="w-3.5 h-3.5 flex items-center justify-center"
                >
                  {week.monthLabel && (
                    <span className="text-[9px] text-slate-500 font-semibold leading-none select-none whitespace-nowrap">
                      {week.monthLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day grid: each column is one week (top=Sunday, bottom=Saturday) */}
            <div className="flex flex-col gap-1">
              {/* Row labels: weekday abbreviations */}
              <div className="flex gap-1 min-w-[320px]">
                {heatmapWeeks.map((week, wi) => (
                  <div key={wi} className="w-3.5 flex flex-col gap-1">
                    {week.days.map((day) => {
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
                              ? `${day.tasksDone} task${day.tasksDone !== 1 ? 's' : ''} + ${day.pomodoroSessions || 0} pomodoro${(day.pomodoroSessions || 0) !== 1 ? 's' : ''}`
                              : 'No activity'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <span className="text-slate-500">0 pts</span>
              <span className="text-slate-400">= Low</span>
            </span>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-white/10" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-800/60" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            </div>
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">High = </span>
              <span className="text-slate-500">8+ pts</span>
            </span>
          </div>
        </div>

        {/* Focus Study Timer */}
        <PomodoroTimer onSessionComplete={handlePomodoroComplete} />
      </div>

      {/* ================================================================
          SECTION 2: Tasks & Schedule Manager
      ================================================================ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tasks &amp; Schedule</h2>
          </div>

          {/* TickTick-style + Add Task button */}
          <button
            onClick={async () => {
              // Proactively request notification permission when opening Add Task modal.
              if (!isPermissionGranted()) {
                const ok = await initializeNotifications();
                if (!ok) {
                  setPermToast('Enable notifications in Android Settings to receive reminders.');
                }
              }
              setShowTaskModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-900/30 transition-colors active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        </div>

        {/* Tasks Card */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">

          {/* Date Navigation */}
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
                {completedCount}/{totalTasksCount} tasks &bull; {(currentLog.pomodoroSessions || 0) + Math.floor(pomodoroMinutes / 25)} focus sessions &bull; {currentLog.totalStudyMinutes} min
              </p>
            </div>

            <div className="flex items-center gap-1">
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="px-2.5 py-1 rounded-xl bg-brand-600/30 text-brand-300 text-[10px] font-semibold hover:bg-brand-600/50 transition-colors"
                >
                  Jump to Today
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

          {/* Day's Core Goal */}
          <div className="bg-slate-950/40 rounded-2xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Day&apos;s Core Goal / Milestone
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
              <p className="text-xs text-slate-200 italic">
                &ldquo;{currentLog.goals || 'No specific goal set for this day.'}&rdquo;
              </p>
            )}
          </div>

          {/* Task List */}
          <div className="space-y-2">
            {(!currentLog.tasks || currentLog.tasks.length === 0) ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No tasks for {formatReadableDate(selectedDate)}. Tap &ldquo;+ Add Task&rdquo; above.
              </div>
            ) : (
              currentLog.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                    task.completed
                      ? 'bg-emerald-950/30 border-emerald-500/30'
                      : 'bg-slate-950/50 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
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

                      {task.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 flex-wrap">
                        {task.subjectName && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold">
                            {task.subjectName}
                          </span>
                        )}
                        {task.startTime && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <ClockIcon className="w-3 h-3" />
                            {task.startTime}
                            {task.endTime && ` – ${task.endTime}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Snooze / Postpone button (only for incomplete tasks) */}
                  {!task.completed && (
                    <button
                      type="button"
                      onClick={() => setSnoozeModal({ taskId: task.id, title: task.title })}
                      className="p-1.5 rounded-lg hover:bg-amber-500/20 text-slate-500 hover:text-amber-300 transition-colors shrink-0"
                      title="Snooze / Postpone"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id, task.title)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
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

      {/* ================================================================
          TASK CREATION MODAL
      ================================================================ */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-400" />
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
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-colors shadow-md shadow-brand-900/30"
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

      {/* ================================================================
          HIGHLIGHTED TASK MODAL (notification deep-link)
          Shows [Complete] / [Reschedule] actions when user taps a
          notification from the background.
      ================================================================ */}
      {highlightedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 w-full max-w-sm border border-brand-500/40 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-brand-300 flex items-center gap-2">
                🔔 Task Reminder
              </h3>
              <button
                onClick={() => setHighlightedTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-200 mb-5 leading-snug">
              &ldquo;<span className="text-white font-semibold">{highlightedTask.taskTitle}</span>&rdquo;
            </p>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  handleToggleTask(highlightedTask.taskId);
                  setHighlightedTask(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2"
              >
                <Check className="w-3.5 h-3.5" />
                Complete
              </button>
              <button
                type="button"
                onClick={() => {
                  setSnoozeModal({ taskId: highlightedTask.taskId, title: highlightedTask.taskTitle });
                  setHighlightedTask(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-md shadow-amber-900/30 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          NON-BLOCKING PERMISSION TOAST (notification permission)
      ================================================================ */}
      {permToast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up pointer-events-none flex justify-center">
          <div className="glass-panel rounded-xl px-4 py-3 border border-amber-500/30 bg-slate-900/90 max-w-sm text-xs text-amber-200 shadow-xl">
            {permToast}
          </div>
        </div>
      )}
    </div>
  );
}
