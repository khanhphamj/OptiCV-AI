import React, { useMemo } from 'react';

interface ConstellationScanProps {
  /** Used to extract real keywords from THIS CV — drives the context-aware
   *  swarm of floating chips. Different CVs produce different swarms. */
  cvText?: string;
}

/**
 * Cognitive-motion loading state for the analysis stage.
 *
 * Context-aware ambient feedback — every visual layer is in continuous
 * motion on its own offset clock so the scene reads as "the agent is
 * actively reasoning over THIS candidate's data" without ever startling:
 *
 *   1. Aurora gradient backdrop      — slow hue drift; atmosphere.
 *   2. Halo waves                    — three rings emanating outward at
 *                                      offset rhythms (thoughts forming).
 *   3. Inflow particles              — six dots drifting toward the orb
 *                                      from the periphery (data ingest).
 *   4. Breathing orb + inner swirl   — focal AI brain.
 *   5. Floating CV keywords          — chips parsed from cvText drift on
 *                                      free-form paths (no fixed orbit),
 *                                      randomised drift variants so the
 *                                      swarm feels organic and never
 *                                      mechanical. The chip set is
 *                                      different for every CV.
 */

const ORB_PX = 96;

const STOP_WORDS = new Set([
  'and', 'with', 'from', 'have', 'were', 'this', 'that', 'they', 'their', 'been',
  'will', 'would', 'should', 'about', 'into', 'over', 'under', 'than', 'when',
  'where', 'while', 'using', 'used', 'across', 'within', 'including', 'such',
  'work', 'team', 'role', 'year', 'years', 'month', 'months', 'experience',
  'skill', 'skills', 'projects', 'project', 'company', 'responsible',
  'managed', 'developed', 'created', 'built', 'designed', 'helped',
]);

function extractKeywords(text: string, count = 9): string[] {
  if (!text) return [];
  const tokens = text
    .replace(/[^A-Za-z0-9+#./\-\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 4 && w.length <= 18)
    .filter(w => !STOP_WORDS.has(w.toLowerCase()))
    .filter(w => /[A-Za-z]/.test(w));

  // Prefer mixed-case and acronyms (likely meaningful: "Python", "AWS",
  // "Kubernetes", "FastAPI"). Plain lowercase common words score lowest.
  const scored = tokens.map(t => ({
    t,
    score: (/^[A-Z][a-z]/.test(t) ? 1 : 0) + (/^[A-Z]{2,}$/.test(t) ? 2 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const { t } of scored) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= count) break;
  }
  return out;
}

/** Stable pseudo-random from a string. Same word → same drift settings,
 *  so the swarm doesn't reshuffle on every render frame. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

const NUM_DRIFT_VARIANTS = 6;

interface ChipPlacement {
  word: string;
  /** which drift keyframe (0..NUM_DRIFT_VARIANTS-1) */
  variant: number;
  /** delay seconds */
  delay: number;
  /** duration seconds */
  duration: number;
  /** font size in px (subtle variation) */
  size: number;
}

function placeChips(words: string[]): ChipPlacement[] {
  return words.map(word => {
    const seed = hashStr(word);
    return {
      word,
      variant: seed % NUM_DRIFT_VARIANTS,
      // 0..7 s stagger so chips appear at independent moments
      delay: ((seed >> 5) % 800) / 100,
      // 9..14 s lifecycle — slow & gentle
      duration: 9 + (((seed >> 11) % 50) / 10),
      // 10..12 px font, tiny variation
      size: 10 + ((seed >> 17) % 3),
    };
  });
}

const ConstellationScan: React.FC<ConstellationScanProps> = ({ cvText = '' }) => {
  const chips = useMemo(() => placeChips(extractKeywords(cvText, 9)), [cvText]);

  return (
    <div className="relative w-full max-w-[22rem] sm:max-w-[24rem] mx-auto h-[14rem] sm:h-[16rem] flex items-center justify-center overflow-hidden">
      {/* Aurora atmosphere — slow hue drift in the background */}
      <div aria-hidden className="cv-loading-aurora absolute inset-0 rounded-3xl pointer-events-none" />

      {/* Halo waves — three rings emanating outward at staggered intervals */}
      <span aria-hidden className="cv-loading-halo cv-loading-halo-1" />
      <span aria-hidden className="cv-loading-halo cv-loading-halo-2" />
      <span aria-hidden className="cv-loading-halo cv-loading-halo-3" />

      {/* Inflow particles — drift from the periphery toward the orb */}
      {Array.from({ length: 6 }).map((_, i) => {
        // Deterministic peripheral positions, evenly distributed but slightly
        // jittered so the inflow doesn't read as a rigid hexagon.
        const angle = (i / 6) * Math.PI * 2 + ((hashStr(String(i)) % 100) / 100 - 0.5) * 0.6;
        const r = 130 + ((hashStr(`p${i}`) % 50));
        const sx = Math.cos(angle) * r;
        const sy = Math.sin(angle) * r;
        const seed = hashStr(`pt${i}`);
        const duration = 4.5 + ((seed % 30) / 10);
        const delay = ((seed >> 5) % 30) / 10;
        const size = 2 + ((seed >> 11) % 2);
        return (
          <span
            key={`p${i}`}
            aria-hidden
            className="cv-loading-particle"
            style={{
              ['--p-start-x' as string]: `${sx.toFixed(1)}px`,
              ['--p-start-y' as string]: `${sy.toFixed(1)}px`,
              animationDuration: `${duration.toFixed(2)}s`,
              animationDelay: `${delay.toFixed(2)}s`,
              width: `${size}px`,
              height: `${size}px`,
            }}
          />
        );
      })}

      {/* Floating CV keywords — context-aware, drifting on free-form paths */}
      {chips.map((chip, i) => (
        <span
          key={`${chip.word}-${i}`}
          aria-hidden
          className={`cv-loading-keyword cv-loading-keyword-v${chip.variant}`}
          style={{
            animationDelay: `${chip.delay.toFixed(2)}s`,
            animationDuration: `${chip.duration.toFixed(2)}s`,
            fontSize: `${chip.size}px`,
          }}
        >
          {chip.word}
        </span>
      ))}

      {/* Focal orb — breathes outwardly while a conic gradient drifts inside */}
      <div className="cv-loading-orb-wrap relative" style={{ width: ORB_PX, height: ORB_PX }}>
        <div className="cv-loading-orb">
          <div className="cv-loading-orb-swirl" />
          <div className="cv-loading-orb-inner" />
          <div className="cv-loading-orb-shine" />
        </div>
      </div>
    </div>
  );
};

export default ConstellationScan;
