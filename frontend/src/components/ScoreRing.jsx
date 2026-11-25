import { useEffect, useState } from 'react';

// Clean circular score gauge rendered with inline SVG and smooth count-up animation.
export default function ScoreRing({ score, grade }) {
  const targetPct = Math.max(0, Math.min(100, score ?? 0));
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 700;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPct(Math.round(eased * targetPct));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetPct]);

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPct / 100) * circumference;

  let color = '#10b981';
  if (targetPct < 50) color = '#dc2626';
  else if (targetPct < 65) color = '#ea580c';
  else if (targetPct < 80) color = '#d97706';

  return (
    <div className="score-ring">
      <svg width="144" height="144" viewBox="0 0 144 144">
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth="12"
        />
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 72 72)"
        />
        <text x="72" y="66" textAnchor="middle" className="ring-score">
          {animatedPct}
        </text>
        <text x="72" y="90" textAnchor="middle" className="ring-grade" fill={color}>
          Grade {grade || '—'}
        </text>
      </svg>
    </div>
  );
}
