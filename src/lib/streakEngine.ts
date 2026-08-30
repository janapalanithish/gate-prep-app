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
export function isDateActive(dateKey: string, appData: AppData): { active: boolean; minutes: number; tasksDone: number } {
  // Check daily logs
  const log = appData.dailyLogs?.[dateKey];
  let minutes = 0;
  let tasksDone = 0;
  let hasActivity = false;

  if (log) {
    minutes = log.totalStudyMinutes || 0;
    tasksDone = (log.tasks || []).filter((t) => t.completed).length;
    if (log.completed || minutes > 0 || tasksDone > 0 || (log.goals && log.goals.trim().length > 0)) {
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
 */
export interface HeatmapDay {
  dateKey: string;
  dayOfMonth: number;
  monthName: string;
  weekday: number; // 0: Sun, 1: Mon ...
  active: boolean;
  intensity: number; // 0 to 4
  minutes: number;
  tasksDone: number;
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

    let intensity = 0;
    if (stats.active) {
      if (stats.minutes >= 240 || stats.tasksDone >= 5) intensity = 4;
      else if (stats.minutes >= 120 || stats.tasksDone >= 3) intensity = 3;
      else if (stats.minutes >= 60 || stats.tasksDone >= 2) intensity = 2;
      else intensity = 1;
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
      isToday: dKey === todayKey,
    });
  }

  return days;
}
