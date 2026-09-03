import { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Edit3,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Check,
  RotateCcw,
  BookOpen,
  ArrowUpDown,
  ListFilter,
  SlidersHorizontal,
  Smartphone,
  Download,
  ArrowUpRight,
} from 'lucide-react';
import { useStore, useActions, useProgressStats } from '../lib/store';
import { Subject, Topic, Subtopic, GateBranch, GATE_BRANCHES } from '../lib/types';
import GateCountdown from '../components/GateCountdown';
import { fireCelebrationConfetti } from '../lib/confetti';

interface ChecklistHubPageProps {
  onEditBranch?: () => void;
}

type FilterOption = 'all' | 'uncovered' | 'covered' | 'needs_revision' | 'fully_revised';

export default function ChecklistHubPage({ onEditBranch }: ChecklistHubPageProps) {
  const appData = useStore();
  const actions = useActions();
  const stats = useProgressStats();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Modal states for adding custom items
  const [modalState, setModalState] = useState<{
    open: boolean;
    type: 'subject' | 'topic' | 'subtopic';
    subjectId?: string;
    topicId?: string;
    editTarget?: { id: string; name: string };
  }>({ open: false, type: 'subject' });

  // Initialize first subject expanded
  useEffect(() => {
    if (appData.subjects.length > 0 && Object.keys(expandedSubjects).length === 0) {
      const initial: Record<string, boolean> = {};
      initial[appData.subjects[0].id] = true;
      setExpandedSubjects(initial);
    }
  }, [appData.subjects.length]);

  const currentBranchInfo = useMemo(() => {
    return (
      GATE_BRANCHES.find((b) => b.code === appData.selectedBranch) || {
        code: 'CUSTOM',
        name: appData.customBranchName || 'Custom Syllabus',
        shortName: appData.customBranchName || 'Custom Branch',
        description: 'Custom Study Plan',
        icon: '📚',
        color: 'from-slate-600 to-slate-800',
      }
    );
  }, [appData.selectedBranch, appData.customBranchName]);

  // Expand / Collapse all
  const expandAll = () => {
    const subs: Record<string, boolean> = {};
    const tops: Record<string, boolean> = {};
    appData.subjects.forEach((s) => {
      subs[s.id] = true;
      (s.topics || []).forEach((t) => {
        tops[t.id] = true;
      });
    });
    setExpandedSubjects(subs);
    setExpandedTopics(tops);
  };

  const collapseAll = () => {
    setExpandedSubjects({});
    setExpandedTopics({});
  };

  // Filtered and searched subjects
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return appData.subjects
      .map((sub) => {
        const matchingTopics = (sub.topics || [])
          .map((top) => {
            const matchingSubtopics = (top.subtopics || []).filter((st) => {
              // Search query check
              const matchesSearch =
                !q ||
                st.name.toLowerCase().includes(q) ||
                top.name.toLowerCase().includes(q) ||
                sub.name.toLowerCase().includes(q);

              if (!matchesSearch) return false;

              // Filter check
              if (filter === 'uncovered') return !st.covered;
              if (filter === 'covered') return st.covered;
              if (filter === 'needs_revision') {
                const target = st.revisionTarget || 3;
                return (st.revisionRounds || 0) < target;
              }
              if (filter === 'fully_revised') {
                const target = st.revisionTarget || 3;
                return (st.revisionRounds || 0) >= target;
              }

              return true;
            });

            return {
              ...top,
              subtopics: matchingSubtopics,
            };
          })
          .filter((top) => top.subtopics.length > 0 || !q);

        return {
          ...sub,
          topics: matchingTopics,
        };
      })
      .filter((sub) => sub.topics.some((t) => t.subtopics.length > 0) || !q);
  }, [appData.subjects, searchQuery, filter]);

  // Handle Celebrate if 100% covered
  const prevCoverageRef = useState(stats.coveragePercentage);
  useEffect(() => {
    if (stats.coveragePercentage === 100 && stats.totalSubtopics > 0 && prevCoverageRef[0] !== 100) {
      fireCelebrationConfetti();
    }
  }, [stats.coveragePercentage, stats.totalSubtopics]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Exam Countdown & Branch Indicator */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <GateCountdown
            targetDateStr={appData.settings.examDate}
            examYear={appData.settings.targetExamYear}
          />
        </div>
      </div>

      {/* Branch Badge Bar */}
      <div className="glass-card rounded-2xl p-3 border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{currentBranchInfo.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {currentBranchInfo.shortName}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                Active Branch
              </span>
            </div>
            <p className="text-[11px] text-slate-400 block w-full pr-4 mt-0.5 break-words leading-snug max-w-full truncate" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {currentBranchInfo.description}
            </p>
          </div>
        </div>

        {onEditBranch && (
          <button
            onClick={onEditBranch}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-brand-300 font-semibold transition-colors flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Switch</span>
          </button>
        )}
      </div>

      {/* APK Download Banner */}
      <a
        href="https://github.com/janapalanithish/gate-prep-app/releases/latest/download/app-debug.apk"
        target="_blank"
        rel="noopener noreferrer"
        download="gate-prep-app.apk"
        className="block glass-card rounded-2xl p-4 border border-brand-500/20 bg-gradient-to-r from-brand-900/30 via-slate-900/40 to-brand-900/30 hover:from-brand-900/50 hover:to-brand-900/40 transition-all shadow-lg shadow-brand-900/10 group"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center shadow-glow-brand shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-brand-200 transition-colors">
                Download GATE Prep Android App
              </h3>
              <p className="text-[10px] text-slate-400">
                APK v1.0.17 · Direct download · No Play Store required · Native notifications included
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-brand-600 text-white font-bold shadow-md shadow-brand-900/30">
              APK
            </span>
            <span className="text-[10px] font-semibold text-brand-300 flex items-center gap-1 group-hover:text-brand-200">
              Download <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </a>

      {/* TOP DUAL PROGRESS BARS (Initial Coverage & Revision) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* 1) Initial Study / General Covering Checklist Bar */}
        <div className="glass-card rounded-2xl p-4 border border-brand-500/30 bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-slate-900/90 shadow-glow-brand relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-300">
                  General Topic Covering
                </h3>
                <p className="text-[10px] text-slate-400">Initial Study Completion</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-brand-400 leading-none">
                {stats.coveragePercentage}%
              </span>
            </div>
          </div>

          {/* Progress track */}
          <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-brand-600 via-indigo-500 to-brand-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${stats.coveragePercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-medium">
            <span>
              <strong className="text-brand-300 font-mono">{stats.coveredSubtopics}</strong> of{' '}
              <strong className="text-white font-mono">{stats.totalSubtopics}</strong> Subtopics Covered
            </span>
            <span>
              {stats.totalSubtopics - stats.coveredSubtopics > 0
                ? `${stats.totalSubtopics - stats.coveredSubtopics} remaining`
                : '🎉 100% Covered!'}
            </span>
          </div>
        </div>

        {/* 2) Revision Checklist Bar */}
        <div className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-gradient-to-br from-slate-900/90 via-emerald-950/40 to-slate-900/90 shadow-glow-emerald relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Revision Tracker
                </h3>
                <p className="text-[10px] text-slate-400">Multi-Round Revision Mastery</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400 leading-none">
                {stats.revisionPercentage}%
              </span>
            </div>
          </div>

          {/* Progress track */}
          <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${stats.revisionPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-medium">
            <span>
              <strong className="text-emerald-300 font-mono">{stats.completedRevisions}</strong> of{' '}
              <strong className="text-white font-mono">{stats.totalRevisionTarget}</strong> Target Rounds
            </span>
            <span>
              <strong className="text-amber-400 font-mono">{stats.fullyRevisedSubtopics}</strong> Subtopics (3+ Rev)
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH, FILTER, AND CONTROLS BAR */}
      <div className="glass-card rounded-2xl p-3 border border-white/5 space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subjects, topics, subtopics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Expand / Collapse & Add Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={expandAll}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
              title="Expand All"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors"
              title="Collapse All"
            >
              Collapse
            </button>
            <button
              onClick={() => setModalState({ open: true, type: 'subject' })}
              className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Subject</span>
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <span className="text-slate-500 font-semibold uppercase text-[10px] shrink-0 mr-1">Filter:</span>
          {(
            [
              { id: 'all', label: 'All Items' },
              { id: 'uncovered', label: '⏳ Need Coverage' },
              { id: 'covered', label: '✅ Covered' },
              { id: 'needs_revision', label: '🔄 Need Revision' },
              { id: 'fully_revised', label: '⭐ Mastered (3+ Rev)' },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                filter === chip.id
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-950/40 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* SINGLE-VIEW UNIFIED CHECKLIST HUB */}
      {filteredSubjects.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-white/5">
          <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">No topics match the filter</h4>
          <p className="text-xs text-slate-400 mb-3">Try clearing your search query or filter options.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilter('all');
            }}
            className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubjects.map((subject) => {
            const isSubExpanded = !!expandedSubjects[subject.id];
            const subTotal = (subject.topics || []).reduce((a, t) => a + (t.subtopics?.length || 0), 0);
            const subCovered = (subject.topics || []).reduce(
              (a, t) => a + (t.subtopics || []).filter((st) => st.covered).length,
              0
            );
            const subCoveragePct = subTotal > 0 ? Math.round((subCovered / subTotal) * 100) : 0;

            const subTargetRev = subTotal * 3;
            const subDoneRev = (subject.topics || []).reduce(
              (a, t) => a + (t.subtopics || []).reduce((acc, st) => acc + Math.min(st.revisionRounds || 0, 3), 0),
              0
            );
            const subRevPct = subTargetRev > 0 ? Math.round((subDoneRev / subTargetRev) * 100) : 0;

            return (
              <div
                key={subject.id}
                className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-lg transition-all"
              >
                {/* Subject Header Accordion */}
                <div
                  onClick={() =>
                    setExpandedSubjects((prev) => ({ ...prev, [subject.id]: !prev[subject.id] }))
                  }
                  className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors border-b border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-10 rounded-full shrink-0"
                      style={{
                        backgroundColor: subject.color || '#6366f1',
                        boxShadow: `0 0 10px ${subject.color || '#6366f1'}66`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          {subject.name}
                        </h3>
                        {subject.code && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                            {subject.code}
                          </span>
                        )}
                        {subject.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                            Custom
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-medium">
                        <span>
                          {subCovered}/{subTotal} Covered ({subCoveragePct}%)
                        </span>
                        <span>•</span>
                        <span>Rev {subRevPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions and expand arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalState({
                          open: true,
                          type: 'topic',
                          subjectId: subject.id,
                        });
                      }}
                      className="px-2 py-1 rounded-lg bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 text-[11px] font-semibold flex items-center gap-1 border border-brand-500/30 transition-colors"
                      title="Add Topic to Subject"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden sm:inline">Topic</span>
                    </button>

                    <div className="text-slate-400">
                      {isSubExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Subject Dual Progress Track */}
                <div className="grid grid-cols-2 gap-1 bg-slate-950/60 px-4 py-1.5 border-b border-white/5 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-brand-400 font-semibold">Covg:</span>
                    <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${subCoveragePct}%` }}
                      />
                    </div>
                    <span className="font-mono text-slate-300">{subCoveragePct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-semibold">Rev:</span>
                    <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${subRevPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-slate-300">{subRevPct}%</span>
                  </div>
                </div>

                {/* Topics List */}
                {isSubExpanded && (
                  <div className="p-3 sm:p-4 space-y-3 bg-slate-950/30">
                    {subject.topics.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500">
                        No topics yet. Click "+ Topic" above to add one.
                      </div>
                    ) : (
                      subject.topics.map((topic) => {
                        const isTopExpanded = expandedTopics[topic.id] !== false; // default open
                        const topTotal = (topic.subtopics || []).length;
                        const topCovered = (topic.subtopics || []).filter((s) => s.covered).length;

                        return (
                          <div
                            key={topic.id}
                            className="rounded-xl bg-slate-900/70 border border-white/5 overflow-hidden"
                          >
                            {/* Topic Row Header */}
                            <div
                              onClick={() =>
                                setExpandedTopics((prev) => ({
                                  ...prev,
                                  [topic.id]: !isTopExpanded,
                                }))
                              }
                              className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-white/[0.04]"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                                <h4 className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[60vw] sm:max-w-none">
                                  {topic.name}
                                </h4>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                                  {topCovered}/{topTotal}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalState({
                                      open: true,
                                      type: 'subtopic',
                                      subjectId: subject.id,
                                      topicId: topic.id,
                                    });
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                                  title="Add Subtopic"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Subtopic</span>
                                </button>

                                {/* Delete removed per system-wide management */}

                                <div className="text-slate-400">
                                  {isTopExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Subtopics Checklist Items */}
                            {isTopExpanded && (
                              <div className="p-2 sm:p-2.5 space-y-1.5 bg-slate-950/40">
                                {topic.subtopics.length === 0 ? (
                                  <div className="text-center py-2 text-[11px] text-slate-500 italic">
                                    No subtopics. Click "+ Subtopic" to add.
                                  </div>
                                ) : (
                                  topic.subtopics.map((st) => (
                                    <SubtopicChecklistItem
                                      key={st.id}
                                      subtopic={st}
                                      subjectId={subject.id}
                                      topicId={topic.id}
                                    />
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalState.open && (
        <CreateEditItemModal
          type={modalState.type}
          subjectId={modalState.subjectId}
          topicId={modalState.topicId}
          onClose={() => setModalState({ open: false, type: 'subject' })}
          onSave={(name) => {
            if (modalState.type === 'subject') {
              const newSub: Subject = {
                id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name,
                code: name.substring(0, 4).toUpperCase(),
                topics: [],
                isCustom: true,
                color: '#8b5cf6',
              };
              actions.addSubject(newSub);
            } else if (modalState.type === 'topic' && modalState.subjectId) {
              const newTop: Topic = {
                id: `top_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name,
                subtopics: [],
              };
              actions.addTopic(modalState.subjectId, newTop);
            } else if (
              modalState.type === 'subtopic' &&
              modalState.subjectId &&
              modalState.topicId
            ) {
              const newSt: Subtopic = {
                id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name,
                covered: false,
                revisionRounds: 0,
                revisionTarget: 3,
              };
              actions.addSubtopic(modalState.subjectId, modalState.topicId, newSt);
            }
            setModalState({ open: false, type: 'subject' });
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Subtopic Checklist Item Component (DUAL CHECKLIST: COVERAGE + REVISION)
// ----------------------------------------------------------------------
function SubtopicChecklistItem({
  subtopic,
  subjectId,
  topicId,
}: {
  subtopic: Subtopic;
  subjectId: string;
  topicId: string;
}) {
  const actions = useActions();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(subtopic.notes || '');

  const isFullyRevised = (subtopic.revisionRounds || 0) >= (subtopic.revisionTarget || 3);

  const handleToggleCovered = () => {
    actions.toggleSubtopicCovered(subjectId, topicId, subtopic.id);
  };

  const handleIncrementRevision = () => {
    actions.incrementRevision(subjectId, topicId, subtopic.id);
    if ((subtopic.revisionRounds || 0) + 1 >= (subtopic.revisionTarget || 3)) {
      fireCelebrationConfetti();
    }
  };

  const handleResetRevision = () => {
    actions.resetRevisions(subjectId, topicId, subtopic.id);
  };

  const handleSaveNotes = () => {
    actions.updateSubtopic(subjectId, topicId, subtopic.id, { notes: notesText });
    setEditingNotes(false);
  };

  return (
    <div
      className={`p-2.5 rounded-xl border transition-all ${
        subtopic.covered
          ? 'bg-slate-900/90 border-brand-500/30'
          : 'bg-slate-950/60 border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
        {/* CHECKLIST 1: General Topic Covering Checkbox */}
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleToggleCovered}
            className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
              subtopic.covered
                ? 'bg-brand-500 border-brand-400 text-white shadow-glow-brand'
                : 'border-slate-600 hover:border-brand-400 bg-slate-900/80 text-transparent'
            }`}
            title={subtopic.covered ? 'Completed! Click to uncheck' : 'Click to mark initial coverage complete'}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          <div className="flex-1 min-w-0">
            <span
              onClick={handleToggleCovered}
              className={`text-xs font-medium cursor-pointer select-none transition-colors block leading-tight ${
                subtopic.covered
                  ? 'text-white font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {subtopic.name}
            </span>

            {/* Timestamps & status */}
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
              {subtopic.covered && (
                <span className="text-brand-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Initial Study Done
                </span>
              )}
              {subtopic.lastRevisedAt && (
                <span className="text-emerald-400">
                  Last Rev: {new Date(subtopic.lastRevisedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            {/* Notes display */}
            {subtopic.notes && !editingNotes && (
              <p
                onClick={() => setEditingNotes(true)}
                className="text-[11px] text-amber-200/80 mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
                title="Click to edit notes"
              >
                📝 {subtopic.notes}
              </p>
            )}
          </div>
        </div>

        {/* CHECKLIST 2: Multi-Round Revision Checklist & Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 sm:mt-0 mt-1">
          {/* Multi-round revision badges (REV, R1, R2, R3) - responsive, wraps on small screens */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-xl border border-white/5">
            <span className="text-[9px] uppercase font-bold text-slate-400 mr-0.5">REV</span>
            {[1, 2, 3].map((roundNum) => {
              const isDone = (subtopic.revisionRounds || 0) >= roundNum;
              return (
                <button
                  key={roundNum}
                  type="button"
                  onClick={() => {
                    if (isDone) {
                      actions.updateSubtopic(subjectId, topicId, subtopic.id, {
                        revisionRounds: roundNum - 1,
                      });
                    } else {
                      actions.updateSubtopic(subjectId, topicId, subtopic.id, {
                        revisionRounds: roundNum,
                        lastRevisedAt: new Date().toISOString(),
                      });
                      if (roundNum === 3) fireCelebrationConfetti();
                    }
                  }}
                  className={`w-5 h-5 rounded-md text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-glow-emerald'
                      : 'bg-slate-900 text-slate-500 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`Revision Round ${roundNum}`}
                >
                  R{roundNum}
                </button>
              );
            })}

            {/* Quick Increment button */}
            <button
              type="button"
              onClick={handleIncrementRevision}
              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition-colors text-[10px] font-bold"
              title="Add 1 Revision Round"
            >
              +
            </button>
          </div>

          {/* Edit Notes & Delete Actions */}
          <button
            type="button"
            onClick={() => setEditingNotes(!editingNotes)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
            title="Add/Edit Notes"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Inline Notes Editor */}
      {editingNotes && (
        <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5 animate-slide-up">
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Add key formulas, mistakes, or references for this subtopic..."
            rows={2}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditingNotes(false)}
              className="px-2 py-1 rounded text-[10px] text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNotes}
              className="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-bold"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Modal for adding Subjects, Topics, and Subtopics
// ----------------------------------------------------------------------
function CreateEditItemModal({
  type,
  subjectId,
  topicId,
  onClose,
  onSave,
}: {
  type: 'subject' | 'topic' | 'subtopic';
  subjectId?: string;
  topicId?: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const typeLabels = {
    subject: 'Subject (e.g. Operating Systems)',
    topic: 'Topic (e.g. CPU Scheduling)',
    subtopic: 'Subtopic (e.g. Round Robin & Priority Scheduling)',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a valid title.');
      return;
    }
    onSave(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl p-5 sm:p-6 w-full max-w-md border border-white/10 shadow-2xl space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white capitalize flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-400" />
            Add New {type}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {typeLabels[type]}
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder={`Enter ${type} title...`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
            {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-colors shadow-md shadow-brand-900/30"
            >
              Add {type}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
