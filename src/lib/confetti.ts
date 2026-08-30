import confetti from 'canvas-confetti';

export function fireCelebrationConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#6366f1', '#ec4899', '#10b981'],
  });

  fire(0.2, {
    spread: 60,
    colors: ['#818cf8', '#f472b6', '#34d399'],
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#fbbf24', '#f59e0b', '#6366f1'],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#a855f7', '#3b82f6', '#10b981'],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#f43f5e', '#6366f1', '#eab308'],
  });
}
