import { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { useStore, useActions } from '../lib/store';
import { MockTestRecord, MockCategory } from '../lib/types';
import { formatDateKey, formatReadableDate } from '../lib/streakEngine';
import { fireCelebrationConfetti } from '../lib/confetti';

const CATEGORY_LABELS: Record<MockCategory, { label: string; color: string }> = {
  nptel: { label: 'NPTEL', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  full_mock: { label: 'Full Mock', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  subject_test: { label: 'Subject Test', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  topic_test: { label: 'Topic Test', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
};

interface ExpandedState {
  [id: string]: boolean;
}

export default function MockTestLogPage() {
  const appData = useStore();
  const actions = useActions();

  const [showAddForm, setShowAddForm] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [filterCategory, setFilterCategory] = useState<MockCategory | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState({
    testName: '',
    category: 'full_mock' as MockCategory,
    weekNumber: 1,
    attemptDate: formatDateKey(new Date()),
    attempted: true,
    marksScored: 0,
    totalMarks: 100,
    questionsAttempted: 0,
    totalQuestions: 65,
    incorrectQuestions: 0,
    weakTopics: '',
    keyMistakes: '',
    improvementPlan: '',
    timeManagementNotes: '',
  });

  // Filtered records
  const filteredRecords = useMemo(() => {
    const records = appData.mockTestRecords || [];
    if (filterCategory === 'all') return records;
    return records.filter((r) => r.category === filterCategory);
  }, [appData.mockTestRecords, filterCategory]);

  // Stats summary
  const stats = useMemo(() => {
    const records = appData.mockTestRecords || [];
    if (records.length === 0) return null;
    const attempted = records.filter((r) => r.attempted);
    const totalMarks = attempted.reduce((sum, r) => sum + r.percentage, 0);
    const avgScore = attempted.length ? totalMarks / attempted.length : 0;
    const bestScore = attempted.length ? Math.max(...attempted.map((r) => r.percentage)) : 0;
    const totalAttempts = attempted.length;
    const totalQuestionsAttempted = attempted.reduce((sum, r) => sum + r.questionsAttempted, 0);
    const totalIncorrect = attempted.reduce((sum, r) => sum + r.incorrectQuestions, 0);
    const overallAccuracy = totalQuestionsAttempted
      ? ((totalQuestionsAttempted - totalIncorrect) / totalQuestionsAttempted) * 100
      : 0;
    return {
      totalTests: records.length,
      totalAttempts,
      avgScore: avgScore.toFixed(1),
      bestScore: bestScore.toFixed(1),
      totalQuestionsAttempted,
      totalIncorrect,
      overallAccuracy: overallAccuracy.toFixed(1),
    };
  }, [appData.mockTestRecords]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const percentage = formData.totalMarks > 0
      ? (formData.marksScored / formData.totalMarks) * 100
      : 0;
    const accuracy = formData.questionsAttempted > 0
      ? ((formData.questionsAttempted - formData.incorrectQuestions) / formData.questionsAttempted) * 100
      : 0;

    const newRecord: MockTestRecord = {
      id: `mock_${Date.now()}`,
      testName: formData.testName,
      category: formData.category,
      weekNumber: formData.weekNumber,
      attemptDate: formData.attemptDate,
      attempted: formData.attempted,
      marksScored: formData.marksScored,
      totalMarks: formData.totalMarks,
      questionsAttempted: formData.questionsAttempted,
      totalQuestions: formData.totalQuestions,
      incorrectQuestions: formData.incorrectQuestions,
      percentage,
      accuracy,
      weakTopics: formData.weakTopics,
      keyMistakes: formData.keyMistakes,
      improvementPlan: formData.improvementPlan,
      timeManagementNotes: formData.timeManagementNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    actions.addMockTestRecord(newRecord);
    fireCelebrationConfetti();
    setShowAddForm(false);
    setFormData({
      testName: '',
      category: 'full_mock',
      weekNumber: 1,
      attemptDate: formatDateKey(new Date()),
      attempted: true,
      marksScored: 0,
      totalMarks: 100,
      questionsAttempted: 0,
      totalQuestions: 65,
      incorrectQuestions: 0,
      weakTopics: '',
      keyMistakes: '',
      improvementPlan: '',
      timeManagementNotes: '',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this test record?')) {
      actions.deleteMockTestRecord(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Mock Test Log</h2>
            <p className="text-xs text-slate-400">Track your NPTEL, mock tests & subject tests</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all shadow-lg shadow-brand-900/30 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Log Test
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Tests', value: stats.totalTests, icon: FileText, color: 'text-white' },
            { label: 'Attempts', value: stats.totalAttempts, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Avg Score', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Best Score', value: `${stats.bestScore}%`, icon: Target, color: 'text-amber-400' },
            { label: 'Accuracy', value: `${stats.overallAccuracy}%`, icon: BarChart3, color: 'text-purple-400' },
            { label: 'Total Qs', value: stats.totalQuestionsAttempted, icon: BookOpen, color: 'text-cyan-400' },
          ].map((stat, i) => (
            <div
              key={i}
              className="glass-panel rounded-2xl p-3 border border-white/10 text-center"
            >
              <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-slate-400 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all' as const, label: 'All' },
          { id: 'full_mock' as const, label: 'Full Mock' },
          { id: 'subject_test' as const, label: 'Subject Test' },
          { id: 'topic_test' as const, label: 'Topic Test' },
          { id: 'nptel' as const, label: 'NPTEL' },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setFilterCategory(filter.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterCategory === filter.id
                ? 'bg-brand-600 text-white'
                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="glass-panel rounded-3xl p-5 border border-white/10 space-y-4"
        >
          <h3 className="text-sm font-bold text-brand-300 uppercase tracking-wider">
            Log New Test
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Test Name</label>
              <input
                type="text"
                name="testName"
                value={formData.testName}
                onChange={handleFormChange}
                placeholder="e.g. GATE 2025 CS Full Mock"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="full_mock">Full Mock Test</option>
                <option value="subject_test">Subject Test</option>
                <option value="topic_test">Topic Test</option>
                <option value="nptel">NPTEL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Week Number</label>
              <input
                type="number"
                name="weekNumber"
                value={formData.weekNumber}
                onChange={handleFormChange}
                min={1}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Date</label>
              <input
                type="date"
                name="attemptDate"
                value={formData.attemptDate}
                onChange={handleFormChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Marks Scored</label>
              <input
                type="number"
                name="marksScored"
                value={formData.marksScored}
                onChange={handleFormChange}
                step="0.01"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Total Marks</label>
              <input
                type="number"
                name="totalMarks"
                value={formData.totalMarks}
                onChange={handleFormChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Questions Attempted</label>
              <input
                type="number"
                name="questionsAttempted"
                value={formData.questionsAttempted}
                onChange={handleFormChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Total Questions</label>
              <input
                type="number"
                name="totalQuestions"
                value={formData.totalQuestions}
                onChange={handleFormChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Incorrect Questions</label>
              <input
                type="number"
                name="incorrectQuestions"
                value={formData.incorrectQuestions}
                onChange={handleFormChange}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Weak Topics</label>
              <textarea
                name="weakTopics"
                value={formData.weakTopics}
                onChange={handleFormChange}
                placeholder="List topics where you struggled..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Key Mistakes</label>
              <textarea
                name="keyMistakes"
                value={formData.keyMistakes}
                onChange={handleFormChange}
                placeholder="Silly mistakes, calculation errors..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">Improvement Plan</label>
              <textarea
                name="improvementPlan"
                value={formData.improvementPlan}
                onChange={handleFormChange}
                placeholder="Action items for next test..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all"
            >
              Save Test Record
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 border border-white/10 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 font-medium">No test records yet</p>
          <p className="text-xs text-slate-500 mt-1">Click "Log Test" to add your first entry</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const isExpanded = expanded[record.id];
            const categoryInfo = CATEGORY_LABELS[record.category];
            const scoreColor =
              record.percentage >= 75
                ? 'text-emerald-400'
                : record.percentage >= 50
                ? 'text-amber-400'
                : 'text-red-400';

            return (
              <div
                key={record.id}
                className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(record.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xl font-bold ${scoreColor}`}>
                      {record.percentage.toFixed(1)}%
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{record.testName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${categoryInfo.color}`}
                        >
                          {categoryInfo.label}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatReadableDate(record.attemptDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-300">
                        {record.questionsAttempted}/{record.totalQuestions} Qs
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Acc: {record.accuracy.toFixed(1)}%
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white/5 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-slate-400">Score</p>
                        <p className={`text-sm font-bold ${scoreColor}`}>
                          {record.marksScored}/{record.totalMarks}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-slate-400">Accuracy</p>
                        <p className="text-sm font-bold text-blue-400">
                          {record.accuracy.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-slate-400">Incorrect</p>
                        <p className="text-sm font-bold text-red-400">
                          {record.incorrectQuestions}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2.5 text-center">
                        <p className="text-xs text-slate-400">Week</p>
                        <p className="text-sm font-bold text-slate-300">
                          {record.weekNumber}
                        </p>
                      </div>
                    </div>

                    {record.weakTopics && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">
                          Weak Topics
                        </p>
                        <p className="text-xs text-slate-300 bg-red-500/5 rounded-lg p-2">
                          {record.weakTopics}
                        </p>
                      </div>
                    )}
                    {record.keyMistakes && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold mb-1">
                          Key Mistakes
                        </p>
                        <p className="text-xs text-slate-300 bg-amber-500/5 rounded-lg p-2">
                          {record.keyMistakes}
                        </p>
                      </div>
                    )}
                    {record.improvementPlan && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                          Improvement Plan
                        </p>
                        <p className="text-xs text-slate-300 bg-emerald-500/5 rounded-lg p-2">
                          {record.improvementPlan}
                        </p>
                      </div>
                    )}
                    {record.timeManagementNotes && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-1">
                          Time Management
                        </p>
                        <p className="text-xs text-slate-300 bg-cyan-500/5 rounded-lg p-2">
                          {record.timeManagementNotes}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
