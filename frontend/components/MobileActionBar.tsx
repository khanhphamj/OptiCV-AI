import React from 'react';
import { HiArrowPath, HiArrowUturnLeft } from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';

interface MobileActionBarProps {
  onReanalyze: () => void;
  onStartOver: () => void;
  disabled?: boolean;
}

/**
 * Sticky bottom action bar on mobile/tablet (<lg).
 * Keeps primary actions reachable without scrolling back up.
 */
const MobileActionBar: React.FC<MobileActionBarProps> = ({ onReanalyze, onStartOver, disabled = false }) => {
  const { t } = useLang();
  return (
    <div
      className="liquid-glass lg:hidden fixed bottom-0 inset-x-0 z-40 border-t-0 animate-soft-rise"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
    >
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onStartOver}
          disabled={disabled}
          className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 active:scale-95 transition disabled:opacity-50"
        >
          <HiArrowUturnLeft className="h-4 w-4" />
          {t('action.start_over')}
        </button>
        <button
          type="button"
          onClick={onReanalyze}
          disabled={disabled}
          className="btn-sheen flex-[2] min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-md hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <HiArrowPath className={`h-4 w-4 ${disabled ? 'animate-spin' : ''}`} />
          {t('action.reanalyze')}
        </button>
      </div>
    </div>
  );
};

export default MobileActionBar;
