/**
 * Core Data Models for GATE Prep Cross-Platform Mobile Application
 * Designed for local persistent storage via Capacitor Preferences / LocalStorage
 */

// ============================================
// Branch & Syllabus Types
// ============================================

export type GateBranch =
  | 'CS'  // Computer Science & Information Technology
  | 'DA'  // Data Science & Artificial Intelligence
  | 'EC'  // Electronics & Communication Engineering
  | 'EE'  // Electrical Engineering
  | 'ME'  // Mechanical Engineering
  | 'CE'  // Civil Engineering
  | 'IN'  // Instrumentation Engineering
  | 'CH'  // Chemical Engineering
  | 'PI'  // Production & Industrial Engineering
  | 'CUSTOM';

export interface GateBranchInfo {
  code: GateBranch;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
}

export const GATE_BRANCHES: GateBranchInfo[] = [
  {
    code: 'CS',
    name: 'Computer Science & Information Technology',
    shortName: 'GATE CS / IT',
    description: 'Algorithms, Data Structures, OS, DBMS, Networks, TOC, Compiler, COA, Math & Aptitude',
    icon: '💻',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    code: 'DA',
    name: 'Data Science & Artificial Intelligence',
    shortName: 'GATE DA',
    description: 'Probability, Statistics, Linear Algebra, Python & DS, Machine Learning, AI, DBMS, Warehouse',
    icon: '🤖',
    color: 'from-purple-500 to-pink-600',
  },
  {
    code: 'EC',
    name: 'Electronics & Communication Engineering',
    shortName: 'GATE EC',
    description: 'Signals & Systems, Communications, Digital Circuits, Analog Circuits, Electromagnetics, Control',
    icon: '📡',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    code: 'EE',
    name: 'Electrical Engineering',
    shortName: 'GATE EE',
    description: 'Electrical Machines, Power Systems, Power Electronics, Control Systems, Circuits, Signals',
    icon: '⚡',
    color: 'from-amber-500 to-orange-600',
  },
  {
    code: 'ME',
    name: 'Mechanical Engineering',
    shortName: 'GATE ME',
    description: 'Thermodynamics, Fluid Mechanics, Strength of Materials, Manufacturing, Theory of Machines',
    icon: '⚙️',
    color: 'from-red-500 to-amber-600',
  },
  {
    code: 'CE',
    name: 'Civil Engineering',
    shortName: 'GATE CE',
    description: 'Structural Engineering, Geotechnical, Water Resources, Transportation, Environmental',
    icon: '🏗️',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    code: 'IN',
    name: 'Instrumentation Engineering',
    shortName: 'GATE IN',
    description: 'Sensors & Industrial Instrumentation, Optics, Signals, Control, Analog & Digital',
    icon: '🔬',
    color: 'from-teal-500 to-emerald-600',
  },
  {
    code: 'CH',
    name: 'Chemical Engineering',
    shortName: 'GATE CH',
    description: 'Process Calculations, Thermodynamics, Fluid & Particle Mechanics, Heat & Mass Transfer, Reaction',
    icon: '🧪',
    color: 'from-green-500 to-teal-600',
  },
  {
    code: 'PI',
    name: 'Production & Industrial Engineering',
    shortName: 'GATE PI',
    description: 'Manufacturing Analysis, Metrology, Operations Research, Quality & Reliability, Industrial Engineering',
    icon: '🏭',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    code: 'CUSTOM',
    name: 'Custom Branch / Other Stream',
    shortName: 'Custom Syllabus',
    description: 'Define your own subjects, topics, and subtopics from scratch',
    icon: '✏️',
    color: 'from-slate-600 to-slate-800',
  },
];

