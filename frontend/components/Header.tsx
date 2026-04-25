import React, { useEffect, useState } from 'react';
import CoachIcon from './CoachIcon';
import LanguageToggle from './LanguageToggle';

type HeaderVariant = 'glass' | 'colored';

interface HeaderProps {
  status?: string;
  onHome?: () => void;
  variant?: HeaderVariant;
}

const Header: React.FC<HeaderProps> = ({ status, onHome, variant = 'glass' }) => {
  const [scrolled, setScrolled] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const isColored = variant === 'colored';

  const shellClass = isColored
    ? `sticky top-0 z-30 shrink-0 rounded-none
       bg-gradient-to-r from-emerald-50/85 via-white/80 to-teal-50/85
       backdrop-blur-xl supports-[backdrop-filter]:bg-gradient-to-r
       border-b
       transition-[box-shadow,border-color,background-color] duration-300
       ${scrolled
          ? 'shadow-md shadow-emerald-900/[0.06] border-emerald-200/70'
          : 'shadow-none border-emerald-100/60'}`
    : `liquid-glass-soft sticky top-0 z-30 shrink-0 rounded-none
       border-b border-slate-200/60
       transition-shadow duration-300
       ${scrolled ? 'shadow-md shadow-slate-900/[0.06]' : 'shadow-none'}`;

  return (
    <header className={`relative ${shellClass}`}>
      {isColored && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r
            from-emerald-400/0 via-emerald-500 to-teal-500/0
            transition-opacity duration-300
            ${scrolled ? 'opacity-100' : 'opacity-80'}`}
        />
      )}

      <div className="max-w-6xl mx-auto h-16 sm:h-[72px] lg:h-20 px-3 sm:px-5 lg:px-6 flex items-center gap-3 sm:gap-4">
        {/* Brand */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            onHome?.();
          }}
          onMouseEnter={isColored ? () => setLogoHovered(true)  : undefined}
          onMouseLeave={isColored ? () => setLogoHovered(false) : undefined}
          className={`group flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 rounded-lg -mx-1 px-1.5 py-1
            transition-colors duration-300
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-emerald-500 cursor-pointer
            ${isColored ? 'hover:bg-emerald-50/60' : 'hover:bg-slate-100/50'}`}
          aria-label="OptiCV AI — home"
        >
          {/* Star spin + lift + drop-shadow only on the landing (colored) header.
              Workspace variant keeps the icon static — quieter, more focused. */}
          <CoachIcon
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
            hovered={isColored && logoHovered}
          />

          {/* Text — tagline expands in sync with the icon's 270° spin
              (same 800 ms duration + same cubic-bezier easing). */}
          <span className="flex items-baseline min-w-0">
            {isColored ? (
              <span
                className="font-headline font-extrabold tracking-tight text-base sm:text-lg
                  bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700
                  bg-clip-text text-transparent
                  group-hover:from-emerald-600 group-hover:to-teal-600
                  transition-colors shrink-0"
              >
                OptiCV&nbsp;AI
              </span>
            ) : (
              <span className="font-headline font-extrabold tracking-tight text-base sm:text-lg text-slate-900 group-hover:text-emerald-700 transition-colors shrink-0">
                OptiCV&nbsp;AI
              </span>
            )}

            {/* Tagline expansion is a landing-page wow moment only. Workspace
                header stays clean (the user is already in the product flow). */}
            {isColored && (
              <span
                className="hidden sm:inline-block overflow-hidden whitespace-nowrap
                  max-w-0 opacity-0
                  group-hover:max-w-[280px] group-hover:opacity-100
                  transition-[max-width,opacity] duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                  font-medium text-sm tracking-normal
                  text-emerald-700/75"
                aria-hidden
              >
                :&nbsp;Unlock your career potential
              </span>
            )}
          </span>
        </a>

        {/* Middle — subtle status */}
        {status && (
          <>
            <span
              className={`hidden sm:inline-block h-5 w-px ${
                isColored ? 'bg-emerald-300/60' : 'bg-slate-300/80'
              }`}
              aria-hidden
            />
            <span
              className={`hidden sm:block flex-1 min-w-0 text-sm truncate ${
                isColored ? 'text-emerald-900/70' : 'text-slate-500'
              }`}
            >
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
