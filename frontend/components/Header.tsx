import React from 'react';
import CoachIcon from './CoachIcon';
import LanguageToggle from './LanguageToggle';

interface HeaderProps {
  /** Optional status shown subtly in the middle (e.g. "Step 2 of 3" or "Score 85/100"). */
  status?: string;
}

/**
 * Minimal chrome header — Linear / Notion style.
 * ~48-56px tall, logo left, optional status mid, language toggle right.
 * No aurora, no orbs, no parallax — the app's focus is work.
 */
const Header: React.FC<HeaderProps> = ({ status }) => {
  return (
    <header
      className="
        relative z-20 shrink-0
        bg-white/75 backdrop-blur-md
        border-b border-slate-200/70
        shadow-[0_1px_0_rgba(15,23,42,0.03)]
      "
    >
      <div className="max-w-6xl mx-auto h-16 sm:h-[72px] lg:h-20 px-3 sm:px-5 lg:px-6 flex items-center gap-3 sm:gap-4">
        {/* Left — brand */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 rounded-lg -mx-1 px-1.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          aria-label="OptiCV AI — home"
        >
          <CoachIcon className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
          <span className="font-headline font-extrabold tracking-tight text-base sm:text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">
            OptiCV&nbsp;AI
          </span>
        </a>

        {/* Middle — subtle status */}
        {status && (
          <>
            <span className="hidden sm:inline-block h-5 w-px bg-slate-300/80" aria-hidden />
            <span className="hidden sm:block flex-1 min-w-0 text-sm text-slate-500 truncate">
              {status}
            </span>
          </>
        )}

        {/* Right — language toggle */}
        <div className={status ? 'sm:ml-0 ml-auto' : 'ml-auto'}>
          <LanguageToggle variant="light" />
        </div>
      </div>
    </header>
  );
};

export default Header;
