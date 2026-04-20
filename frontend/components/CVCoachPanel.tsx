

import React, { useState, useEffect, useRef, FormEvent, useMemo, KeyboardEvent } from 'react';
import { AnalysisResult, ChatMessage, AISuggestion, SubScores, CourseRecommendation, StructuredJd, ImprovementLog, AnalysisSession } from '../types';
import { startCoachChat, OpenAIChat } from '../services/openAIService';
import { trackEvent } from '../utils/analytics';
import { formatStructuredJdToMarkdown } from '../utils/jdFormatter';
import SuggestionCard from './SuggestionCard';
import CourseSuggestionCard from './CourseSuggestionCard';
import CoachProgressTracker from './CoachProgressTracker';
import CoachIcon from './CoachIcon';
import { HiPaperAirplane, HiArrowPath, HiArrowUturnLeft, HiDocumentArrowDown, HiSparkles } from 'react-icons/hi2';
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

const parseFullResponse = (responseText: string): ChatMessage[] => {
    let content = responseText;
    let suggestion: AISuggestion | undefined;
    let courseRecommendation: CourseRecommendation | undefined;
    let quickReplies: string[] | undefined;

    // Regex to find all JSON blocks
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
    const allJsonMatches = [...content.matchAll(jsonRegex)];
    
    for (const match of allJsonMatches) {
        try {
            const jsonObj = JSON.parse(match[1]);
            if (jsonObj.suggestion) {
                suggestion = jsonObj.suggestion;
                content = content.replace(match[0], '');
            } else if (jsonObj.course_recommendation) {
                courseRecommendation = jsonObj.course_recommendation;
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
    const messages: ChatMessage[] = [];

    // Create a single chat message object that can contain multiple parts
    if (content || suggestion || courseRecommendation || quickReplies) {
        messages.push({
            role: 'agent',
            content: content,
            suggestion: suggestion,
            courseRecommendation: courseRecommendation,
            quickReplies: quickReplies,
            timestamp: new Date(),
        });
    }

    return messages.filter(m => m.content || m.suggestion || m.courseRecommendation);
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

  const chatSession = useRef<OpenAIChat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    const metricKeys: Array<keyof SubScores> = ['keyword_match', 'experience_fit', 'skill_coverage', 'quantification'];

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
      // Initialize the chat with the documents that were analyzed.
      const jdTextForChat = structuredJd ? formatStructuredJdToMarkdown(structuredJd) : '';
      chatSession.current = startCoachChat(cvText, jdTextForChat, tasksForCoach);

      // Create initial greeting message from CV Coach
      const greetingMessage: ChatMessage = {
        role: 'agent',
        content: `Hello, I'm your CV Coach. I've analyzed your CV and the job description. We'll work through focused improvements with clear, actionable steps.\n\nAreas to address:\n${tasksForCoach.map(task => `- ${task}`).join('\n')}\n\nWe'll start with: ${tasksForCoach[0]}. If you prefer another language, just let me know.`,
        timestamp: new Date(),
        quickReplies: ["I'm ready", "Let's start", "Reply in Vietnamese"]
      };
      
      setChatHistory([greetingMessage]);
      setIsProgressExpanded(false);
    }
    // NOTE: `cvText` is intentionally omitted. The chat should only be re-initialized
    // when a full re-analysis is performed, not when the user applies a small suggestion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResult, structuredJd, tasksForCoach]);


  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleUserActionOnSuggestion = (action: 'apply' | 'reject', suggestion: AISuggestion) => {
    const confirmationMessage: ChatMessage = { role: 'agent', content: '', quickReplies: [], timestamp: new Date() };

    if (action === 'apply') {
      onApplySuggestion(suggestion);
      
      const taskName = tasksForCoach[allImprovements.length] || 'General Improvement';
      onAddImprovementLog({
        taskName: taskName,
        description: `Applied suggestion to improve ${taskName}.`,
        originalText: suggestion.original,
        replacementText: suggestion.replacement,
      });

      confirmationMessage.content = "Great, that change has been applied! Your CV is updated. We can continue discussing this point, or you can tell me what's next.";
      confirmationMessage.quickReplies = ["Let's move on", "Can we refine it more?"];
    } else { // action === 'reject'
      confirmationMessage.content = "Okay, I've discarded that suggestion. Do you want to try another approach for this point, or should we move on?";
      confirmationMessage.quickReplies = ["Try another way", "Let's move on"];
    }
    
    setChatHistory(prev => [...prev, confirmationMessage]);
  };
  
  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isThinking || !chatSession.current) return;

    const newUserMessage: ChatMessage = { role: 'user', content: message, timestamp: new Date() };
    setChatHistory(prev => [...prev, newUserMessage]);
    setIsThinking(true);
    setUserInput('');

    try {
      const stream = await chatSession.current.sendMessageStream({ message });
      
      let agentResponseText = '';
      for await (const chunk of stream) {
        agentResponseText += chunk.text;
      }

      const agentMessages = parseFullResponse(agentResponseText);
      
      setChatHistory(prev => {
          const newHistory = [...prev];
          const lastUserMessageIndex = newHistory.length - 1 - agentMessages.length;
          if (lastUserMessageIndex >= 0) {
            const lastUserMessage = newHistory[lastUserMessageIndex];
             if (lastUserMessage && lastUserMessage.quickReplies) {
                delete lastUserMessage.quickReplies;
             }
          }
          return [...newHistory, ...agentMessages];
      });

      if (agentMessages.length === 0) {
        console.warn("Could not parse messages from response:", agentResponseText);
        setChatHistory(prev => [...prev, { role: 'agent', content: t('coach.error_generic'), timestamp: new Date() }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory(prev => [...prev, { role: 'agent', content: t('coach.error_retry'), timestamp: new Date() }]);
    } finally {
      setIsThinking(false);
    }
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

  const lastAgentIdx = chatHistory.map((m) => m.role).lastIndexOf('agent');

  return (
    <div className="h-full w-full flex flex-col bg-white/40 overflow-hidden">
      {/* ─── Progress tracker (collapsible) ─── */}
      <div className="shrink-0 border-b border-slate-200/70 bg-white/60">
        <CoachProgressTracker
          sessions={analysisSessions}
          isExpanded={isProgressExpanded}
          onToggle={() => setIsProgressExpanded(p => !p)}
        />
      </div>

      {/* ─── Chat body ─── */}
      <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-emerald-50/25 via-transparent to-transparent">
        <div
          ref={chatContainerRef}
          className="flex-1 px-3 sm:px-4 py-3 space-y-3 overflow-y-auto smooth-scroll scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400"
        >
          {chatHistory.map((msg, index) => {
            const isAgent = msg.role === 'agent';
            return (
              <div
                key={index}
                className={`group flex gap-2 items-end ${
                  isAgent
                    ? 'justify-start animate__animated animate__fadeInLeft animate__faster'
                    : 'justify-end animate__animated animate__fadeInRight animate__faster'
                }`}
              >
                {/* Agent avatar — only on the latest agent message to reduce visual noise */}
                {isAgent && index === lastAgentIdx ? (
                  <div className="shrink-0 self-end">
                    <CoachIcon thinking={isThinking && index === chatHistory.length - 1} className="w-8 h-8" />
                  </div>
                ) : isAgent ? (
                  <div className="shrink-0 self-end w-8" aria-hidden />
                ) : null}

                <div
                  className={`flex flex-col gap-1 max-w-[82%] min-w-0 ${
                    isAgent ? 'items-start' : 'items-end'
                  }`}
                >
                  {msg.content && (
                    <>
                      <div
                        className={`relative px-3.5 py-2.5 text-sm leading-relaxed border ${
                          isAgent
                            ? 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border-slate-200/80 shadow-sm'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl rounded-br-sm border-transparent shadow-md shadow-emerald-500/25'
                        }`}
                        style={{ maxHeight: '16rem', overflowY: 'auto' }}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span
                        className={`text-[10px] text-slate-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isAgent ? 'text-left' : 'text-right'
                        }`}
                      >
                        {fmtTime(msg.timestamp)}
                      </span>
                    </>
                  )}

                  {msg.suggestion && (
                    <div className="w-full animate__animated animate__fadeInUp">
                      <SuggestionCard
                        suggestion={msg.suggestion}
                        onApply={(s) => handleUserActionOnSuggestion('apply', s)}
                        onReject={(s) => handleUserActionOnSuggestion('reject', s)}
                      />
                    </div>
                  )}
                  {msg.courseRecommendation && (
                    <div className="w-full animate__animated animate__fadeInUp">
                      <CourseSuggestionCard recommendation={msg.courseRecommendation} />
                    </div>
                  )}
                  {msg.quickReplies &&
                    msg.quickReplies.length > 0 &&
                    index === chatHistory.length - 1 &&
                    !isThinking && (
                      <div className={`flex flex-wrap gap-1.5 mt-1.5 ${isAgent ? 'justify-start' : 'justify-end'}`}>
                        {msg.quickReplies.map((reply, i) => (
                          <button
                            key={i}
                            onClick={() => handleQuickReply(reply)}
                            className="inline-flex items-center rounded-full border border-emerald-300/70 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 active:scale-95 transition shadow-sm"
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

          {/* Typing indicator — avatar already rendered above as thinking; show only dots */}
          {isThinking && (
            <div className="flex gap-2 items-end animate__animated animate__fadeInLeft animate__faster">
              <div className="shrink-0 self-end w-8" aria-hidden />
              <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* ─── Input composer ─── */}
        <div className="shrink-0 border-t border-slate-200/70 bg-white/90 px-3 sm:px-4 py-3">
          <form
            onSubmit={handleFormSubmit}
            className="flex items-end gap-2 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400 transition pl-4 pr-1.5 py-1.5"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('coach.input_placeholder')}
              className="flex-1 w-full py-2 text-sm text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none overflow-y-auto hide-scrollbar placeholder:text-slate-400"
              style={{ maxHeight: '100px' }}
              disabled={isThinking || isAnalyzing}
            />
            <button
              type="submit"
              disabled={isThinking || isAnalyzing || !userInput.trim()}
              aria-label={t('coach.send_aria')}
              className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-full text-white bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-emerald-500/25 active:scale-95"
            >
              <HiPaperAirplane className="w-4 h-4 -rotate-45 translate-x-[1px]" />
            </button>
          </form>
        </div>
      </div>

      {/* ─── Action toolbar ─── */}
      <div className="shrink-0 border-t border-slate-200/70 bg-slate-50/70 px-3 sm:px-4 py-1.5 flex items-center justify-end gap-1.5 mt-auto">
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70 transition"
        >
          <HiDocumentArrowDown className="h-3.5 w-3.5" />
          {t('coach.log')}
        </button>
        <button
          onClick={onStartOver}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50/70 transition"
        >
          <HiArrowUturnLeft className="h-3.5 w-3.5" />
          {t('coach.reset')}
        </button>
        <button
          onClick={onReanalyze}
          disabled={isAnalyzing}
          className="btn-sheen inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition"
        >
          {isAnalyzing ? (
            <><HiArrowPath className="h-3.5 w-3.5 animate-spin" /> {t('coach.reanalyzing')}</>
          ) : (
            <><HiSparkles className="h-3.5 w-3.5" /> {t('coach.reanalyze')}</>
          )}
        </button>
      </div>
    </div>
  );
};

export default CVCoachPanel;
