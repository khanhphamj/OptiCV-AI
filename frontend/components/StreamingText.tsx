import React, { useEffect, useRef, useState } from 'react';

interface StreamingTextProps {
  text: string;
  /** When true, reveal text progressively. When false, render whole text instantly. */
  active?: boolean;
  /** Ms per tick. Lower = faster. Default 14. */
  speedMs?: number;
  /** Chars revealed per tick. Higher = smoother for long messages. Default 2. */
  charsPerTick?: number;
  /** Fires when the stream completes. */
  onDone?: () => void;
  /** Fires each tick with current progress — useful for auto-scrolling parent. */
  onProgress?: () => void;
  className?: string;
}

/**
 * Typewriter-style text reveal for a single chunk of text. The caret blinks
 * while streaming and disappears when done. Respects prefers-reduced-motion
 * by rendering the full text instantly.
 */
const StreamingText: React.FC<StreamingTextProps> = ({
  text,
  active = true,
  speedMs = 14,
  charsPerTick = 2,
  onDone,
  onProgress,
  className = '',
}) => {
  const [shown, setShown] = useState<number>(active ? 0 : text.length);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDoneRef = useRef(onDone);
  const onProgressRef = useRef(onProgress);

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (!active || prefersReduced) {
      setShown(text.length);
      return;
    }

    setShown(0);

    const tick = () => {
      setShown((prev) => {
        const next = Math.min(text.length, prev + charsPerTick);
        if (next < text.length) {
          timerRef.current = setTimeout(tick, speedMs);
        } else {
          onDoneRef.current?.();
        }
        onProgressRef.current?.();
        return next;
      });
    };

    timerRef.current = setTimeout(tick, speedMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, active, speedMs, charsPerTick]);

  const isDone = shown >= text.length;

  return (
    <span className={className}>
      <span className="whitespace-pre-wrap">{text.slice(0, shown)}</span>
      {!isDone && active && (
        <span
          aria-hidden
          className="inline-block w-[2px] h-[0.95em] -mb-[2px] ml-[1px] bg-emerald-500 align-middle animate-pulse"
        />
      )}
    </span>
  );
};

export default StreamingText;
