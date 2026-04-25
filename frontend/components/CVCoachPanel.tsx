

import React, { useState, useEffect, useRef, FormEvent, useMemo, KeyboardEvent } from 'react';
import { AnalysisResult, ChatMessage, AISuggestion, SubScores, CourseRecommendation, StructuredJd, ImprovementLog, AnalysisSession } from '../types';
import { startCoachChat, OpenAIChat, ChatAbortedError } from '../services/openAIService';
import { trackEvent } from '../utils/analytics';
import { formatStructuredJdToMarkdown } from '../utils/jdFormatter';
import SuggestionCard from './SuggestionCard';
import CourseSuggestionCard from './CourseSuggestionCard';
import CoachProgressTracker from './CoachProgressTracker';
import CoachIcon from './CoachIcon';
import MarkdownText from './MarkdownText';
import { HiPaperAirplane, HiArrowPath, HiArrowUturnLeft, HiDocumentArrowDown, HiSparkles, HiClipboard, HiCheck, HiStop, HiExclamationTriangle } from 'react-icons/hi2';
import { useLang } from '../hooks/useLang';

interface CVCoachPanelProps {
  analysisResult: AnalysisResult;
  cvText: string;
  structuredJd: StructuredJd | null;
  onApplySuggestion: (suggestion: AISuggestion) => void;
  onReanalyze: () => void;
  onStartOver: () => void;
  isAnalyzing: boolean;
  analysisSessions: AnalysisSession[];
  onAddImprovementLog: (log: Omit<ImprovementLog, 'id' | 'timestamp'>) => void;
}

/** Hide machine-readable directives (```json suggestion blocks, [QUICK_REPLIES:...])
 *  from the live streaming bubble so the user only sees prose while tokens are
 *  arriving. parseFullResponse still extracts them at the end of the stream and
 *  renders them as cards / quick-reply chips. Tolerates partial/unfinished tags. */
