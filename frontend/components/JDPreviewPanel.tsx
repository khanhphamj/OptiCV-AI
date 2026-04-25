import React, { useMemo, useState } from 'react';
import { HiPencil, HiCheck, HiOutlineClipboardDocumentList } from 'react-icons/hi2';
import { StructuredJd } from '../types';
import { formatStructuredJdToMarkdown } from '../utils/jdFormatter';
import { useLang } from '../hooks/useLang';

declare const showdown: any;

interface JDPreviewPanelProps {
  structuredJd: StructuredJd | null;
  jdText: string;
  onJdTextChange: (text: string) => void;
}

const JDPreviewPanel: React.FC<JDPreviewPanelProps> = ({ structuredJd, jdText, onJdTextChange }) => {
  const { t } = useLang();
  const [isEditing, setIsEditing] = useState(false);

  const jdAsHtml = useMemo(() => {
    const markdown = formatStructuredJdToMarkdown(structuredJd);
    if (typeof showdown !== 'undefined' && markdown) {
      const converter = new showdown.Converter({
        simpleLineBreaks: true,
        tables: true,
        ghCompatibleHeaderId: true,
      });
      return converter.makeHtml(markdown);
    }
    return `<pre style="white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem;">${markdown}</pre>`;
  }, [structuredJd]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header row */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-200/60 bg-white/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-sm">
            <HiOutlineClipboardDocumentList className="h-4 w-4 text-white" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-slate-800 font-headline truncate">
            {t('jd.title')}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((e) => !e)}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition shrink-0"
        >
          {isEditing ? (
            <>
              <HiCheck className="h-4 w-4 text-emerald-600" /> {t('jd.done')}
            </>
          ) : (
            <>
              <HiPencil className="h-4 w-4 text-slate-500" /> {t('jd.edit_raw')}
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto smooth-scroll scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 bg-slate-50/60">
        {isEditing ? (
          <div className="h-full p-3 sm:p-4">
            <textarea
              value={jdText}
              onChange={(e) => onJdTextChange(e.target.value)}
              placeholder={t('jd.raw_placeholder')}
              className="w-full h-full min-h-[360px] p-3 sm:p-4 font-mono text-sm resize-none bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner hide-scrollbar"
            />
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <div
              className="bg-white rounded-xl p-4 md:p-5 prose prose-sm max-w-none border border-slate-200/80 shadow-sm"
              dangerouslySetInnerHTML={{ __html: jdAsHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default JDPreviewPanel;
