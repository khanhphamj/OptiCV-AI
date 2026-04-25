import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HiSparkles, HiArrowLongRight, HiBolt, HiMagnifyingGlass } from 'react-icons/hi2';

type Weight = 'must' | 'pref' | 'bonus';
interface SkillChip { name: string; weight: Weight }
interface RoleRow {
  role: string;        // canonical display name
  aliases?: string[];  // lowercase substrings we'll match against
  skills: SkillChip[];
}

/* ── Curated skill graph for popular roles. No API calls — instant response,
   zero infra cost, never rate-limited. Add new rows freely; the matcher does
   the rest.                                                                 */
const ROLES: RoleRow[] = [
  {
    role: 'Software Engineer',
    aliases: ['software engineer', 'software developer', 'swe', 'developer', 'programmer'],
    skills: [
      { name: 'Python',        weight: 'must'  },
      { name: 'JavaScript',    weight: 'must'  },
      { name: 'Git',           weight: 'must'  },
      { name: 'SQL',           weight: 'must'  },
      { name: 'Data Structures', weight: 'must' },
      { name: 'System Design', weight: 'pref'  },
      { name: 'Docker',        weight: 'pref'  },
      { name: 'AWS',           weight: 'bonus' },
      { name: 'Kubernetes',    weight: 'bonus' },
    ],
  },
  {
    role: 'Frontend Developer',
    aliases: ['frontend', 'front-end', 'front end', 'web developer', 'react developer'],
    skills: [
      { name: 'React',          weight: 'must'  },
      { name: 'TypeScript',     weight: 'must'  },
      { name: 'HTML / CSS',     weight: 'must'  },
      { name: 'Tailwind',       weight: 'pref'  },
      { name: 'Next.js',        weight: 'pref'  },
      { name: 'Web Performance', weight: 'pref' },
      { name: 'Accessibility',  weight: 'pref'  },
      { name: 'GraphQL',        weight: 'bonus' },
      { name: 'Figma',          weight: 'bonus' },
    ],
  },
  {
    role: 'Backend Developer',
    aliases: ['backend', 'back-end', 'back end', 'server-side', 'api developer'],
    skills: [
      { name: 'Node.js',     weight: 'must'  },
      { name: 'Python',      weight: 'must'  },
      { name: 'PostgreSQL',  weight: 'must'  },
      { name: 'REST APIs',   weight: 'must'  },
      { name: 'Redis',       weight: 'pref'  },
      { name: 'Docker',      weight: 'pref'  },
      { name: 'Microservices', weight: 'pref' },
      { name: 'Kafka',       weight: 'bonus' },
      { name: 'gRPC',        weight: 'bonus' },
    ],
  },
  {
    role: 'Data Scientist',
    aliases: ['data scientist', 'data science', 'ml scientist'],
    skills: [
      { name: 'Python',          weight: 'must'  },
      { name: 'Statistics',      weight: 'must'  },
      { name: 'Pandas / NumPy',  weight: 'must'  },
      { name: 'SQL',             weight: 'must'  },
      { name: 'scikit-learn',    weight: 'must'  },
      { name: 'A/B Testing',     weight: 'pref'  },
      { name: 'PyTorch',         weight: 'pref'  },
      { name: 'Tableau',         weight: 'bonus' },
      { name: 'Spark',           weight: 'bonus' },
    ],
  },
  {
    role: 'Machine Learning Engineer',
    aliases: ['ml engineer', 'machine learning', 'ai engineer', 'mlops'],
    skills: [
      { name: 'PyTorch',           weight: 'must'  },
      { name: 'TensorFlow',        weight: 'must'  },
      { name: 'Python',            weight: 'must'  },
      { name: 'MLOps',             weight: 'must'  },
      { name: 'Docker / Kubernetes', weight: 'pref' },
      { name: 'Distributed Training', weight: 'pref' },
      { name: 'Vector DBs',        weight: 'bonus' },
      { name: 'Triton Inference',  weight: 'bonus' },
    ],
  },
  {
    role: 'Data Engineer',
    aliases: ['data engineer', 'data engineering', 'etl developer'],
    skills: [
      { name: 'SQL',         weight: 'must'  },
      { name: 'Python',      weight: 'must'  },
      { name: 'Airflow',     weight: 'must'  },
      { name: 'Spark',       weight: 'must'  },
      { name: 'dbt',         weight: 'pref'  },
      { name: 'Snowflake',   weight: 'pref'  },
      { name: 'Kafka',       weight: 'bonus' },
      { name: 'Terraform',   weight: 'bonus' },
    ],
  },
  {
    role: 'Product Manager',
    aliases: ['product manager', 'pm', 'product owner', 'product lead'],
    skills: [
      { name: 'Roadmapping',     weight: 'must'  },
      { name: 'User Research',   weight: 'must'  },
      { name: 'A/B Testing',     weight: 'must'  },
      { name: 'SQL',             weight: 'must'  },
      { name: 'Stakeholder Mgmt', weight: 'pref' },
      { name: 'Wireframing',     weight: 'pref'  },
      { name: 'OKRs',            weight: 'pref'  },
      { name: 'Mixpanel',        weight: 'bonus' },
      { name: 'Jira',            weight: 'bonus' },
    ],
  },
  {
    role: 'UX / Product Designer',
    aliases: ['ux designer', 'ui designer', 'product designer', 'ux/ui'],
    skills: [
      { name: 'Figma',           weight: 'must'  },
      { name: 'Design Systems',  weight: 'must'  },
      { name: 'User Research',   weight: 'must'  },
      { name: 'Prototyping',     weight: 'must'  },
      { name: 'Wireframing',     weight: 'pref'  },
      { name: 'Accessibility',   weight: 'pref'  },
      { name: 'Motion Design',   weight: 'bonus' },
      { name: 'HTML / CSS',      weight: 'bonus' },
    ],
  },
  {
    role: 'DevOps / SRE',
    aliases: ['devops', 'sre', 'site reliability', 'platform engineer', 'cloud engineer'],
    skills: [
      { name: 'Kubernetes',  weight: 'must'  },
      { name: 'Terraform',   weight: 'must'  },
      { name: 'AWS / GCP',   weight: 'must'  },
      { name: 'Linux',       weight: 'must'  },
      { name: 'CI / CD',     weight: 'must'  },
      { name: 'Prometheus',  weight: 'pref'  },
      { name: 'Bash',        weight: 'pref'  },
      { name: 'Service Mesh', weight: 'bonus' },
    ],
  },
  {
    role: 'Mobile Developer',
    aliases: ['mobile', 'ios developer', 'android developer', 'react native'],
    skills: [
      { name: 'Swift / Kotlin', weight: 'must'  },
      { name: 'React Native',   weight: 'must'  },
      { name: 'REST APIs',      weight: 'must'  },
      { name: 'Git',            weight: 'must'  },
      { name: 'Animations',     weight: 'pref'  },
      { name: 'Push Notifications', weight: 'pref' },
      { name: 'Firebase',       weight: 'bonus' },
    ],
  },
  {
    role: 'Marketing Manager',
    aliases: ['marketing', 'digital marketer', 'growth marketer', 'content marketer'],
    skills: [
      { name: 'SEO',              weight: 'must'  },
      { name: 'Google Analytics', weight: 'must'  },
      { name: 'Content Strategy', weight: 'must'  },
      { name: 'Paid Ads',         weight: 'must'  },
      { name: 'Copywriting',      weight: 'pref'  },
      { name: 'Email Marketing',  weight: 'pref'  },
      { name: 'HubSpot',          weight: 'bonus' },
      { name: 'A/B Testing',      weight: 'bonus' },
    ],
  },
  {
    role: 'Sales / Business Development',
    aliases: ['sales', 'account executive', 'business development', 'bd'],
    skills: [
      { name: 'CRM (Salesforce)',  weight: 'must'  },
      { name: 'Pipeline Management', weight: 'must' },
      { name: 'Negotiation',       weight: 'must'  },
      { name: 'Cold Outreach',     weight: 'must'  },
      { name: 'Discovery Calls',   weight: 'pref'  },
      { name: 'Forecasting',       weight: 'pref'  },
      { name: 'LinkedIn Sales Nav', weight: 'bonus' },
    ],
  },
  {
    role: 'Financial Analyst',
    aliases: ['financial analyst', 'finance analyst', 'investment analyst'],
    skills: [
      { name: 'Excel (Advanced)',  weight: 'must'  },
      { name: 'Financial Modeling', weight: 'must' },
      { name: 'Valuation',         weight: 'must'  },
      { name: 'SQL',               weight: 'pref'  },
      { name: 'Power BI',          weight: 'pref'  },
      { name: 'Python',            weight: 'bonus' },
      { name: 'Bloomberg Terminal', weight: 'bonus' },
    ],
  },
  {
    role: 'HR / Recruiter',
    aliases: ['recruiter', 'hr', 'talent acquisition', 'human resources'],
    skills: [
      { name: 'Sourcing',           weight: 'must'  },
      { name: 'Interviewing',       weight: 'must'  },
      { name: 'ATS (Greenhouse)',   weight: 'must'  },
      { name: 'Employer Branding',  weight: 'pref'  },
      { name: 'Compensation',       weight: 'pref'  },
      { name: 'LinkedIn Recruiter', weight: 'bonus' },
      { name: 'Boolean Search',     weight: 'bonus' },
    ],
  },
  {
    role: 'Project Manager',
    aliases: ['project manager', 'program manager', 'scrum master', 'delivery manager'],
    skills: [
      { name: 'Agile / Scrum',  weight: 'must'  },
      { name: 'Risk Management', weight: 'must' },
      { name: 'Stakeholder Mgmt', weight: 'must' },
      { name: 'Jira',           weight: 'must'  },
      { name: 'Roadmapping',    weight: 'pref'  },
      { name: 'Budgeting',      weight: 'pref'  },
      { name: 'PMP',            weight: 'bonus' },
    ],
  },
];

