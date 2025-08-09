

import React, { useState, useEffect, useRef, FormEvent, useMemo, KeyboardEvent } from 'react';
import { AnalysisResult, ChatMessage, AISuggestion, SubScores, CourseRecommendation, StructuredJd, ImprovementLog, AnalysisSession } from '../types';
import { startCoachChat, OpenAIChat } from '../services/openAIService';
import SuggestionCard from './SuggestionCard';
import CourseSuggestionCard from './CourseSuggestionCard';
import CoachProgressTracker from './CoachProgressTracker';
import { HiSparkles, HiPaperAirplane, HiArrowPath, HiArrowUturnLeft, HiDocumentArrowDown, HiCheck, HiOutlineClipboardDocumentList, HiPencil } from 'react-icons/hi2';
import LottieAnimation from './LottieAnimation';

declare const showdown: any;

interface CVCoachPanelProps {
  analysisResult: AnalysisResult;
  cvText: string;
  structuredJd: StructuredJd | null;
  jdText: string;
  onJdTextChange: (text: string) => void;
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

const formatStructuredJdToMarkdown = (jd: StructuredJd | null): string => {
    if (!jd) {
        return "### Analyzing Job Description...\n\nPlease wait while the AI structures the document.";
    }

    const output: string[] = [];

    // --- HEADER ---
    const header = [jd.job_title, jd.company_name].filter(Boolean).join(' | ');
    if (header) {
        output.push(`### ${header}`);
    }

    // --- POSITION INFO ---
    const positionInfo: string[] = [];
    if (jd.location) positionInfo.push(`**📍 Location:** ${jd.location}`);
    if (jd.work_type) positionInfo.push(`**💼 Type:** ${jd.work_type}`);
    if (jd.salary) positionInfo.push(`**💰 Salary:** ${jd.salary}`);
    if (jd.experience_required) positionInfo.push(`**⏰ Experience:** ${jd.experience_required}`);
    if (jd.education_required) positionInfo.push(`**🎓 Education:** ${jd.education_required}`);

    if (positionInfo.length > 0) {
        output.push('## 🏢 Position Information');
        output.push(positionInfo.join('\n'));
    }

    // --- JOB DESCRIPTION ---
    if (jd.job_summary) {
        output.push('## 🎯 Job Description');
        output.push(jd.job_summary);
    }
    
    // --- KEY RESPONSIBILITIES ---
    if (jd.key_responsibilities && jd.key_responsibilities.length > 0) {
        output.push('## Key Responsibilities');
        output.push(jd.key_responsibilities.map(item => `- ${item}`).join('\n'));
    }

    // --- CANDIDATE REQUIREMENTS ---
    if (jd.requirements) {
        const reqs: string[] = [];
        if (jd.requirements.mandatory) {
            const mandatoryItems: string[] = [];
            if (jd.requirements.mandatory.education) mandatoryItems.push(`Education: ${jd.requirements.mandatory.education}`);
            if (jd.requirements.mandatory.experience) mandatoryItems.push(`Experience: ${jd.requirements.mandatory.experience}`);
            if (jd.requirements.mandatory.technical_skills?.length > 0) mandatoryItems.push(`Technical Skills: ${jd.requirements.mandatory.technical_skills.join(', ')}`);
            if (jd.requirements.mandatory.languages?.length > 0) mandatoryItems.push(`Languages: ${jd.requirements.mandatory.languages.join(', ')}`);
            
            if (mandatoryItems.length > 0) {
                reqs.push('### Mandatory');
                reqs.push(mandatoryItems.join('\n\n'));
            }
        }
        if (jd.requirements.preferred?.length > 0) {
            reqs.push('### Preferred');
            reqs.push(jd.requirements.preferred.map(item => `- ${item}`).join('\n'));
        }
        if (reqs.length > 0) {
            output.push('## ✅ Candidate Requirements');
            output.push(...reqs);
        }
    }
    
    // --- BENEFITS & PERKS ---
    if (jd.benefits) {
        const bens: string[] = [];
        if (jd.benefits.salary_and_bonus?.length > 0) {
            bens.push('### Salary & Bonus');
            bens.push(jd.benefits.salary_and_bonus.map(item => `- ${item}`).join('\n'));
        }
        if (jd.benefits.welfare?.length > 0) {
            bens.push('### Welfare');
            bens.push(jd.benefits.welfare.map(item => `- ${item}`).join('\n'));
        }
        if (bens.length > 0) {
            output.push('## 🎁 Benefits & Perks');
            output.push(...bens);
        }
    }

    // --- APPLICATION INFO ---
    if (jd.application_info) {
        const appInfo: string[] = [];
        if (jd.application_info.deadline) appInfo.push(`**🗓️ Deadline:** ${jd.application_info.deadline}`);
        if (jd.application_info.vacancies) appInfo.push(`**👥 Vacancies:** ${jd.application_info.vacancies}`);
        if (jd.application_info.contact) appInfo.push(`**📧 Contact:** ${jd.application_info.contact}`);
        if (jd.application_info.how_to_apply) appInfo.push(`**🌐 How to Apply:** ${jd.application_info.how_to_apply}`);
        if (appInfo.length > 0) {
            output.push('## 📞 Application Information');
            output.push(appInfo.join('\n'));
        }
    }

    // --- REQUIRED DOCUMENTS ---
    if (jd.required_documents && jd.required_documents.length > 0) {
        output.push('## Required Documents');
        output.push(jd.required_documents.map(item => `- ${item}`).join('\n'));
    }

    // --- ABOUT COMPANY ---
    if (jd.company_summary) {
        output.push('## 🏭 About the Company');
        output.push(jd.company_summary);
    }

    // --- WHY CHOOSE US ---
    if (jd.why_choose_us && jd.why_choose_us.length > 0) {
        output.push('## 🌟 Why Choose Us');
        output.push(jd.why_choose_us.map(item => `- ${item}`).join('\n'));
    }
    
    output.push('\n*We are committed to creating a diverse and equal opportunity work environment for all candidates.*');

    return output.join('\n\n').trim();
};


const CVCoachPanel: React.FC<CVCoachPanelProps> = ({
  analysisResult,
  cvText,
  structuredJd,
  jdText,
  onJdTextChange,
  onApplySuggestion,
  onReanalyze,
  onStartOver,
  isAnalyzing,
  analysisSessions,
  onAddImprovementLog,
}) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<'coach' | 'preview-jd'>('coach');
  const [isJdEditing, setIsJdEditing] = useState(false);
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);

  const chatSession = useRef<OpenAIChat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        setChatHistory(prev => [...prev, { role: 'agent', content: "Sorry, I couldn't process that. Could you try rephrasing?", timestamp: new Date() }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory(prev => [...prev, { role: 'agent', content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }]);
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
        alert("You haven't applied any suggestions yet. Apply some suggestions from the CV Coach to download a change log.");
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
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg border border-slate-200/30 overflow-hidden">
      <CoachProgressTracker
        sessions={analysisSessions}
        isExpanded={isProgressExpanded}
        onToggle={() => setIsProgressExpanded(p => !p)}
      />
      <header className="flex-grow-0 flex-shrink-0 flex items-center justify-between p-1 sm:p-1.5 lg:p-2 border-b border-slate-200">
        <div className="flex-grow flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => { setActiveTab('coach'); setIsJdEditing(false); }}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all ${
                  activeTab === 'coach' ? 'bg-slate-100 text-emerald-700 shadow-sm' : 'text-gray-600 hover:bg-slate-100/50'
              }`}
            >
              <HiSparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">CV Coach</span>
              <span className="sm:hidden">Coach</span>
            </button>
             <button
               onClick={() => setActiveTab('preview-jd')}
               className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all ${
                  activeTab === 'preview-jd' ? 'bg-slate-100 text-emerald-700 shadow-sm' : 'text-gray-600 hover:bg-slate-100/50'
              }`}
            >
               <HiOutlineClipboardDocumentList className="w-4 h-4 sm:w-5 sm:h-5" />
               <span className="hidden sm:inline">Preview JD</span>
               <span className="sm:hidden">JD</span>
            </button>
        </div>
         {activeTab === 'preview-jd' && (
          <div className="mr-2">
            <button onClick={() => setIsJdEditing(p => !p)} className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300/50 hover:bg-slate-100 transition-colors">
              {isJdEditing ? (
                <>
                  <HiCheck className="h-4 w-4 text-emerald-600" /> Done Editing
                </>
              ) : (
                <>
                  <HiPencil className="h-4 w-4 text-gray-500" /> Edit JD
                </>
              )}
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
        {activeTab === 'coach' && (
          <>
            <div ref={chatContainerRef} className="flex-1 p-4 space-y-5 overflow-y-auto smooth-scroll scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`group flex w-full items-end ${
                    msg.role === 'agent' 
                    ? 'justify-start animate__animated animate__fadeInLeft animate__faster' 
                    : 'justify-end animate__animated animate__fadeInRight animate__faster'
                }`}>
                  <div className={`flex flex-col gap-2 max-w-[85%] min-w-0 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.content && (
                        <div 
                            title={`Sent at ${msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            className={`p-3 sm:p-4 rounded-xl shadow-md ${
                                msg.role === 'agent' 
                                ? 'bg-white text-gray-800 rounded-es-none border border-slate-200/80' 
                                : 'bg-emerald-600 text-white rounded-ee-none shadow-emerald-500/20'
                            }`}
                            style={{ maxHeight: '16rem', overflowY: 'auto' }}
                        >
                            <p className={`font-normal whitespace-pre-wrap ${
                                msg.role === 'agent' ? 'chat-message-agent' : 'chat-message-user'
                            }`}>{msg.content}</p>
                        </div>
                    )}
                    {msg.suggestion && (
                      <div className="animate__animated animate__fadeInUp">
                        <SuggestionCard
                          suggestion={msg.suggestion}
                          onApply={(s) => handleUserActionOnSuggestion('apply', s)}
                          onReject={(s) => handleUserActionOnSuggestion('reject', s)}
                        />
                      </div>
                    )}
                    {msg.courseRecommendation && (
                        <div className="animate__animated animate__fadeInUp">
                            <CourseSuggestionCard recommendation={msg.courseRecommendation} />
                        </div>
                    )}
                    {msg.quickReplies && msg.quickReplies.length > 0 && index === chatHistory.length - 1 && !isThinking && (
                        <div className={`flex flex-wrap gap-2 mt-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.quickReplies.map((reply, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleQuickReply(reply)}
                                    className="px-3 py-1.5 text-sm font-semibold text-emerald-800 bg-white rounded-full ring-1 ring-inset ring-emerald-300 hover:bg-emerald-50 hover:ring-emerald-500 transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>
                    )}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="flex items-end animate__animated animate__fadeInLeft animate__faster">
                  <div className="flex flex-col gap-1">
                    <div className="flex w-full max-w-[320px] items-center space-x-2 leading-1.5 p-3 rounded-xl bg-white rounded-es-none shadow-md border border-slate-200/80">
                      <p className="text-sm text-gray-500">Thinking...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white/70">
              <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your response here..."
                  className="flex-1 w-full px-3 py-2 text-sm-consistent text-gray-800 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition shadow-inner resize-none overflow-y-auto hide-scrollbar"
                  style={{ maxHeight: '100px' }}
                  disabled={isThinking || isAnalyzing}
                />
                <button
                  type="submit"
                  disabled={isThinking || isAnalyzing || !userInput.trim()}
                  className="flex-shrink-0 p-1.5 sm:p-2 h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:bg-gray-400/80 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 transition-colors shadow-lg"
                >
                  <HiPaperAirplane className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </form>
            </div>
          </>
        )}
        {activeTab === 'preview-jd' && (
          isJdEditing ? (
             <div className="flex-1 p-2 overflow-y-auto bg-slate-50 hide-scrollbar">
                <textarea
                    value={jdText}
                    onChange={(e) => onJdTextChange(e.target.value)}
                    placeholder="Job Description text goes here..."
                    className="w-full h-full p-4 font-mono text-sm resize-none bg-slate-100 border-2 border-emerald-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner hide-scrollbar"
                />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-slate-50 smooth-scroll scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400">
                <div
                    className="h-full bg-white m-2 rounded-2xl p-4 md:p-5 prose prose-sm max-w-none border border-slate-200"
                    dangerouslySetInnerHTML={{ __html: jdAsHtml }}
                />
            </div>
          )
        )}
      </div>

      <div className="bg-slate-100 border-t border-slate-200 p-1.5 sm:p-2 lg:p-2.5 rounded-b-lg sm:rounded-b-xl lg:rounded-b-2xl mt-auto">
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2">
          <button onClick={onStartOver} className="inline-flex items-center gap-1 rounded-md bg-white px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300/50 hover:bg-slate-50 transition-colors">
            <HiArrowUturnLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> 
            <span className="hidden sm:inline">Start Over</span>
            <span className="sm:hidden">Reset</span>
          </button>
          <button onClick={handleDownload} className="inline-flex items-center gap-1 rounded-md bg-white px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold text-gray-800 shadow-sm ring-1 ring-inset ring-gray-300/50 hover:bg-slate-50 transition-colors">
            <HiDocumentArrowDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> 
            <span className="hidden sm:inline">Download</span>
            <span className="sm:hidden">Save</span>
          </button>
          <button onClick={onReanalyze} disabled={isAnalyzing} className="group relative overflow-hidden inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed border border-emerald-700/50 hover:scale-105">
            <LottieAnimation
              animationPath="/animations/sparkles-loop-loader.json"
              className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-20 transition-opacity"
            />
            <span className="relative z-10 flex items-center gap-1">
              {isAnalyzing ? (
                <><HiArrowPath className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" /> <span className="hidden sm:inline">Analyzing...</span><span className="sm:hidden">...</span></>
              ) : (
                <><HiSparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Re-analyze</span><span className="sm:hidden">Analyze</span></>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CVCoachPanel;
