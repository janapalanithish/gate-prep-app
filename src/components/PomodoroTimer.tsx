import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Clock, Flame } from 'lucide-react';
import { fireCelebrationConfetti } from '../lib/confetti';

interface PomodoroTimerProps {
  onSessionComplete?: (minutes: number) => void;
}

export default function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<'25' | '50' | 'custom'>('25');
  const [customMinutes, setCustomMinutes] = useState(45);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const timerRef = useRef<number | null>(null);

  const switchMode = (newMode: '25' | '50' | 'custom', customM = customMinutes) => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setMode(newMode);
    let sec = 25 * 60;
    if (newMode === '50') sec = 50 * 60;
    if (newMode === 'custom') sec = customM * 60;
    setTotalSeconds(sec);
    setSecondsLeft(sec);
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            const doneMins = Math.round(totalSeconds / 60);
            setElapsedMinutes((m) => m + doneMins);
            if (onSessionComplete) onSessionComplete(doneMins);
            fireCelebrationConfetti();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, totalSeconds, onSessionComplete]);

  const togglePlay = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(totalSeconds);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const finishEarly = () => {
    const studiedSec = totalSeconds - secondsLeft;
    const studiedMins = Math.max(1, Math.round(studiedSec / 60));
    if (studiedMins > 0 && onSessionComplete) {
      onSessionComplete(studiedMins);
      setElapsedMinutes((m) => m + studiedMins);
      fireCelebrationConfetti();
    }
    resetTimer();
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="glass-card rounded-2xl p-4 border border-indigo-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Focus Study Timer</h3>
            <p className="text-[10px] text-slate-400">Pomodoro focus session</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => switchMode('25')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === '25'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            25m
          </button>
          <button
            onClick={() => switchMode('50')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === '50'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            50m
          </button>
          <button
            onClick={() => switchMode('custom')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'custom'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {mode === 'custom' && (
        <div className="flex items-center gap-2 mb-3 bg-slate-950/40 p-2 rounded-xl border border-white/5">
          <span className="text-xs text-slate-300">Duration (min):</span>
          <input
            type="number"
            min="1"
            max="180"
            value={customMinutes}
            onChange={(e) => {
              const val = Math.max(1, parseInt(e.target.value) || 1);
              setCustomMinutes(val);
              switchMode('custom', val);
            }}
            className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-white font-mono text-center focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Timer Circle / Display */}
      <div className="flex flex-col items-center justify-center my-3 relative">
        <div className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-white flex items-center justify-center gap-1 drop-shadow-md">
          <span className="text-indigo-400">{String(minutes).padStart(2, '0')}</span>
          <span className="text-slate-500 animate-pulse">:</span>
          <span className="text-amber-400">{String(seconds).padStart(2, '0')}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 mt-3 overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          onClick={togglePlay}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          {isRunning ? 'Pause' : secondsLeft === 0 ? 'Restart' : 'Start Focus'}
        </button>

        <button
          onClick={resetTimer}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-colors active:scale-95"
          title="Reset timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {isRunning && secondsLeft < totalSeconds && (
          <button
            onClick={finishEarly}
            className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors active:scale-95"
            title="Log current progress"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Log</span>
          </button>
        )}
      </div>
    </div>
  );
}