const maskUnfinishedDirectives = (content: string): string => {
  let out = content;
  // Closed json blocks
  out = out.replace(/```json[\s\S]*?```/g, '');
  // Unfinished json block (no closing fence yet — everything from ```json to end)
  out = out.replace(/```json[\s\S]*$/g, '');
  // Closed quick replies
  out = out.replace(/\[QUICK_REPLIES:[^\]]*\]/g, '');
  // Unfinished quick replies (no closing bracket yet)
  out = out.replace(/\[QUICK_REPLIES:[^\]]*$/g, '');
  // Trailing whitespace/newlines that may collapse weirdly between blocks
  return out.replace(/\n{3,}/g, '\n\n').trimEnd();
};

const parseFullResponse = (responseText: string): ChatMessage[] => {
    let content = responseText;
    const suggestions: AISuggestion[] = [];
    const courseRecommendations: CourseRecommendation[] = [];
    let quickReplies: string[] | undefined;

    // Collect every fenced JSON block. Earlier versions only kept the last
    // suggestion (a one-line bug — `suggestion = ...` overwrote the prior one),
    // which caused multi-edit replies to render only a single card.
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
    const allJsonMatches = [...content.matchAll(jsonRegex)];

    for (const match of allJsonMatches) {
        try {
            const jsonObj = JSON.parse(match[1]);
            if (jsonObj.suggestion) {
                suggestions.push(jsonObj.suggestion);
                content = content.replace(match[0], '');
            } else if (jsonObj.course_recommendation) {
                courseRecommendations.push(jsonObj.course_recommendation);
                content = content.replace(match[0], '');
            }
        } catch (e) {
            console.warn("Could not parse a JSON block:", e);
        }
    }

    // Extract quick replies
    const quickRepliesRegex = /\[QUICK_REPLIES:(.*?)\]/s;
    const quickRepliesMatch = content.match(quickRepliesRegex);
    if (quickRepliesMatch?.[1]) {
        try {
            quickReplies = JSON.parse(`[${quickRepliesMatch[1]}]`);
            content = content.replace(quickRepliesMatch[0], '');
        } catch (e) {
            console.warn("Could not parse quick replies:", e);
        }
    }

    content = content.trim();
    const hasSuggestions = suggestions.length > 0;
    const hasCourses = courseRecommendations.length > 0;

    if (!content && !hasSuggestions && !hasCourses && !quickReplies) {
        return [];
    }

    return [
        {
            role: 'agent',
            content,
            suggestions: hasSuggestions ? suggestions : undefined,
            courseRecommendations: hasCourses ? courseRecommendations : undefined,
            quickReplies,
            timestamp: new Date(),
        },
    ];
};

const CVCoachPanel: React.FC<CVCoachPanelProps> = ({
  analysisResult,
  cvText,
  structuredJd,
  onApplySuggestion,
  onReanalyze,
  onStartOver,
  isAnalyzing,
  analysisSessions,
  onAddImprovementLog,
}) => {
  const { t } = useLang();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  /** When the previous send failed, holds the original message + error so the
   *  user can hit Retry without having to re-type it. Cleared on success/abort. */
  const [retryState, setRetryState] = useState<{ message: string; error: string } | null>(null);

  const chatSession = useRef<OpenAIChat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Active stream's controller — Stop button calls .abort() on it. */
  const abortRef = useRef<AbortController | null>(null);
  /** Pinned to the latest user message DOM node so we can scroll it into view
   *  ChatGPT-style (user msg at viewport top, leaving room for the reply). */
  const lastUserRef = useRef<HTMLDivElement | null>(null);
  /** Pinned to the latest agent message DOM node — used to detect when the
   *  streaming reply overflows the visible area so we can switch from
   *  "pinned-to-user" to "follow-bottom" mode automatically. */
  const lastAgentRef = useRef<HTMLDivElement | null>(null);
  /** Tracks whether the user is anchored near the bottom — drives whether
   *  streaming chunks auto-scroll the container. */
  const isAtBottomRef = useRef<boolean>(true);
  /** Previous chatHistory length, so we can detect "new message added" vs.
   *  "existing message content updated by streaming". */
  const prevHistoryLenRef = useRef<number>(0);
  /** Per-bubble suggestion action tally. Keyed by the source message index in
   *  chatHistory; cleared once the bubble's confirmation has been pushed.
   *  taskName is locked at first action so all suggestions in the same bubble
   *  log under the same focus area (avoids cross-task labelling on batches). */
  const pendingActionsRef = useRef<
    Map<number, { applied: number; rejected: number; total: number; taskName: string }>
  >(new Map());

  const allImprovements = useMemo(() => analysisSessions.flatMap(s => s.improvements), [analysisSessions]);

  const tasksForCoach = useMemo(() => {
    if (!analysisResult) {
      return [];
    }
    // If score is 95 or higher, no coaching tasks are needed.
    if (analysisResult.suitability_score >= 95) {
        return [];
    }
    
    const { sub_scores } = analysisResult;
    const tasks: string[] = [];
    // HR-priority order: most-impactful weaknesses surface first as coach
    // tasks. Optional keys (older persisted analyses) are skipped via the
    // `subScore && …` guard.
    const metricKeys: Array<keyof SubScores> = [
      'role_alignment',
      'skill_coverage',
      'experience_fit',
      'recency',
      'quantification',
      'keyword_match',
    ];

    for (const key of metricKeys) {
      const subScore = sub_scores[key];
      if (subScore && subScore.score < 90) {
        const areaName = key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        tasks.push(`${areaName}`);
      }
    }
    return tasks;
  }, [analysisResult]);

  // Effect to auto-resize the textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        // Reset height to allow shrinking
        textarea.style.height = 'auto';
        // Set height to match content
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [userInput]);


  // This effect runs ONLY when a new analysis result is available.
  useEffect(() => {
    if (analysisResult) {
      // Cancel any in-flight stream from a prior session before re-initializing.
      abortRef.current?.abort();
      abortRef.current = null;

      // Initialize the chat with the documents that were analyzed.
      const jdTextForChat = structuredJd ? formatStructuredJdToMarkdown(structuredJd) : '';
      chatSession.current = startCoachChat(cvText, jdTextForChat, tasksForCoach);

      const opener = t('coach.greeting.opener');
      const tail =
        tasksForCoach.length > 0
          ? t('coach.greeting.first_focus').replace('{area}', tasksForCoach[0])
          : t('coach.greeting.no_tasks');

      const greetingMessage: ChatMessage = {
        role: 'agent',
        content: `${opener}\n\n${tail}`,
        tasks: tasksForCoach.length > 0 ? tasksForCoach : undefined,
        timestamp: new Date(),
        quickReplies: [t('coach.quick.ready'), t('coach.quick.start'), t('coach.quick.lang')],
      };

      setChatHistory([greetingMessage]);
      setIsProgressExpanded(false);
      setRetryState(null);
      pendingActionsRef.current.clear();
    }
    // NOTE: `cvText` is intentionally omitted. The chat should only be re-initialized
    // when a full re-analysis is performed, not when the user applies a small suggestion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResult, structuredJd, tasksForCoach]);

  // Abort any in-flight request if the panel unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);


  // ChatGPT-style scroll behavior:
  //   1. When the user sends a message, smooth-scroll that user bubble to the
  //      top of the viewport. The reply renders below in the freed space.
  //   2. While "pinned" (isAtBottomRef=false) keep the user message at the top
  //      until the streaming reply overflows the visible area. Once the agent
  //      bubble's bottom edge would be cut off, snap to follow-bottom mode.
  //   3. In follow-bottom mode, every chunk keeps scrollTop at scrollHeight.
  //   4. handleContainerScroll re-evaluates the anchor on manual scroll, so
  //      scrolling up at any time pauses the auto-follow.
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const prevLen = prevHistoryLenRef.current;
    const lenGrew = chatHistory.length > prevLen;
    prevHistoryLenRef.current = chatHistory.length;
    const last = chatHistory[chatHistory.length - 1];

    if (lenGrew && last?.role === 'user') {
      // Pre-set anchor so the placeholder push that follows doesn't yank to bottom.
      isAtBottomRef.current = false;
      requestAnimationFrame(() => {
        const node = lastUserRef.current;
        if (!node) return;
        container.scrollTo({
          top: Math.max(0, node.offsetTop - 12),
          behavior: 'smooth',
        });
      });
      return;
    }

    if (!isAtBottomRef.current) {
      // Pinned-to-user mode. Only flip to follow once the reply overflows.
      const agent = lastAgentRef.current;
      if (!agent) return;
      const visibleBottom = container.scrollTop + container.clientHeight;
      const agentBottom = agent.offsetTop + agent.offsetHeight;
      if (agentBottom > visibleBottom - 8) {
        isAtBottomRef.current = true;
        container.scrollTop = container.scrollHeight;
      }
      return;
    }

    // Anchored to bottom — keep the latest token in view.
    container.scrollTop = container.scrollHeight;
  }, [chatHistory]);

  // Track whether the user is "anchored to bottom" so streaming auto-scroll
  // doesn't fight a manual scroll-up.
  const handleContainerScroll = () => {
    const c = chatContainerRef.current;
    if (!c) return;
    isAtBottomRef.current = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
  };

  /** Build the single confirmation message that appears once every suggestion
   *  in a bubble has been actioned. Adapts to the applied/rejected mix. */
  const buildBatchConfirmation = (applied: number, rejected: number): ChatMessage => {
    const total = applied + rejected;
    let content: string;
    let quickReplies: string[];

    if (rejected === 0) {
      content =
        total === 1
          ? t('coach.applied_msg')
          : t('coach.applied_msg_n').replace('{n}', String(applied));
      quickReplies = [t('coach.applied_quick.move'), t('coach.applied_quick.refine')];
    } else if (applied === 0) {
      content =
        total === 1
          ? t('coach.rejected_msg')
          : t('coach.rejected_msg_n').replace('{n}', String(rejected));
      quickReplies = [t('coach.rejected_quick.try'), t('coach.rejected_quick.move')];
    } else {
      content = t('coach.mixed_msg')
        .replace('{applied}', String(applied))
        .replace('{rejected}', String(rejected));
      quickReplies = [t('coach.applied_quick.move'), t('coach.applied_quick.refine')];
    }

    return { role: 'agent', content, quickReplies, timestamp: new Date() };
  };

  const handleUserActionOnSuggestion = (
    action: 'apply' | 'reject',
    suggestion: AISuggestion,
    messageIdx: number,
  ) => {
    // Look up (or initialize) the action tally for this bubble. taskName is
    // captured the first time we touch the bubble — every later apply in this
    // batch logs under the same focus area, even if applying earlier ones bumps
    // allImprovements.length forward.
    const tracker = pendingActionsRef.current;
    let stats = tracker.get(messageIdx);
    if (!stats) {
      const sourceMsg = chatHistory[messageIdx];
      const total = sourceMsg?.suggestions?.length ?? 1;
      const taskName = tasksForCoach[doneTasks] || 'General Improvement';
      stats = { applied: 0, rejected: 0, total, taskName };
      tracker.set(messageIdx, stats);
    }

    if (action === 'apply') {
      onApplySuggestion(suggestion);
      onAddImprovementLog({
        taskName: stats.taskName,
        description: `Applied suggestion to improve ${stats.taskName}.`,
        originalText: suggestion.original,
        replacementText: suggestion.replacement,
      });
      stats.applied += 1;
    } else {
      stats.rejected += 1;
    }

    // Only push the single confirmation once every card in the bubble has
    // been actioned. This collapses 3 individual "Applied!" toasts into one.
    if (stats.applied + stats.rejected >= stats.total) {
      const confirmation = buildBatchConfirmation(stats.applied, stats.rejected);
      setChatHistory(prev => [...prev, confirmation]);
      tracker.delete(messageIdx);
    }
  };
  
  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply);
  };

  const handleSendMessage = async (message: string, opts?: { resend?: boolean }) => {
    const trimmed = message.trim();
    if (!trimmed || isThinking || !chatSession.current) return;

    setRetryState(null);

    if (!opts?.resend) {
      setChatHistory(prev => {
        // Strip quick replies from the prior agent message so users can't re-trigger them.
        const next = prev.map((m, i) =>
          i === prev.length - 1 && m.quickReplies ? { ...m, quickReplies: undefined } : m,
        );
        next.push({ role: 'user', content: trimmed, timestamp: new Date() });
        return next;
      });
      setUserInput('');
    }

    setIsThinking(true);

    // Push a placeholder agent message that we'll incrementally fill as
    // tokens stream in. Capture its index for targeted updates.
    let placeholderIdx = -1;
    setChatHistory(prev => {
      placeholderIdx = prev.length;
      return [...prev, { role: 'agent', content: '', timestamp: new Date() }];
    });

    const controller = new AbortController();
    abortRef.current = controller;

    let assembled = '';
    let aborted = false;
    try {
      for await (const chunk of chatSession.current.sendMessageStream({ message: trimmed, signal: controller.signal })) {
        assembled += chunk.text;
        // Live-update only if not aborted (avoid a final flicker after Stop).
        if (controller.signal.aborted) break;
        // Mask json/quick-reply directives so the user sees clean prose while
        // tokens arrive — full text is still parsed at the end of the stream.
        const visible = maskUnfinishedDirectives(assembled);
        setChatHistory(prev => {
          if (placeholderIdx < 0 || placeholderIdx >= prev.length) return prev;
          const next = [...prev];
          next[placeholderIdx] = { ...next[placeholderIdx], content: visible };
          return next;
        });
      }
    } catch (error) {
      if (error instanceof ChatAbortedError) {
        aborted = true;
      } else {
        console.error('Chat error:', error);
        // Drop the empty placeholder and surface a retry banner so the user
        // can resend the same prompt without retyping it.
        setChatHistory(prev =>
          placeholderIdx >= 0 && placeholderIdx < prev.length
            ? prev.filter((_, i) => i !== placeholderIdx)
            : prev,
        );
        setRetryState({ message: trimmed, error: t('coach.error_retry') });
        setIsThinking(false);
        abortRef.current = null;
        return;
      }
    }

    abortRef.current = null;

    if (aborted) {
      // Keep whatever streamed in (masked). If nothing arrived, drop the placeholder.
      const visible = maskUnfinishedDirectives(assembled);
      setChatHistory(prev => {
        if (placeholderIdx < 0 || placeholderIdx >= prev.length) return prev;
        if (!visible.trim()) return prev.filter((_, i) => i !== placeholderIdx);
        const next = [...prev];
        next[placeholderIdx] = {
          ...next[placeholderIdx],
          content: `${visible.trimEnd()}\n\n— ${t('coach.stopped')}`,
        };
        return next;
      });
      setIsThinking(false);
      return;
    }

    // Stream finished — replace the placeholder with parsed structured messages
    // (text + optional suggestion / course / quick replies extracted from JSON blocks).
    const agentMessages = parseFullResponse(assembled);
    setChatHistory(prev => {
      if (placeholderIdx < 0 || placeholderIdx >= prev.length) return prev;
      const without = prev.filter((_, i) => i !== placeholderIdx);
      if (agentMessages.length > 0) return [...without, ...agentMessages];
      // Empty parse means the model returned nothing useful — surface a soft error.
      return [...without, { role: 'agent', content: t('coach.error_generic'), timestamp: new Date() }];
    });

    setIsThinking(false);
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleRetry = () => {
    if (!retryState) return;
    const { message } = retryState;
    setRetryState(null);
    handleSendMessage(message, { resend: true });
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(userInput);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendMessage(userInput);
  };

  const handleDownload = () => {
    if (allImprovements.length === 0) {
        alert(t('coach.download_log.empty'));
        return;
    }

    let content = "AI-Powered CV Optimizer - Improvement Log\n";
    content += `Generated on: ${new Date().toLocaleString()}\n\n`;
    
    [...analysisSessions].reverse().forEach((session, sessionIndex) => {
        content += `========================================\n`;
        content += `ANALYSIS RUN #${analysisSessions.length - sessionIndex}\n`;
        content += `Timestamp: ${session.timestamp.toLocaleString()}\n`;
        if (session.scoreBefore !== null) {
            const diff = session.scoreAfter - session.scoreBefore;
            content += `Score Change: ${session.scoreBefore} -> ${session.scoreAfter} (${diff >= 0 ? '+' : ''}${diff} pts)\n`;
        } else {
            content += `Initial Score: ${session.scoreAfter}\n`;
        }
        content += `----------------------------------------\n\n`;

        if (session.improvements.length > 0) {
            [...session.improvements].reverse().forEach((log, logIndex) => {
                content += `Update #${session.improvements.length - logIndex}: ${log.taskName}\n`;
                content += `Original: "${log.originalText.trim()}"\n`;
                content += `Updated:  "${log.replacementText.trim()}"\n\n`;
            });
        } else {
            content += "No changes were applied in this run.\n\n";
        }
    });
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cv_improvement_log.txt';
    document.body.appendChild(link);
    link.click();
    try { trackEvent('download_clicked', { items: allImprovements.length }); } catch {}
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fmtTime = (t: Date) =>
    t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleCopyMessage = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(prev => (prev === idx ? null : prev)), 1500);
    } catch {
      // clipboard blocked — silently ignore
    }
  };

  const totalTasks = tasksForCoach.length;
  const doneTasks = Math.min(allImprovements.length, totalTasks);

  const lastAgentIdx = chatHistory.map((m) => m.role).lastIndexOf('agent');
  const lastUserIdx = chatHistory.map((m) => m.role).lastIndexOf('user');

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-b from-white via-emerald-50/20 to-white">
      {/* ─── Chat header ─── */}
      <div className="shrink-0 border-b border-slate-200/60 bg-white/70 backdrop-blur px-3 sm:px-4 py-2.5 flex items-center gap-3">
        <div className="shrink-0">
          <CoachIcon className="w-9 h-9" thinking={isThinking} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {t('coach.title')}
            </h3>
            {totalTasks > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/70 tabular-nums">
                {doneTasks}/{totalTasks}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                isThinking ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isThinking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
              {isThinking ? '…' : 'online'}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 truncate">
            {t('coach.subtitle')}
          </p>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDownload}
            title={t('coach.log')}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70 transition"
          >
            <HiDocumentArrowDown className="h-4 w-4" />
            <span className="hidden sm:inline">{t('coach.log')}</span>
          </button>
          <button
            onClick={onStartOver}
            title={t('coach.reset')}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50/70 transition"
          >
            <HiArrowUturnLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('coach.reset')}</span>
          </button>
          <button
            onClick={onReanalyze}
            disabled={isAnalyzing}
            className="btn-sheen inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition"
          >
            {isAnalyzing ? (
              <><HiArrowPath className="h-4 w-4 animate-spin" /> <span className="hidden sm:inline">{t('coach.reanalyzing')}</span></>
            ) : (
              <><HiSparkles className="h-4 w-4" /> <span className="hidden sm:inline">{t('coach.reanalyze')}</span></>
            )}
          </button>
        </div>
      </div>

      {/* ─── Progress tracker (collapsible) ─── */}
      <div className="shrink-0">
        <CoachProgressTracker
          sessions={analysisSessions}
          isExpanded={isProgressExpanded}
          onToggle={() => setIsProgressExpanded(p => !p)}
        />
      </div>

      {/* ─── Chat body ─── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          ref={chatContainerRef}
          onScroll={handleContainerScroll}
          className="flex-1 px-3 sm:px-4 py-4 space-y-3 overflow-y-auto smooth-scroll scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400"
        >
          {chatHistory.map((msg, index) => {
            const isAgent = msg.role === 'agent';
            const isLatestAgent = isAgent && index === lastAgentIdx;
            const isLatestUser = !isAgent && index === lastUserIdx;
            const rowRef = isLatestUser ? lastUserRef : isLatestAgent ? lastAgentRef : undefined;
            return (
              <div
                key={index}
                ref={rowRef}
                className={`group flex gap-2 items-end ${
                  isAgent
                    ? 'justify-start animate__animated animate__fadeInLeft animate__faster'
                    : 'justify-end animate__animated animate__fadeInRight animate__faster'
                }`}
              >
                {/* Agent avatar — only on the latest agent message to reduce visual noise */}
                {isLatestAgent ? (
                  <div className="shrink-0 self-end">
                    <CoachIcon className="w-7 h-7" thinking={isThinking} />
                  </div>
                ) : isAgent ? (
                  <div className="shrink-0 self-end w-7" aria-hidden />
                ) : null}

                <div
                  className={`flex flex-col gap-1.5 max-w-[82%] min-w-0 ${
                    isAgent ? 'items-start' : 'items-end'
                  }`}
                >
                  {(msg.content || (isLatestAgent && isThinking)) && (
                    <div className="relative w-full">
                      <div
                        className={`relative px-3.5 py-2.5 text-sm leading-relaxed border ${
                          isAgent
                            ? 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_-8px_rgba(15,23,42,0.12)]'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl rounded-br-sm border-transparent shadow-md shadow-emerald-500/25'
                        }`}
                      >
                        {msg.content ? (
                          isAgent ? (
                            <div className="relative">
                              <MarkdownText text={msg.content} />
                              {isLatestAgent && isThinking && (
                                <span
                                  aria-hidden
                                  className="inline-block w-[2px] h-[0.95em] -mb-[2px] ml-[1px] bg-emerald-500 align-middle animate-pulse"
                                />
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        )}
                      </div>

                      {/* Hover meta — copy + timestamp */}
                      {msg.content && (
                        <div
                          className={`mt-1 flex items-center gap-2 text-[10px] text-slate-400 ${
                            isAgent ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          {isAgent && (
                            <button
                              onClick={() => handleCopyMessage(msg.content, index)}
                              className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              aria-label={t('coach.copy')}
                            >
                              {copiedIdx === index ? (
                                <><HiCheck className="h-3 w-3" /> {t('coach.copied')}</>
                              ) : (
                                <><HiClipboard className="h-3 w-3" /> {t('coach.copy')}</>
                              )}
                            </button>
                          )}
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                            {fmtTime(msg.timestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Focus-areas card — vertical task list with progress states.
                       done = check + strike, current = highlight + arrow,
                       pending = ring outline. */}
                  {msg.tasks && msg.tasks.length > 0 && (
                    <div className="w-full max-w-md rounded-2xl border border-emerald-200/80 bg-white shadow-sm shadow-emerald-500/[0.05] overflow-hidden animate__animated animate__fadeInUp">
                      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/60 to-transparent">
                        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-emerald-700">
                          <HiSparkles className="h-3.5 w-3.5" />
                          {t('coach.greeting.tasks_label')}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/70 tabular-nums">
                          {doneTasks}/{msg.tasks.length}
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {msg.tasks.map((task, i) => {
                          const isDone = i < doneTasks;
                          const isCurrent = i === doneTasks;
                          return (
                            <li
                              key={i}
                              className={`flex items-center gap-2.5 px-3.5 py-2 ${
                                isCurrent ? 'bg-emerald-50/70' : ''
                              }`}
                            >
                              <span
                                className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold tabular-nums ${
                                  isDone
                                    ? 'bg-emerald-500 text-white'
                                    : isCurrent
                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30'
                                    : 'bg-white text-slate-500 ring-1 ring-inset ring-slate-300'
                                }`}
                              >
                                {isDone ? <HiCheck className="h-3 w-3" /> : i + 1}
                              </span>
                              <span
                                className={`text-[13px] leading-snug min-w-0 truncate ${
                                  isDone
                                    ? 'text-slate-400 line-through'
                                    : isCurrent
                                    ? 'font-semibold text-emerald-900'
                                    : 'text-slate-700'
                                }`}
                              >
                                {task}
                              </span>
                              {isCurrent && (
                                <span className="ml-auto shrink-0 inline-flex items-center text-[10px] font-bold tracking-wider uppercase text-emerald-700">
                                  Now
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    msg.suggestions.length === 1 ? (
                      <div className="w-full animate__animated animate__fadeInUp">
                        <SuggestionCard
                          suggestion={msg.suggestions[0]}
                          onApply={(suggestion) => handleUserActionOnSuggestion('apply', suggestion, index)}
                          onReject={(suggestion) => handleUserActionOnSuggestion('reject', suggestion, index)}
                        />
                      </div>
                    ) : (
                      <div className="w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.05] overflow-hidden divide-y divide-slate-100 animate__animated animate__fadeInUp">
                        {msg.suggestions.map((s, sIdx) => (
                          <SuggestionCard
                            key={sIdx}
                            suggestion={s}
                            onApply={(suggestion) => handleUserActionOnSuggestion('apply', suggestion, index)}
                            onReject={(suggestion) => handleUserActionOnSuggestion('reject', suggestion, index)}
                            bare
                            index={sIdx + 1}
                            total={msg.suggestions!.length}
                          />
                        ))}
                      </div>
                    )
                  )}
                  {msg.courseRecommendations && msg.courseRecommendations.length > 0 && (
                    <div className="w-full flex flex-col gap-2 animate__animated animate__fadeInUp">
                      {msg.courseRecommendations.map((rec, rIdx) => (
                        <CourseSuggestionCard key={rIdx} recommendation={rec} />
                      ))}
                    </div>
                  )}
                  {msg.quickReplies &&
                    msg.quickReplies.length > 0 &&
                    index === chatHistory.length - 1 &&
                    !isThinking && (
                      <div className={`flex flex-wrap gap-1.5 mt-0.5 ${isAgent ? 'justify-start' : 'justify-end'}`}>
                        {msg.quickReplies.map((reply, i) => (
                          <button
                            key={i}
                            onClick={() => handleQuickReply(reply)}
                            className="inline-flex items-center gap-1 rounded-full bg-white border border-emerald-200/80 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm shadow-emerald-500/[0.06] hover:bg-emerald-50 hover:border-emerald-300 active:scale-[0.98] transition"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            );
          })}

        </div>

        {/* ─── Input composer ─── */}
        <div className="shrink-0 border-t border-slate-200/60 bg-white/70 backdrop-blur px-3 sm:px-4 pt-2.5 pb-3">
          {retryState && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs text-rose-800 animate__animated animate__fadeIn animate__faster">
              <HiExclamationTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <p className="flex-1 truncate">{retryState.error}</p>
              <button
                onClick={handleRetry}
                disabled={isThinking || isAnalyzing}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 shadow-sm hover:bg-rose-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <HiArrowPath className="h-3 w-3" />
                {t('coach.retry')}
              </button>
            </div>
          )}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-end gap-2 rounded-2xl bg-white border border-slate-200/80 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/30 transition pl-3.5 pr-1.5 py-1.5 shadow-sm"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('coach.input_placeholder')}
              className="flex-1 w-full py-2 text-sm text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none overflow-y-auto hide-scrollbar placeholder:text-slate-400"
              style={{ maxHeight: '120px' }}
              disabled={isThinking || isAnalyzing}
            />
            {isThinking ? (
              <button
                type="button"
                onClick={handleStop}
                aria-label={t('coach.stop')}
                title={t('coach.stop')}
                className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl text-white bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 transition-all duration-200 shadow-md shadow-rose-500/25 active:scale-95"
              >
                <HiStop className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isAnalyzing || !userInput.trim()}
                aria-label={t('coach.send_aria')}
                className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl text-white bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-emerald-500/25 active:scale-95"
              >
                <HiPaperAirplane className="w-4 h-4 -rotate-45 translate-x-[1px]" />
              </button>
            )}
          </form>
          <p className="mt-1.5 px-1 text-[10px] text-slate-400 hidden sm:block">
            {t('coach.shortcut_hint')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CVCoachPanel;
