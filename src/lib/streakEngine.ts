/**
 * Streak Calculation Engine for GATE Prep App
 * Accurately tracks daily consistency and handles reset conditions
 */

import { AppData, DailyLog, StreakInfo } from './types';

// Helper to format Date as YYYY-MM-DD
export function formatDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to parse YYYY-MM-DD
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Subtract days from date
export function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// Add days to date
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Format readable date
export function formatReadableDate(key: string): string {
  if (!key) return '';
  const date = parseDateKey(key);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Checks if a specific date has study activity
 */
export function isDateActive(dateKey: string, appData: AppData): { active: boolean; minutes: number; tasksDone: number; pomodoroSessions: number } {
  // Check daily logs
  const log = appData.dailyLogs?.[dateKey];
  let minutes = 0;
  let tasksDone = 0;
  let pomodoroSessions = 0;
  let hasActivity = false;

  if (log) {
    minutes = log.totalStudyMinutes || 0;
    tasksDone = (log.tasks || []).filter((t) => t.completed).length;
    pomodoroSessions = log.pomodoroSessions || 0;
    if (log.completed || minutes > 0 || tasksDone > 0 || pomodoroSessions > 0 || (log.goals && log.goals.trim().length > 0)) {
      hasActivity = true;
    }
  }

  // Check subtopic completion timestamps
  if (!hasActivity && appData.subjects) {
    for (const sub of appData.subjects) {
      for (const top of sub.topics || []) {
        for (const st of top.subtopics || []) {
          if (st.coveredAt && st.coveredAt.startsWith(dateKey)) {
            hasActivity = true;
            tasksDone += 1;
          }
          if (st.lastRevisedAt && st.lastRevisedAt.startsWith(dateKey)) {
            hasActivity = true;
            tasksDone += 1;
          }
        }
      }
    }
  }

  // Check duration records created on this date
  if (!hasActivity && appData.durationRecords) {
    for (const rec of appData.durationRecords) {
      if (rec.createdAt && rec.createdAt.startsWith(dateKey)) {
        hasActivity = true;
      }
    }
  }

  // Check mock test records on this date
  if (!hasActivity && appData.mockTestRecords) {
    for (const mock of appData.mockTestRecords) {
      if (mock.attemptDate === dateKey && mock.attempted) {
        hasActivity = true;
        tasksDone += 1;
      }
    }
  }

  return {
    active: hasActivity,
    minutes,
    tasksDone,
    pomodoroSessions,
  };
}

/**
 * Recalculates streak stats across all history
 */
export function calculateStreakStats(appData: AppData): StreakInfo {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const yesterdayKey = formatDateKey(subDays(today, 1));

  // Collect all unique active dates
  const activeDatesSet = new Set<string>();
  const activityHistory: Record<string, { active: boolean; minutes: number; tasksDone: number }> = {};

  // Check last 365 days
  for (let i = 0; i < 365; i++) {
    const d = subDays(today, i);
    const dKey = formatDateKey(d);
    const status = isDateActive(dKey, appData);
    if (status.active) {
      activeDatesSet.add(dKey);
      activityHistory[dKey] = status;
    }
  }

  const sortedDates = Array.from(activeDatesSet).sort();
  const totalActiveDays = sortedDates.length;

  let lastActiveDate: string | null = null;
  if (sortedDates.length > 0) {
    lastActiveDate = sortedDates[sortedDates.length - 1];
  }

  // Calculate current streak
  let currentStreak = 0;
  const isTodayActive = activeDatesSet.has(todayKey);
  const isYesterdayActive = activeDatesSet.has(yesterdayKey);

  if (isTodayActive) {
    // Count consecutive backward from today
    let checkDate = today;
    while (activeDatesSet.has(formatDateKey(checkDate))) {
      currentStreak += 1;
      checkDate = subDays(checkDate, 1);
    }
  } else if (isYesterdayActive) {
    // Today hasn't had activity yet, but yesterday had activity - streak is still alive!
    let checkDate = subDays(today, 1);
    while (activeDatesSet.has(formatDateKey(checkDate))) {
      currentStreak += 1;
      checkDate = subDays(checkDate, 1);
    }
  } else {
    // Missed yesterday and today - streak is 0
    currentStreak = 0;
  }

  // Calculate longest streak across history
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dKey of sortedDates) {
    const currDate = parseDateKey(dKey);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak += 1;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = currDate;
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    totalActiveDays,
    lastActiveDate,
    activityHistory,
  };
}

