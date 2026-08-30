import { useState, useEffect } from 'react';
import { Clock, Calendar, Sparkles } from 'lucide-react';

interface GateCountdownProps {
  targetDateStr?: string; // YYYY-MM-DD
  examYear?: number;
}

export default function GateCountdown({
  targetDateStr = '2027-02-06',
  examYear = 2027,
}: GateCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPassed: false,
  });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(`${targetDateStr}T09:30:00+05:30`).getTime(); // 9:30 AM IST GATE exam slot
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPassed: false });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetDateStr]);

  if (timeLeft.isPassed) {
    return (
      <div className="glass-card rounded-2xl p-4 border border-brand-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">GATE {examYear} Exam Day!</h3>
            <p className="text-xs text-slate-400">Give it your best shot. You've prepared well!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-3.5 sm:p-4 border border-indigo-500/20 bg-gradient-to-r from-slate-900/80 via-indigo-950/40 to-slate-900/80 shadow-lg relative overflow-hidden">
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide uppercase">GATE {examYear}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                {targetDateStr}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Target Exam Countdown</p>
          </div>
        </div>

        {/* Digits Grid */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
          <div className="bg-slate-950/60 border border-white/5 rounded-xl px-2 py-1.5 min-w-[52px]">
            <span className="block text-base sm:text-lg font-mono font-bold text-indigo-400 leading-none">
              {timeLeft.days}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Days</span>
          </div>

          <div className="bg-slate-950/60 border border-white/5 rounded-xl px-2 py-1.5 min-w-[44px]">
            <span className="block text-base sm:text-lg font-mono font-bold text-slate-200 leading-none">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Hours</span>
          </div>

          <div className="bg-slate-950/60 border border-white/5 rounded-xl px-2 py-1.5 min-w-[44px]">
            <span className="block text-base sm:text-lg font-mono font-bold text-slate-200 leading-none">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Mins</span>
          </div>

          <div className="bg-slate-950/60 border border-white/5 rounded-xl px-2 py-1.5 min-w-[44px]">
            <span className="block text-base sm:text-lg font-mono font-bold text-amber-400 leading-none">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Secs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