/** Match user input against role names + aliases. Substring + word-level. */
function findRole(query: string): RoleRow | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const tokens = q.split(/\s+/).filter(Boolean);

  // 1) Whole-string substring match in any alias.
  let best: { row: RoleRow; score: number } | null = null;
  for (const row of ROLES) {
    const haystacks = [row.role.toLowerCase(), ...(row.aliases ?? [])];
    let score = 0;
    for (const h of haystacks) {
      if (h === q) score = Math.max(score, 100);
      else if (h.includes(q)) score = Math.max(score, 50 + q.length);
      else if (q.includes(h)) score = Math.max(score, 40 + h.length);
      else {
        // word-level: how many tokens land inside this haystack?
        const hits = tokens.filter(t => h.includes(t)).length;
        if (hits) score = Math.max(score, hits * 8);
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }
  return best?.row ?? null;
}

const WEIGHT_STYLES: Record<Weight, string> = {
  must:  'bg-emerald-50 text-emerald-800 border-emerald-200/80 ring-emerald-100',
  pref:  'bg-teal-50    text-teal-800    border-teal-200/80    ring-teal-100',
  bonus: 'bg-slate-50   text-slate-700   border-slate-200/80   ring-slate-100',
};
const WEIGHT_LABEL: Record<Weight, string> = {
  must:  'Must-have',
  pref:  'Preferred',
  bonus: 'Bonus',
};

interface LivePreviewProps { onGetStarted: () => void }

const ROTATING_PLACEHOLDERS = [
  'Software Engineer',
  'Product Manager',
  'Data Scientist',
  'UX Designer',
  'DevOps Engineer',
];

const LivePreview: React.FC<LivePreviewProps> = ({ onGetStarted }) => {
  const [input, setInput]         = useState('Software Engineer');
  const [committed, setCommitted] = useState('Software Engineer');
  const [thinking, setThinking]   = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce input → committed (mirrors a real AI call latency).
  useEffect(() => {
    if (input === committed) return;
    setThinking(true);
    const t = setTimeout(() => {
      setCommitted(input);
      setThinking(false);
    }, 280);
    return () => clearTimeout(t);
  }, [input, committed]);

  // Placeholder cycles when input is empty so the user sees what to try.
  useEffect(() => {
    if (input.trim() !== '') return;
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % ROTATING_PLACEHOLDERS.length), 2200);
    return () => clearInterval(t);
  }, [input]);

  const matched = useMemo(() => findRole(committed), [committed]);

  // Group chips by weight so the layout reads as a real priority list.
  const grouped = useMemo(() => {
    if (!matched) return null;
    const order: Weight[] = ['must', 'pref', 'bonus'];
    return order
      .map(w => ({ weight: w, items: matched.skills.filter(s => s.weight === w) }))
      .filter(g => g.items.length > 0);
  }, [matched]);

  // Stable, monotonically increasing key so chips re-mount (and re-animate)
  // every time `committed` changes.
  const renderKeyRef = useRef(0);
  const previousCommittedRef = useRef(committed);
  if (previousCommittedRef.current !== committed) {
    renderKeyRef.current += 1;
    previousCommittedRef.current = committed;
  }

  return (
    <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      <div className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
          <HiBolt className="h-3.5 w-3.5" />
          Live AI Demo
        </span>
        <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 font-headline tracking-tight">
          Type a role. See what AI knows.
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600">
          No signup. No upload. Just type the job you want — the same engine that grades your CV
          will tell you which skills hiring managers prioritise.
        </p>
      </div>

      <div className="liquid-glass relative mt-8 sm:mt-10 rounded-3xl p-5 sm:p-7 lg:p-8 overflow-hidden">
        {/* Ambient emerald aura behind the card content */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-300/35 to-teal-400/25 blur-2xl"
        />

        {/* Input row */}
        <div className="relative">
          <label
            htmlFor="live-preview-role"
            className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
          >
            Target role
          </label>
          <div className="mt-2 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <HiMagnifyingGlass className="h-5 w-5" />
            </span>
            <input
              ref={inputRef}
              id="live-preview-role"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Try "${ROTATING_PLACEHOLDERS[placeholderIdx]}"…`}
              className={`w-full pl-11 pr-14 py-3.5 sm:py-4 rounded-2xl bg-white/85 border-2 ${
                thinking ? 'border-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
                         : 'border-slate-200/80'
              } text-base sm:text-lg font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium
                outline-none focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.15)]
                transition-[border-color,box-shadow] duration-200`}
              autoComplete="off"
            />
            {/* Pulsing AI indicator dot */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {thinking ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="hidden sm:inline text-xs font-semibold text-emerald-700">Analyzing</span>
                </>
              ) : matched ? (
                <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                  <HiSparkles className="h-3.5 w-3.5" /> Live
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Result panel */}
        <div className="mt-6 min-h-[180px]">
          {matched && grouped ? (
            <>
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <p className="text-sm text-slate-600">
                  AI prioritises these skills for{' '}
                  <span className="font-bold text-slate-900">{matched.role}</span>:
                </p>
                <span className="hidden sm:inline text-[11px] text-slate-400 font-medium tabular-nums">
                  {matched.skills.length} skills · ranked
                </span>
              </div>

              <div className="space-y-3">
                {grouped.map((group, gi) => (
                  <div key={`${renderKeyRef.current}-${group.weight}`} className="flex items-start gap-3">
                    <span className={`mt-1 shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${WEIGHT_STYLES[group.weight]}`}>
                      {WEIGHT_LABEL[group.weight]}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((skill, si) => {
                        // Stagger across the entire group so chips fly in sequentially.
                        const delay = (gi * 80) + (si * 55);
                        return (
                          <span
                            key={`${renderKeyRef.current}-${skill.name}`}
                            className={`live-chip inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ring-1 ring-inset shadow-sm ${WEIGHT_STYLES[skill.weight]}`}
                            style={{ animationDelay: `${delay}ms` }}
                          >
                            {skill.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Soft CTA reveal — appears after the chips have settled */}
              <div
                className="mt-7 pt-5 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 live-cta"
                style={{ animationDelay: `${grouped.flatMap(g => g.items).length * 55 + 250}ms` }}
              >
                <p className="text-sm text-slate-600">
                  Now see how <span className="font-bold text-slate-900">your CV</span> matches.
                </p>
                <button
                  onClick={onGetStarted}
                  className="btn-sheen group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 border border-white/20 hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <HiSparkles className="h-4 w-4" />
                    Score my CV — free
                    <HiArrowLongRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-sm text-slate-500">
              <HiSparkles className="mx-auto h-6 w-6 text-emerald-400 mb-2" />
              No exact match yet — try{' '}
              <button
                onClick={() => setInput('Product Manager')}
                className="font-semibold text-emerald-700 underline underline-offset-2"
              >
                Product Manager
              </button>{' '}
              or{' '}
              <button
                onClick={() => setInput('Data Scientist')}
                className="font-semibold text-emerald-700 underline underline-offset-2"
              >
                Data Scientist
              </button>
              .
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LivePreview;
