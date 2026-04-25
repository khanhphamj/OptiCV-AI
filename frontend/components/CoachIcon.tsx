import React from 'react';

interface CoachIconProps {
  /** Tailwind sizing e.g. "w-8 h-8". */
  className?: string;
  /** When true, the icon shows a soft emerald halo pulse and the star twinkles
   *  gently — used while the coach is generating a reply. */
  thinking?: boolean;
  /** When true, the star lifts upward and rotates clockwise (logo hover state). */
  hovered?: boolean;
}

/**
 * OptiCV Coach icon — emerald core with a 4-point white star.
 * Idle: static. Thinking: soft halo pulse + subtle star twinkle.
 */
const CoachIcon: React.FC<CoachIconProps> = ({ className = '', thinking = false, hovered = false }) => {
  const uid = React.useId().replace(/:/g, '');
  const gradId = `coach-grad-${uid}`;

  return (
    <span className={`relative inline-block ${className}`}>
      {/* Soft halo — pulses while thinking. Sits behind the SVG. */}
      {thinking && (
        <span
          aria-hidden
          className="coach-icon-halo absolute inset-0 rounded-full pointer-events-none"
        />
      )}

      <svg
        viewBox="0 0 24 24"
        className="block w-full h-full relative"
        role="img"
        aria-label="OptiCV Coach"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#34d399" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="12" fill={`url(#${gradId})`} />
        <circle cx="12" cy="12" r="11.4" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.5" />

        {/* Star — shadow comes from CSS `filter: drop-shadow` on .coach-star-hover,
            so the shadow shape is the actual star silhouette (not a puddle). */}
        <g
          className={[
            'coach-star',
            thinking ? 'coach-icon-star' : '',
            hovered  ? 'coach-star-hover' : '',
          ].filter(Boolean).join(' ')}
        >
          <path
            d="M12 4.5l1.2 3.8c.3 1 1.2 1.9 2.2 2.2L19.2 12l-3.8 1.2c-1 .3-1.9 1.2-2.2 2.2L12 19.5l-1.2-3.8c-.3-1-1.2-1.9-2.2-2.2L4.8 12l3.8-1.2c1-.3 1.9-1.2 2.2-2.2L12 4.5z"
            fill="white"
          />
        </g>
      </svg>
    </span>
  );
};

export default CoachIcon;
