import React from 'react';

interface CoachIconProps {
  /** true when the agent is actively thinking. */
  thinking?: boolean;
  /** Tailwind sizing e.g. "w-8 h-8". */
  className?: string;
}

/**
 * OptiCV Coach icon — "Lumen Sweep".
 *
 * A single radial light beam sweeps around the emerald core like a
 * lighthouse scan. The star stays centered with a subtle breath.
 * Minimal, premium, unmistakably AI-processing.
 */
const CoachIcon: React.FC<CoachIconProps> = ({ thinking = false, className = '' }) => {
  const uid = React.useId().replace(/:/g, '');
  const gradId = `coach-grad-${uid}`;
  const glowId = `coach-glow-${uid}`;

  return (
    <span className={`coach-icon relative inline-block ${className}`}>
      {/* Outer halo — can bleed beyond the circle, so sits outside the clipped layer */}
      <span
        aria-hidden
        className={`absolute inset-0 rounded-full blur-md pointer-events-none ${
          thinking ? 'coach-icon__halo-thinking' : 'coach-icon__halo-idle'
        }`}
        style={{
          background:
            'radial-gradient(circle, rgba(52,211,153,0.55) 0%, rgba(20,184,166,0.25) 55%, transparent 80%)',
        }}
      />

      {/* Clipped stage — SVG core paints first, then sweep beams paint on top
          with mix-blend-mode to stay inside the emerald circle. */}
      <span className="relative block w-full h-full rounded-full overflow-hidden">
        {/* SVG — emerald core + star (painted FIRST, serves as backdrop for the sweep) */}
        <svg
          viewBox="0 0 24 24"
          className="absolute inset-0 w-full h-full"
          role="img"
          aria-label="OptiCV Coach"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#34d399" />
              <stop offset="1" stopColor="#10b981" />
            </linearGradient>
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="b" />
              <feFlood floodColor="#ffffff" floodOpacity="0.28" />
              <feComposite in2="b" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx="12"
            cy="12"
            r="12"
            fill={`url(#${gradId})`}
            filter={`url(#${glowId})`}
            className={thinking ? 'coach-icon__core-thinking' : ''}
          />
          <circle cx="12" cy="12" r="11.4" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.5" />

          <g
            className={thinking ? 'coach-icon__star-thinking' : 'coach-icon__star-idle'}
            style={{ transformOrigin: '12px 12px', transformBox: 'fill-box' }}
          >
            <path
              d="M12 4.5l1.2 3.8c.3 1 1.2 1.9 2.2 2.2L19.2 12l-3.8 1.2c-1 .3-1.9 1.2-2.2 2.2L12 19.5l-1.2-3.8c-.3-1-1.2-1.9-2.2-2.2L4.8 12l3.8-1.2c1-.3 1.9-1.2 2.2-2.2L12 4.5z"
              fill="white"
            />
          </g>
        </svg>

        {/* Trail beam — painted BEFORE the primary so the main sweep reads as leading edge */}
        {thinking && (
          <span
            aria-hidden
            className="coach-icon__sweep-trail absolute inset-0 pointer-events-none rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg,' +
                ' transparent 0%,' +
                ' transparent 55%,' +
                ' rgba(255, 255, 255, 0.28) 62%,' +
                ' rgba(255, 255, 255, 0.50) 66%,' +
                ' rgba(255, 255, 255, 0.18) 72%,' +
                ' transparent 78%,' +
                ' transparent 100%)',
              mixBlendMode: 'screen',
              filter: 'blur(1.2px)',
              opacity: 0.75,
            }}
          />
        )}

        {/* Primary sweep beam — bright leading edge rotating around the core */}
        {thinking && (
          <span
            aria-hidden
            className="coach-icon__sweep absolute inset-0 pointer-events-none rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg,' +
                ' transparent 0%,' +
                ' transparent 15%,' +
                ' rgba(255, 255, 255, 0.35) 22%,' +
                ' rgba(255, 255, 255, 0.90) 28%,' +
                ' rgba(167, 243, 208, 1) 30%,' +
                ' rgba(255, 255, 255, 0.90) 32%,' +
                ' rgba(255, 255, 255, 0.35) 38%,' +
                ' transparent 45%,' +
                ' transparent 100%)',
              mixBlendMode: 'screen',
              filter: 'blur(0.5px)',
            }}
          />
        )}
      </span>
    </span>
  );
};

export default CoachIcon;
