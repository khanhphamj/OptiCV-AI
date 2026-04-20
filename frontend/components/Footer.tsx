import React from 'react';
import { HiSparkles, HiEnvelope } from 'react-icons/hi2';

// Inline brand logos (avoid fragile icon package imports)
const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.95 3.2 9.14 7.64 10.62.56.1.77-.24.77-.54 0-.27-.01-.98-.02-1.92-3.11.68-3.76-1.5-3.76-1.5-.51-1.3-1.24-1.64-1.24-1.64-1.01-.7.08-.68.08-.68 1.12.08 1.71 1.16 1.71 1.16.99 1.71 2.6 1.22 3.24.93.1-.72.39-1.22.7-1.5-2.48-.28-5.08-1.24-5.08-5.52 0-1.22.44-2.22 1.16-3-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.11 1.15a10.8 10.8 0 0 1 5.66 0C17.8 4.73 18.75 5 18.75 5c.62 1.54.23 2.68.11 2.96.72.78 1.16 1.78 1.16 3 0 4.29-2.6 5.24-5.09 5.51.4.34.75 1.02.75 2.06 0 1.49-.01 2.69-.01 3.05 0 .3.2.64.78.54 4.44-1.48 7.63-5.67 7.63-10.62C23.25 5.48 18.27.5 12 .5z"/>
  </svg>
);

const LinkedInIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67h-3.55V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.37-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/>
  </svg>
);

// Simple heart glyph (hi2 HiHeart isn't exported in this version)
const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z"/>
  </svg>
);

interface FooterProps {
  compact?: boolean;
}

const Footer: React.FC<FooterProps> = ({ compact = false }) => {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`aurora-bg relative mt-auto text-white overflow-hidden transition-all duration-500 ${
        compact ? 'lg:py-0' : ''
      }`}
    >
      {/* Glass orbs + grain to match Header vibe */}
      <div className="aurora-orb orb-a" aria-hidden />
      <div className="aurora-orb orb-b" aria-hidden />
      <div className="noise-overlay" aria-hidden />

      {/* Compact single-row layout on lg+ when fit-screen */}
      {compact && (
        <div className="relative z-10 hidden lg:flex items-center justify-between max-w-6xl mx-auto px-4 lg:px-6 py-1.5 text-white/90 text-[11px]">
          <div className="flex items-center gap-2">
            <HiSparkles className="h-3.5 w-3.5 icon-float" />
            <span className="font-semibold">OptiCV&nbsp;AI</span>
            <span className="text-white/60">·</span>
            <span className="text-white/75">© {year} Phạm Phú Khánh</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="mailto:phukhanh1903@gmail.com" className="hover:text-white transition-colors">Support</a>
            <span className="text-white/40">|</span>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="hover:text-white transition-colors"
            >
              <GitHubIcon className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="hover:text-white transition-colors"
            >
              <LinkedInIcon className="h-3.5 w-3.5" />
            </a>
            <a
              href="mailto:phukhanh1903@gmail.com"
              aria-label="Email"
              className="hover:text-white transition-colors"
            >
              <HiEnvelope className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Full layout — shown on small screens OR when not compact */}
      <div
        className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${
          compact ? 'lg:hidden' : ''
        }`}
      >
        {/* Top row: brand + links + socials */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="liquid-glass-tinted p-2 rounded-xl">
              <HiSparkles className="h-5 w-5 text-white icon-float" />
            </div>
            <div>
              <p className="text-gradient-ice font-headline text-lg font-extrabold tracking-tight leading-none">
                OptiCV&nbsp;AI
              </p>
              <p className="text-[11px] text-white/75 mt-0.5">
                Match your CV to any job. Score, rewrite, ship.
              </p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a href="#" className="text-white/85 hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="text-white/85 hover:text-white transition-colors">
              Privacy
            </a>
            <a
              href="https://github.com/anthropics/claude-code/issues"
              target="_blank"
              rel="noreferrer"
              className="text-white/85 hover:text-white transition-colors"
            >
              Feedback
            </a>
            <a
              href="mailto:phukhanh1903@gmail.com"
              className="text-white/85 hover:text-white transition-colors"
            >
              Support
            </a>
          </nav>

          {/* Socials */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="liquid-glass-tinted inline-flex items-center justify-center h-9 w-9 rounded-full text-white/90 hover:text-white active:scale-95 transition"
            >
              <GitHubIcon className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="liquid-glass-tinted inline-flex items-center justify-center h-9 w-9 rounded-full text-white/90 hover:text-white active:scale-95 transition"
            >
              <LinkedInIcon className="h-4 w-4" />
            </a>
            <a
              href="mailto:phukhanh1903@gmail.com"
              aria-label="Email"
              className="liquid-glass-tinted inline-flex items-center justify-center h-9 w-9 rounded-full text-white/90 hover:text-white active:scale-95 transition"
            >
              <HiEnvelope className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* Bottom row: copyright + tech chips */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-white/80">
            <span>© {year} Phạm Phú Khánh.</span>
            <span>Crafted with</span>
            <HeartIcon className="h-3.5 w-3.5 text-pink-300" />
            <span>in Saigon.</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="liquid-glass-tinted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">
              React&nbsp;19
            </span>
            <span className="liquid-glass-tinted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">
              Vite&nbsp;6
            </span>
            <span className="liquid-glass-tinted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">
              FastAPI
            </span>
            <span className="liquid-glass-tinted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">
              <HiSparkles className="h-3 w-3" /> gpt-4.1-mini
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
