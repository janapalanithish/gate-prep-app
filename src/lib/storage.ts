/**
 * Local Persistent Storage Layer
 * Utilizes @capacitor/preferences for native mobile apps and localStorage for web preview.
 */

import { Preferences } from '@capacitor/preferences';
import { AppData, GateBranch, UserSettings, OverallProgressStats } from './types';
import { getFreshSyllabusForBranch } from './syllabusData';

const STORAGE_KEY = 'gate_prep_master_data_v1';

// Default initial user settings
export const DEFAULT_SETTINGS: UserSettings = {
  targetExamYear: 2027,
  examDate: '2027-02-06', // Typical GATE exam Saturday
  dailyStudyHourGoal: 6,
  revisionRoundsDefault: 3,
  theme: 'dark',
  soundEnabled: true,
  hapticsEnabled: true,
};

// Initial default state
export function createDefaultAppData(branch: GateBranch = 'CS', customName = ''): AppData {
  return {
    version: '1.0.0',
    selectedBranch: branch,
    customBranchName: customName,
    subjects: branch === 'CUSTOM' ? [] : getFreshSyllabusForBranch(branch),
    dailyLogs: {},
    streakInfo: {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
      lastActiveDate: null,
      activityHistory: {},
    },
    durationRecords: [],
    mockTestRecords: [],
    settings: DEFAULT_SETTINGS,
    firstLaunchCompleted: false,
    lastBackupDate: null,
  };
}

/**
 * Saves entire AppData persistently
 */
export async function saveAppData(data: AppData): Promise<void> {
  try {
    const serialized = JSON.stringify(data);
    await Preferences.set({
      key: STORAGE_KEY,
      value: serialized,
    });
    // Secondary fallback to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch (error) {
    console.error('Error saving app data to persistent storage:', error);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }
}

/**
 * Loads entire AppData from persistent storage
 */
export async function loadAppData(): Promise<AppData | null> {
  try {
    const res = await Preferences.get({ key: STORAGE_KEY });
    if (res && res.value) {
      return JSON.parse(res.value) as AppData;
    }
    // Check localStorage fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      const local = window.localStorage.getItem(STORAGE_KEY);
      if (local) {
        return JSON.parse(local) as AppData;
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading app data from persistent storage:', error);
    if (typeof window !== 'undefined' && window.localStorage) {
      const local = window.localStorage.getItem(STORAGE_KEY);
      if (local) {
        return JSON.parse(local) as AppData;
      }
    }
    return null;
  }
}

/**
 * Export JSON backup string
 */
export async function exportDataAsJson(data: AppData): Promise<string> {
  return JSON.stringify(data, null, 2);
}

/**
 * Import and validate JSON backup
 */
export async function importDataFromJson(jsonString: string): Promise<AppData> {
  const parsed = JSON.parse(jsonString) as AppData;
  if (!parsed.subjects || !Array.isArray(parsed.subjects)) {
    throw new Error('Invalid GATE Prep backup file: missing subjects structure.');
  }
  await saveAppData(parsed);
  return parsed;
}

/**
 * Computes dual progress stats across all subjects
 */
export function calculateOverallProgress(data: AppData): OverallProgressStats {
  let totalSubtopics = 0;
  let coveredSubtopics = 0;
  let totalRevisionTarget = 0;
  let completedRevisions = 0;
  let fullyRevisedSubtopics = 0;

  const subjectStats = (data.subjects || []).map((sub) => {
    let subTotal = 0;
    let subCovered = 0;
    let subTargetRev = 0;
    let subDoneRev = 0;
    let subFullyRev = 0;

    (sub.topics || []).forEach((top) => {
      (top.subtopics || []).forEach((st) => {
        subTotal += 1;
        if (st.covered) subCovered += 1;
        const target = st.revisionTarget || 3;
        subTargetRev += target;
        subDoneRev += Math.min(st.revisionRounds || 0, target);
        if ((st.revisionRounds || 0) >= target) {
          subFullyRev += 1;
        }
      });
    });

    totalSubtopics += subTotal;
    coveredSubtopics += subCovered;
    totalRevisionTarget += subTargetRev;
    completedRevisions += subDoneRev;
    fullyRevisedSubtopics += subFullyRev;

    const coveragePercent = subTotal > 0 ? Math.round((subCovered / subTotal) * 100) : 0;
    const revisionPercent = subTargetRev > 0 ? Math.round((subDoneRev / subTargetRev) * 100) : 0;

    return {
      subjectId: sub.id,
      subjectName: sub.name,
      totalSubtopics: subTotal,
      coveredSubtopics: subCovered,
      coveragePercent,
      revisedSubtopics: subFullyRev,
      revisionPercent,
    };
  });

  const coveragePercentage = totalSubtopics > 0 ? Math.round((coveredSubtopics / totalSubtopics) * 100) : 0;
  const revisionPercentage = totalRevisionTarget > 0 ? Math.round((completedRevisions / totalRevisionTarget) * 100) : 0;

  return {
    totalSubtopics,
    coveredSubtopics,
    coveragePercentage,
    totalRevisionTarget,
    completedRevisions,
    revisionPercentage,
    fullyRevisedSubtopics,
    subjectStats,
  };
}
