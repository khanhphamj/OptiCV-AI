import React, { useMemo } from 'react';

/**
 * Tier-based particle burst overlay for the score reveal.
 *
 *   score ≥ 85  → confetti (emerald/teal/amber + white), gravity-biased.
 *   score 70–84 → sparkle shower (white stars, no gravity).
 *   score < 70  → nothing (respectful — no fake celebration).
 *
 * `playKey` — bump whenever the reveal should replay (re-analysis, step re-entry).
 * The whole overlay re-mounts when playKey changes so CSS animations restart.
 *
 * Honors `prefers-reduced-motion` via CSS (`[data-celebrate]` is hidden).
 */

interface ScoreCelebrationProps {
  score: number;
  playKey: number;
}

type Particle = {
  id: number;
  kind: 'confetti' | 'sparkle';
  tx: number;
  ty: number;
  rot: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
};

const CONFETTI_PALETTE = [
  '#34d399', // emerald-400
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#fbbf24', // amber-400
  '#ffffff',
];

function buildConfetti(count: number, seed: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7;
    // Upward bias — most particles go up, then fall.
    const bias = Math.random() * 0.6 - 0.3 - Math.PI / 2;
    const a = angle * 0.3 + bias * 0.7;
    const dist = 90 + Math.random() * 90;
    out.push({
      id: seed * 1000 + i,
      kind: 'confetti',
      tx: Math.cos(a) * dist,
      // Add gravity — particles drift downward as they fade.
      ty: Math.sin(a) * dist + 50 + Math.random() * 30,
      rot: (Math.random() - 0.5) * 720,
      size: 5 + Math.random() * 7,
      color: CONFETTI_PALETTE[i % CONFETTI_PALETTE.length],
      delay: Math.random() * 140,
      duration: 900 + Math.random() * 500,
    });
  }
  return out;
}

function buildSparkles(count: number, seed: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 55 + Math.random() * 40;
    out.push({
      id: seed * 1000 + i,
      kind: 'sparkle',
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      rot: 0,
      size: 4 + Math.random() * 4,
      color: '#ffffff',
      delay: Math.random() * 200,
      duration: 900 + Math.random() * 300,
    });
  }
  return out;
}

const ScoreCelebration: React.FC<ScoreCelebrationProps> = ({ score, playKey }) => {
  const tier: 'A' | 'B' | 'none' = score >= 85 ? 'A' : score >= 70 ? 'B' : 'none';

  const particles = useMemo(() => {
    if (tier === 'A') return buildConfetti(30, playKey);
    if (tier === 'B') return buildSparkles(14, playKey);
    return [];
  }, [tier, playKey]);

  if (tier === 'none') return null;

  return (
    <div
      key={playKey}
      data-celebrate
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-20"
    >
      {particles.map((p) => {
        const isConfetti = p.kind === 'confetti';
        const style: React.CSSProperties = {
          width: p.size,
          height: isConfetti ? p.size * 0.4 : p.size,
          background: p.color,
          borderRadius: isConfetti ? 1 : '50%',
          boxShadow: isConfetti ? 'none' : `0 0 ${p.size * 1.5}px ${p.color}`,
          animation: `${isConfetti ? 'particle-burst' : 'sparkle-burst'} ${p.duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${p.delay}ms forwards`,
          // Custom props consumed by the keyframes.
          ['--tx' as string]: `${p.tx}px`,
          ['--ty' as string]: `${p.ty}px`,
          ['--rot' as string]: `${p.rot}deg`,
        };
        return <span key={p.id} className="absolute" style={style} />;
      })}

      {/* Soft center glow pulse — amplifies the circle behind, tier A only */}
      {tier === 'A' && (
        <span
          aria-hidden
          className="absolute w-16 h-16 rounded-full bg-emerald-300/60 blur-xl animate-glow-ring"
        />
      )}
    </div>
  );
};

export default ScoreCelebration;