// Subtopic item with Dual Checklist tracking
export interface Subtopic {
  id: string;
  name: string;
  // 1) General Topic Covering Checklist (Initial Study)
  covered: boolean;
  coveredAt?: string; // ISO date string
  // 2) Revision Checklist (Multi-round revision tracking)
  revisionRounds: number; // 0, 1, 2, 3, ...
  revisionTarget: number; // default 3
  lastRevisedAt?: string; // ISO date string
  // Extra metadata
  notes?: string;
  isImportant?: boolean;
}

export interface Topic {
  id: string;
  name: string;
  subtopics: Subtopic[];
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  topics: Topic[];
  isCustom?: boolean;
  color?: string;
}

// ============================================
// Page 2: Daily Activity & Streak Types
// ============================================

export interface DailyTaskItem {
  id: string;
  title: string;
  completed: boolean;
  subjectName?: string;
  estimatedMinutes?: number;
  completedAt?: string;
}

export interface DailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  goals: string; // Summary goal of the day
  notes?: string; // Reflection / Notes
  tasks: DailyTaskItem[];
  totalStudyMinutes: number;
  completed: boolean; // Marked active for streak
  createdAt: string;
  updatedAt: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  activityHistory: Record<string, { active: boolean; minutes: number; tasksDone: number }>; // YYYY-MM-DD -> stats
}

// ============================================
// Page 3: Subject Duration Calculator Types
// ============================================

export type DurationStatus = 'upcoming' | 'in_progress' | 'completed' | 'overdue';

export interface DurationRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  durationDays: number; // Calculated total days
  plannedHoursPerDay?: number;
  totalTargetHours?: number;
  notes?: string;
  status: DurationStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Page 4: Weekly NPTEL / Mock Test Log Types
// ============================================

export type MockCategory = 'nptel' | 'full_mock' | 'subject_test' | 'topic_test';

export interface MockTestRecord {
  id: string;
  testName: string;
  category: MockCategory;
  weekNumber: number;
  attemptDate: string; // YYYY-MM-DD
  attempted: boolean; // Yes / No
  marksScored: number; // e.g. 68.33
  totalMarks: number;  // e.g. 100
  questionsAttempted: number;
  totalQuestions: number;
  incorrectQuestions: number;
  // Calculated metrics
  percentage: number;
  accuracy: number; // Correct / Attempted * 100
  negativeMarksLost?: number;
  // Detailed notes & analysis fields
  weakTopics: string; // Weak topics & conceptual gaps
  keyMistakes: string; // Silly mistakes & calculation errors
  improvementPlan: string; // Action items for next test
  timeManagementNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Global App State & Settings
// ============================================

export type ActivePage = 'checklist' | 'daily' | 'duration' | 'mocktest' | 'settings';

export interface UserSettings {
  targetExamYear: number; // 2026, 2027
  examDate: string; // YYYY-MM-DD (e.g. 2027-02-06)
  dailyStudyHourGoal: number; // e.g. 6
  revisionRoundsDefault: number; // e.g. 3
  theme: 'dark' | 'light' | 'amoled';
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface AppData {
  version: string;
  selectedBranch: GateBranch | null;
  customBranchName: string;
  subjects: Subject[];
  dailyLogs: Record<string, DailyLog>; // YYYY-MM-DD -> DailyLog
  streakInfo: StreakInfo;
  durationRecords: DurationRecord[];
  mockTestRecords: MockTestRecord[];
  settings: UserSettings;
  firstLaunchCompleted: boolean;
  lastBackupDate: string | null;
}

// ============================================
// Progress Stats Computation
// ============================================

export interface OverallProgressStats {
  totalSubtopics: number;
  coveredSubtopics: number;
  coveragePercentage: number;
  totalRevisionTarget: number;
  completedRevisions: number;
  revisionPercentage: number;
  fullyRevisedSubtopics: number; // completed all target revisions
  subjectStats: {
    subjectId: string;
    subjectName: string;
    totalSubtopics: number;
    coveredSubtopics: number;
    coveragePercent: number;
    revisedSubtopics: number;
    revisionPercent: number;
  }[];
}
