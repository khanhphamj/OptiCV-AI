import React from 'react';

interface MarkdownTextProps {
  text: string;
  className?: string;
}

/**
 * Tiny in-house Markdown renderer for chat bubbles. Handles only the subset
 * the CV Coach actually emits, on purpose:
 *
 *   - blank-line paragraph breaks
 *   - "- " or "* " bullet lists
 *   - **bold**
 *   - *italic*
 *   - `inline code`
 *
 * No heavy markdown library — keeps the bundle small and avoids HTML injection
 * (we only ever render text or whitelisted React elements). Tolerant of
 * partially-streamed input: an unclosed `**` or `\`` just renders as text
 * until the next chunk completes the pair.
 */

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string };

const PATTERNS: Array<{ type: InlineToken['type']; re: RegExp }> = [
  // Bold first so **foo** wins over *foo*
  { type: 'bold', re: /\*\*([^\n*][^\n]*?)\*\*/ },
  { type: 'code', re: /`([^`\n]+)`/ },
  { type: 'italic', re: /(?<![*])\*([^*\n]+)\*(?![*])/ },
];

function tokenizeInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = input;

  while (remaining.length > 0) {
    let earliest: { type: InlineToken['type']; idx: number; len: number; value: string } | null = null;

    for (const { type, re } of PATTERNS) {
      const m = remaining.match(re);
      if (!m || m.index === undefined) continue;
      if (earliest === null || m.index < earliest.idx) {
        earliest = { type, idx: m.index, len: m[0].length, value: m[1] };
      }
    }

    if (!earliest) {
      tokens.push({ type: 'text', value: remaining });
      break;
    }

    if (earliest.idx > 0) {
      tokens.push({ type: 'text', value: remaining.slice(0, earliest.idx) });
    }
    tokens.push({ type: earliest.type, value: earliest.value });
    remaining = remaining.slice(earliest.idx + earliest.len);
  }

  return tokens;
}

function renderInline(text: string, baseKey: string): React.ReactNode[] {
  const tokens = tokenizeInline(text);
  return tokens.map((tok, i) => {
    const key = `${baseKey}-${i}`;
    switch (tok.type) {
      case 'bold':
        return (
          <strong key={key} className="font-semibold text-slate-900">
            {tok.value}
          </strong>
        );
      case 'italic':
        return (
          <em key={key} className="italic">
            {tok.value}
          </em>
        );
      case 'code':
        return (
          <code
            key={key}
            className="px-1 py-0.5 mx-0.5 rounded bg-slate-100 text-[0.85em] text-slate-700 font-mono"
          >
            {tok.value}
          </code>
        );
      default:
        return <React.Fragment key={key}>{tok.value}</React.Fragment>;
    }
  });
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Split into blocks. A block is either:
  //   - a contiguous run of bullet lines ("- foo" / "* foo")
  //   - a paragraph (separated from the next block by a blank line OR a transition into bullets)
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let paragraphBuffer: string[] = [];
  let blockKey = 0;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const joined = paragraphBuffer.join('\n').trim();
    if (joined) {
      blocks.push(
        <p key={`p-${blockKey++}`} className="whitespace-pre-wrap leading-relaxed">
          {renderInline(joined, `p-${blockKey}`)}
        </p>,
      );
    }
    paragraphBuffer = [];
  };

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    blocks.push(
      <ul key={`ul-${blockKey++}`} className="list-disc pl-5 space-y-1 leading-relaxed marker:text-emerald-500">
        {bulletBuffer.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blockKey}-${i}`)}</li>
        ))}
      </ul>,
    );
    bulletBuffer = [];
  };

  for (const rawLine of lines) {
    const bulletMatch = rawLine.match(/^\s*[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }

    if (rawLine.trim() === '') {
      flushBullets();
      flushParagraph();
      continue;
    }

    // Non-blank, non-bullet — append to paragraph buffer (also flushes any
    // open bullet group so a sentence after bullets becomes its own block).
    flushBullets();
    paragraphBuffer.push(rawLine);
  }
  flushBullets();
  flushParagraph();

  return <div className={`space-y-2 ${className}`}>{blocks}</div>;
};

export default MarkdownText;