/**
 * Generate 12-week (84 days) calendar heatmap matrix
 *
 * Intensity is driven by task-completion counts to mirror the GitHub-style
 * activity matrix. The mapping:
 *  - 0 tasks   → 0 (empty, neutral background)
 *  - 1 task    → 1 (light green)
 *  - 2–3 tasks → 2 (medium green)
 *  - 4–5 tasks → 3 (strong green)
 *  - 6+ tasks  → 4 (deepest green)
 * Pomodoro sessions are added as a secondary activity boost.
 */
export interface HeatmapDay {
  dateKey: string;
  dayOfMonth: number;
  monthName: string;
  weekday: number; // 0: Sun, 1: Mon ...
  active: boolean;
  intensity: number; // 0 to 4 - darkens based on total activity points
  minutes: number;
  tasksDone: number;
  pomodoroSessions: number;
  isToday: boolean;
}

export function generateHeatmapGrid(appData: AppData, weeksCount = 12): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const today = new Date();
  const todayKey = formatDateKey(today);

  // Total days to generate
  const totalDays = weeksCount * 7;
  const startDate = subDays(today, totalDays - 1);

  for (let i = 0; i < totalDays; i++) {
    const d = addDays(startDate, i);
    const dKey = formatDateKey(d);
    const stats = isDateActive(dKey, appData);

    // Activity points: 1 per completed task + 1 per completed Pomodoro session.
    const activityPoints = (stats.tasksDone || 0) + (stats.pomodoroSessions || 0);

    // Map task completion count to intensity shade — GitHub-style green gradient.
    // Per spec: 0 tasks = default dark gray, 1 task = light green, 2+ tasks = progressively darker green.
    let intensity = 0;
    if (stats.active || activityPoints > 0) {
      if (activityPoints >= 6) intensity = 4;      // deepest green (6+ tasks)
      else if (activityPoints >= 4) intensity = 3; // strong green (4–5 tasks)
      else if (activityPoints >= 2) intensity = 2; // medium green (2–3 tasks)
      else if (activityPoints >= 1) intensity = 1; // light green (1 task)
    }

    days.push({
      dateKey: dKey,
      dayOfMonth: d.getDate(),
      monthName: d.toLocaleString('en-US', { month: 'short' }),
      weekday: d.getDay(),
      active: stats.active,
      intensity,
      minutes: stats.minutes,
      tasksDone: stats.tasksDone,
      pomodoroSessions: stats.pomodoroSessions || 0,
      isToday: dKey === todayKey,
    });
  }

  return days;
}

/**
 * Group the heatmap matrix into columns of 7 days (weeks) — used for
 * rendering month labels above specific week columns.
 */
export interface HeatmapWeek {
  weekIndex: number;
  startDay: HeatmapDay;
  days: HeatmapDay[];
  monthLabel: string | null;
}

export function groupHeatmapIntoWeeks(days: HeatmapDay[]): HeatmapWeek[] {
  const weeks: HeatmapWeek[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    if (!slice.length) continue;
    const first = slice[0];
    const prev = i > 0 ? days[i - 1] : null;
    // Show a month label whenever the month name changes between this week and the previous one,
    // and on the very first week.
    const showLabel =
      !prev || prev.monthName !== first.monthName;
    weeks.push({
      weekIndex: i / 7,
      startDay: first,
      days: slice,
      monthLabel: showLabel ? first.monthName : null,
    });
  }
  return weeks;
}
