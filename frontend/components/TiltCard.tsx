import React, { useCallback, useRef } from 'react';

interface TiltCardProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  /** Maximum tilt in degrees from the rest position. Default 6° — subtle. */
  maxTilt?: number;
}

/**
 * Wrapper that adds a subtle 3D tilt + cursor-tracked highlight to its child.
 * Uses CSS custom properties (--rx / --ry / --gx / --gy) and refs to update
 * the DOM directly, so per-frame mouse moves never trigger React re-renders.
 *
 * Drop-in replacement for any <div> on the landing page — pass className /
 * style as you would on a div, and the tilt behaviour is added on hover.
 */
const TiltCard: React.FC<TiltCardProps> = ({
  className = '',
  style,
  children,
  maxTilt = 6,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;   // 0..1
    const y = (e.clientY - rect.top)  / rect.height;  // 0..1
    // rotateX is inverted: cursor near top → card tilts back (top edge away)
    el.style.setProperty('--rx', `${((0.5 - y) * maxTilt).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * maxTilt).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  }, [maxTilt]);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Resetting only --rx / --ry lets the CSS transition animate the card
    // back to flat. Glare position vars stay so the highlight doesn't
    // visibly snap back to centre.
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`tilt-card ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default TiltCard;
