/**
 * Reactive State Store (Zustand-style) for GATE Prep App
 * Uses React hooks + external subscriptions for cross-platform state management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Subject, Subtopic, DailyLog, DurationRecord, MockTestRecord, GateBranch, UserSettings, OverallProgressStats } from './types';
import { saveAppData, loadAppData, createDefaultAppData, calculateOverallProgress, DEFAULT_SETTINGS } from './storage';
import { getFreshSyllabusForBranch } from './syllabusData';
import { formatDateKey, subDays } from './streakEngine';

// ============================================
// Store Implementation
// ============================================

type Listener = (state: AppData) => void;

class GatePrepStore {
  private state: AppData;
  private listeners = new Set<Listener>();

  constructor(initial: AppData) {
    this.state = initial;
  }

  getState(): AppData {
    return this.state;
  }

  setState(updater: AppData | ((prev: AppData) => AppData)): void {
    if (typeof updater === 'function') {
      this.state = (updater as (prev: AppData) => AppData)(this.state);
    } else {
      this.state = updater;
    }
    this.persist();
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private persist(): void {
    saveAppData(this.state).catch(console.error);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.state));
  }

  // ---------- Actions ----------

  readonly actions = {
    // Branch & Syllabus
    hydrate: (data: AppData) => {
      this.setState(data);
    },

    selectBranch: (branch: GateBranch, customName = '') => {
      const subjects = branch === 'CUSTOM' ? [] : getFreshSyllabusForBranch(branch);
      this.setState((prev) => ({
        ...prev,
        selectedBranch: branch,
        customBranchName: customName,
        subjects,
        firstLaunchCompleted: true,
      }));
    },

    resetBranch: () => {
      this.setState((prev) => ({
        ...prev,
        selectedBranch: null,
        customBranchName: '',
        subjects: [],
      }));
    },

    // Subject CRUD
    addSubject: (subject: Subject) => {
      this.setState((prev) => ({
        ...prev,
        subjects: [...prev.subjects, subject],
      }));
    },

    updateSubject: (subjectId: string, updates: Partial<Subject>) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) => (s.id === subjectId ? { ...s, ...updates } : s)),
      }));
    },

    deleteSubject: (subjectId: string) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.filter((s) => s.id !== subjectId),
      }));
    },

    // Topic CRUD
    addTopic: (subjectId: string, topic: import('./types').Topic) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId ? { ...s, topics: [...s.topics, topic] } : s
        ),
      }));
    },

    updateTopic: (subjectId: string, topicId: string, updates: Partial<import('./types').Topic>) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? { ...s, topics: s.topics.map((t) => (t.id === topicId ? { ...t, ...updates } : t)) }
            : s
        ),
      }));
    },

    deleteTopic: (subjectId: string, topicId: string) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId ? { ...s, topics: s.topics.filter((t) => t.id !== topicId) } : s
        ),
      }));
    },

    // Subtopic CRUD
    addSubtopic: (subjectId: string, topicId: string, subtopic: Subtopic) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                topics: s.topics.map((t) =>
                  t.id === topicId ? { ...t, subtopics: [...t.subtopics, subtopic] } : t
                ),
              }
            : s
        ),
      }));
    },

    updateSubtopic: (subjectId: string, topicId: string, subtopicId: string, updates: Partial<Subtopic>) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                topics: s.topics.map((t) =>
                  t.id === topicId
                    ? {
                        ...t,
                        subtopics: t.subtopics.map((st) =>
                          st.id === subtopicId ? { ...st, ...updates } : st
                        ),
                      }
                    : t
                ),
              }
            : s
        ),
      }));
    },

    deleteSubtopic: (subjectId: string, topicId: string, subtopicId: string) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                topics: s.topics.map((t) =>
                  t.id === topicId
                    ? { ...t, subtopics: t.subtopics.filter((st) => st.id !== subtopicId) }
                    : t
                ),
              }
            : s
        ),
      }));
    },

    // Toggle covered status
    toggleSubtopicCovered: (subjectId: string, topicId: string, subtopicId: string) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                topics: s.topics.map((t) =>
                  t.id === topicId
                    ? {
                        ...t,
                        subtopics: t.subtopics.map((st) =>
                          st.id === subtopicId
                            ? {
                                ...st,
                                covered: !st.covered,
                                coveredAt: !st.covered ? new Date().toISOString() : undefined,
                              }
                            : st
                        ),
                      }
                    : t
                ),
              }
            : s
        ),
      }));
    },

    // Increment revision round
    incrementRevision: (subjectId: string, topicId: string, subtopicId: string) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                topics: s.topics.map((t) =>
                  t.id === topicId
                    ? {
                        ...t,
                        subtopics: t.subtopics.map((st) =>
                          st.id === subtopicId
                            ? {
                                ...st,
                                revisionRounds: Math.min((st.revisionRounds || 0) + 1, 99),
                                lastRevisedAt: new Date().toISOString(),
                              }
                            : st
                        ),
                      }
                    : t
                ),
              }
            : s
        ),
      }));
    },

    // Reset revision rounds
    resetRevisions: (subjectId: string, topicId: string, subtopicId: string) => {
      this.setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                topics: s.topics.map((t) =>
                  t.id === topicId
                    ? {
                        ...t,
                        subtopics: t.subtopics.map((st) =>
                          st.id === subtopicId
                            ? { ...st, revisionRounds: 0, lastRevisedAt: undefined }
                            : st
                        ),
                      }
                    : t
                ),
              }
            : s
        ),
      }));
    },

    // Daily Activity
    addOrUpdateDailyLog: (log: DailyLog) => {
      this.setState((prev) => ({
        ...prev,
        dailyLogs: { ...prev.dailyLogs, [log.date]: log },
      }));
      // Also update streak
      this.actions.updateStreak(log.date);
    },

    // Increment Pomodoro session count for a specific date
    incrementPomodoroSession: (date: string) => {
      this.setState((prev) => {
        const existingLog = prev.dailyLogs[date];
        if (!existingLog) {
          return prev;
        }
        return {
          ...prev,
          dailyLogs: {
            ...prev.dailyLogs,
            [date]: {
              ...existingLog,
              pomodoroSessions: (existingLog.pomodoroSessions || 0) + 1,
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });
      this.actions.updateStreak(date);
    },

    deleteDailyLog: (date: string) => {
      this.setState((prev) => {
        const logs = { ...prev.dailyLogs };
        delete logs[date];
        return { ...prev, dailyLogs: logs };
      });
    },

    updateStreak: (date: string) => {
      this.setState((prev) => {
        const today = date; // The date of the completed activity
        const yesterday = formatDateKey(subDays(new Date(today), 1));
        const current = prev.streakInfo;

        // Prevent past/future date leakage: only count if date is actually today or a valid recent active date.
        // We update activityHistory precisely for this date, not arbitrarily.
        if (current.lastActiveDate === today) {
          // Already recorded for today; just update task counts rather than double-counting streak.
          // Update activity history entry with accurate counts from the log.
          const log = prev.dailyLogs[today];
          const completedTasks = (log?.tasks || []).filter((t) => t.completed).length;
          return {
            ...prev,
            streakInfo: {
              ...current,
              activityHistory: {
                ...current.activityHistory,
                [today]: {
                  active: true,
                  minutes: log?.totalStudyMinutes || 0,
                  tasksDone: completedTasks,
                },
              },
            },
          };
        }

        const isConsecutive =
          current.lastActiveDate === null ||
          current.lastActiveDate === yesterday;

        const newStreak = isConsecutive ? current.currentStreak + 1 : 1;
        const newLongest = Math.max(newStreak, current.longestStreak);

        const log = prev.dailyLogs[today];
        const completedTasks = (log?.tasks || []).filter((t) => t.completed).length;

        return {
          ...prev,
          streakInfo: {
            ...current,
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastActiveDate: today,
            totalActiveDays: current.totalActiveDays + 1,
            activityHistory: {
              ...current.activityHistory,
              [today]: {
                active: true,
                minutes: log?.totalStudyMinutes || 0,
                tasksDone: completedTasks,
              },
            },
          },
        };
      });
    },

    // Duration Records
    addDurationRecord: (record: DurationRecord) => {
      this.setState((prev) => ({
        ...prev,
        durationRecords: [...prev.durationRecords, record],
      }));
    },

    updateDurationRecord: (recordId: string, updates: Partial<DurationRecord>) => {
      this.setState((prev) => ({
        ...prev,
        durationRecords: prev.durationRecords.map((r) => (r.id === recordId ? { ...r, ...updates } : r)),
      }));
    },

    deleteDurationRecord: (recordId: string) => {
      this.setState((prev) => ({
        ...prev,
        durationRecords: prev.durationRecords.filter((r) => r.id !== recordId),
      }));
    },

    // Mock Test Records
    addMockTestRecord: (record: MockTestRecord) => {
      this.setState((prev) => ({
        ...prev,
        mockTestRecords: [...prev.mockTestRecords, record],
      }));
    },

    updateMockTestRecord: (recordId: string, updates: Partial<MockTestRecord>) => {
      this.setState((prev) => ({
        ...prev,
        mockTestRecords: prev.mockTestRecords.map((r) => (r.id === recordId ? { ...r, ...updates } : r)),
      }));
    },

    deleteMockTestRecord: (recordId: string) => {
      this.setState((prev) => ({
        ...prev,
        mockTestRecords: prev.mockTestRecords.filter((r) => r.id !== recordId),
      }));
    },

    // Settings
    updateSettings: (updates: Partial<UserSettings>) => {
      this.setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...updates },
      }));
    },

    // Reset all data
    resetAllData: (branch?: GateBranch, customName?: string) => {
      const newBranch = branch || 'CS';
      const newData = createDefaultAppData(newBranch, customName || '');
      this.setState(newData);
    },
  };
}

// Singleton instance
let storeInstance: GatePrepStore | null = null;

export function getStore(): GatePrepStore {
  if (!storeInstance) {
    storeInstance = new GatePrepStore(createDefaultAppData());
  }
  return storeInstance;
}

// For use outside of React components
export const store = {
  getState: () => getStore().getState(),
  setState: (updater: AppData | ((prev: AppData) => AppData)) => getStore().setState(updater),
  subscribe: (listener: Listener) => getStore().subscribe(listener),
  actions: getStore().actions,
};

// ============================================
// React Hooks
// ============================================

/**
 * useStore - main hook for accessing app state
 */
export function useStore<T = AppData>(selector?: (state: AppData) => T): T {
  const [state, setState] = useState<AppData>(() => getStore().getState());

  useEffect(() => {
    if (selector) {
      // Use selector-based subscription
      let prev = selector(getStore().getState());
      const listener = (newState: AppData) => {
        const next = selector(newState);
        if (next !== prev) {
          prev = next;
          setState(newState);
        }
      };
      const unsub = getStore().subscribe(listener);
      return () => unsub();
    } else {
      const unsub = getStore().subscribe(setState);
      return () => unsub();
    }
  }, [selector]);

  return (selector ? selector(state) : state) as T;
}

/**
 * useProgressStats - computes and returns overall progress stats
 */
export function useProgressStats(): OverallProgressStats {
  return useStore((state) => calculateOverallProgress(state));
}

/**
 * useActions - returns the store actions
 */
export function useActions() {
  return getStore().actions;
}
