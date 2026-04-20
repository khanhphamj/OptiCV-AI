
import React, { useState, useCallback, useEffect } from 'react';
import { Step, AnalysisResult, AISuggestion, ValidationResult, StructuredJd, ImprovementLog, AnalysisSession, CvProfile, JobMatch, JobLocation } from './types';
import { STEPS, FIND_JOBS_STEPS, JOB_MATCH_THRESHOLD } from './constants';
import Header from './components/Header';
import StepIndicator from './components/StepIndicator';
import Step1UploadCV, { Step1Mode } from './components/Step1UploadCV';
import Step2UploadJD from './components/Step2UploadJD';
import Step2ReviewProfile from './components/Step2ReviewProfile';
import Step3JobMatches from './components/Step3JobMatches';
import Step3Analysis from './components/Step3Analysis';
import { analyzeCv, validateDocuments, structureJd, parseCvProfile } from './services/openAIService';
import { searchJobs, matchJobsToCv, buildSearchParams } from './services/jobSearchService';
import LoadingAnalysis from './components/LoadingAnalysis';
import Footer from './components/Footer';
import ResumeBanner from './components/ResumeBanner';
import { HiExclamationTriangle, HiChevronLeft } from 'react-icons/hi2';
import { trackEvent, trackPageView } from './utils/analytics';
import { usePersistedState, clearPersistedState } from './hooks/usePersistedState';
import { useLang } from './hooks/useLang';

export default function App() {
  const { t } = useLang();
  // Persisted state — survives refresh via localStorage.
  const [currentStep, setCurrentStep] = usePersistedState<Step>('currentStep', Step.UploadCV);
  const [cvText, setCvText] = usePersistedState<string>('cvText', '');
  const [cvFileName, setCvFileName] = usePersistedState<string>('cvFileName', '');
  const [jdText, setJdText] = usePersistedState<string>('jdText', '');
  const [jdFileName, setJdFileName] = usePersistedState<string>('jdFileName', '');

  const [analysisResult, setAnalysisResult] = usePersistedState<AnalysisResult | null>('analysisResult', null);
  const [structuredJd, setStructuredJd] = usePersistedState<StructuredJd | null>('structuredJd', null);
  const [analysisSessions, setAnalysisSessions] = usePersistedState<AnalysisSession[]>('analysisSessions', []);

  // Find-jobs flow state
  const [flowMode, setFlowMode] = usePersistedState<'upload-jd' | 'find-jobs'>('flowMode', 'upload-jd');
  const [cvProfile, setCvProfile] = usePersistedState<CvProfile | null>('cvProfile', null);
  const [jobMatches, setJobMatches] = usePersistedState<JobMatch[]>('jobMatches', []);
  const [jobSearchMeta, setJobSearchMeta] = usePersistedState<{ query: string; locationLabel: string }>(
    'jobSearchMeta',
    { query: '', locationLabel: '' }
  );

  // Transient state — never persisted.
  const [loadingStage, setLoadingStage] = useState<'validation' | 'analysis' | 'complete' | null>(null);
  const [isParsingProfile, setIsParsingProfile] = useState(false);
  const [jobSearchStage, setJobSearchStage] = useState<'searching' | 'matching' | null>(null);
  const [jobSearchError, setJobSearchError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<ValidationResult | null>(null);

  const [isAnimating, setIsAnimating] = useState(false);
  const [animationClass, setAnimationClass] = useState('animate__animated animate__fadeIn');

  // Resume banner — shown once on mount if a completed analysis exists.
  const [showResumeBanner, setShowResumeBanner] = useState<boolean>(() => {
    return !!analysisResult && analysisSessions.length > 0;
  });

  // Track initial page view with GA4 once on mount
  useEffect(() => {
    try {
      trackPageView();
    } catch {}
  }, []);

  const changeStep = (
    targetStep: Step,
    options: { isStartOver?: boolean; onStepChange?: () => void } = {}
  ) => {
    const { isStartOver = false, onStepChange } = options;
    if (isAnimating || targetStep === currentStep) return;

    setIsAnimating(true);
    const direction = targetStep > currentStep ? 'forward' : 'backward';
    const duration = 500; // Corresponds to animate__fast

    if (isStartOver) {
        setAnimationClass('animate__animated animate__fadeOut animate__fast');
    } else {
        setAnimationClass(direction === 'forward' ? 'animate__animated animate__slideOutLeft animate__fast' : 'animate__animated animate__slideOutRight animate__fast');
    }

    setTimeout(() => {
        if (onStepChange) {
            onStepChange();
        }
        
        setCurrentStep(targetStep);
        try { trackEvent('step_change', { step: targetStep }); } catch {}
        
        if (isStartOver) {
            setAnimationClass('animate__animated animate__fadeIn animate__fast');
        } else {
            setAnimationClass(direction === 'forward' ? 'animate__animated animate__slideInRight animate__fast' : 'animate__animated animate__slideInLeft animate__fast');
        }

        setTimeout(() => {
            setIsAnimating(false);
        }, duration);
    }, duration);
  };

  const handleCvUpload = (text: string, fileName: string, mode: Step1Mode = 'upload-jd') => {
    setCvText(text);
    setCvFileName(fileName);
    setError(null);
    try { trackEvent('cv_uploaded', { fileName, mode }); } catch {}

    if (mode === 'find-jobs') {
      setFlowMode('find-jobs');
      startProfileParse(text);
    } else {
      setFlowMode('upload-jd');
      changeStep(Step.UploadJD);
    }
  };

  const startProfileParse = useCallback(async (cv: string) => {
    setProfileError(null);
    setIsParsingProfile(true);
    changeStep(Step.ReviewProfile);
    try {
      const profile = await parseCvProfile(cv);
      setCvProfile(profile);
      try { trackEvent('cv_profile_parsed', { hasTitle: !!profile.title }); } catch {}
    } catch (e) {
      console.error(e);
      setProfileError(e instanceof Error ? e.message : 'Không thể phân tích CV.');
      setCvProfile({
        title: null, role: null, level: null, location: 'ho_chi_minh',
        skills: [], years_experience: null,
      });
    } finally {
      setIsParsingProfile(false);
    }
  }, []);

  const runJobSearch = useCallback(async (profile: CvProfile, location: JobLocation) => {
    setJobSearchError(null);
    setJobSearchStage('searching');
    setJobMatches([]);
    try {
      const params = buildSearchParams(profile, location);
      const search = await searchJobs(params);
      setJobSearchMeta({ query: search.query, locationLabel: search.locationLabel });

      if (search.results.length === 0) {
        setJobSearchStage(null);
        setJobMatches([]);
        return;
      }

      setJobSearchStage('matching');
      const topListings = search.results.slice(0, 10);
      const matches = await matchJobsToCv(cvText, topListings);
      setJobMatches(matches);
      try { trackEvent('job_search_completed', { count: matches.length }); } catch {}
    } catch (e) {
      console.error(e);
      setJobSearchError(e instanceof Error ? e.message : 'Không thể tìm việc làm.');
      try { trackEvent('job_search_failed'); } catch {}
    } finally {
      setJobSearchStage(null);
    }
  }, [cvText]);

  const handleProfileSubmit = (profile: CvProfile) => {
    setCvProfile(profile);
    changeStep(Step.JobMatches);
    runJobSearch(profile, profile.location ?? 'ho_chi_minh');
  };

  const handleBackFromJobMatches = () => {
    changeStep(Step.ReviewProfile);
  };

  const handleRetryJobSearch = () => {
    if (cvProfile) runJobSearch(cvProfile, cvProfile.location ?? 'ho_chi_minh');
  };

  const handleBackFromReview = () => {
    setFlowMode('upload-jd');
    changeStep(Step.UploadCV);
  };

  const handlePickJob = (match: JobMatch) => {
    const syntheticJd = `Position: ${match.title}\n${match.company ? `Company: ${match.company}\n` : ''}${match.location ? `Location: ${match.location}\n` : ''}Source: ${match.url}\n\n${match.jd_excerpt}`;
    setJdText(syntheticJd);
    setJdFileName(match.title || 'Job from Tavily search');
    setAnalysisSessions([]);
    setFlowMode('upload-jd');
    try { trackEvent('job_picked', { score: match.match_score, source: match.source }); } catch {}
    startFullAnalysis(cvText, syntheticJd);
  };

  const handleJdUploadAndAnalyze = (text: string, fileName:string) => {
    setJdText(text);
    setJdFileName(fileName);
    setAnalysisSessions([]); // Reset history on new analysis
    startFullAnalysis(cvText, text);
    try { trackEvent('jd_uploaded', { fileName }); } catch {}
  };

  const startFullAnalysis = useCallback(async (cv: string, jd: string) => {
    setError(null);
    setValidationWarning(null);
    changeStep(Step.Analysis);
    try { trackEvent('analysis_started'); } catch {}

    // Step 1: Validation
    setLoadingStage('validation');
    try {
      const validationResult = await validateDocuments(cv, jd);
      if (!validationResult.is_cv_valid || !validationResult.is_jd_valid) {
        setValidationWarning(validationResult);
        setLoadingStage(null);
        return; 
      }
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during validation.';
      setError(`Failed to validate documents. ${errorMessage}`);
      changeStep(Step.UploadJD);
      setLoadingStage(null);
      return;
    }

    // Step 2: If validation passes, run the main analysis
    await runActualAnalysis(cv, jd);
  }, []);
  
  const runActualAnalysis = useCallback(async (cv: string, jd: string) => {
    console.log('🚀 Starting analysis...', { cvLength: cv.length, jdLength: jd.length });
    setError(null);
    setValidationWarning(null);
    // Ensure we are on the Analysis step, but don't animate if already there.
    if (currentStep !== Step.Analysis) {
        changeStep(Step.Analysis);
    }
    setLoadingStage('analysis');

    try {
      console.log('📊 Agent đang phân tích CV + JD...');
      const startTime = Date.now();
      
      const [analysis, structured] = await Promise.all([
        analyzeCv(cv, jd),
        structureJd(jd)
      ]);
      
      const endTime = Date.now();
      console.log(`✅ Analysis completed in ${endTime - startTime}ms`, { 
        score: analysis.suitability_score,
        structured: !!structured 
      });
      
      setAnalysisResult(analysis);
      setStructuredJd(structured);

      setAnalysisSessions(prevSessions => {
        const scoreBefore = prevSessions.length > 0 ? prevSessions[prevSessions.length - 1].scoreAfter : null;
        const newSession: AnalysisSession = {
            id: prevSessions.length + 1,
            timestamp: new Date(),
            scoreBefore: scoreBefore,
            scoreAfter: analysis.suitability_score,
            improvements: [], // New session starts with an empty list of improvements.
        };
        return [...prevSessions, newSession];
      });

      setLoadingStage('complete');
      try { trackEvent('analysis_completed', { score: analysis.suitability_score }); } catch {}
    } catch (e) {
      console.error('❌ Analysis failed:', e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
      setError(`Failed to analyze documents. ${errorMessage}`);
      changeStep(Step.UploadJD);
      setLoadingStage(null);
      try { trackEvent('analysis_failed'); } catch {}
    }
  }, [currentStep]);
  
  const handleCancelAnalysis = () => {
    // In a real-world scenario, you'd use an AbortController to cancel the fetch request.
    setLoadingStage(null);
    setValidationWarning(null);
    changeStep(Step.UploadJD);
  };

  const handleLoadingComplete = () => {
    setLoadingStage(null);
  };

  const handleReanalyze = () => {
    runActualAnalysis(cvText, jdText);
    try { trackEvent('reanalyze_clicked'); } catch {}
  };

  const handleBack = () => {
    if (currentStep === Step.UploadJD) {
      changeStep(Step.UploadCV);
      setError(null);
    }
  };

  const handleStartOver = () => {
    const resetState = () => {
        setCvText('');
        setCvFileName('');
        setJdText('');
        setJdFileName('');
        setAnalysisResult(null);
        setStructuredJd(null);
        setLoadingStage(null);
        setError(null);
        setValidationWarning(null);
        setAnalysisSessions([]);
        setFlowMode('upload-jd');
        setCvProfile(null);
        setJobMatches([]);
        setJobSearchMeta({ query: '', locationLabel: '' });
        setJobSearchError(null);
        setProfileError(null);
        clearPersistedState();
        setShowResumeBanner(false);
    };
    changeStep(Step.UploadCV, { isStartOver: true, onStepChange: resetState });
  };
  
  const handleApplySuggestion = useCallback((suggestion: AISuggestion) => {
    setCvText(prev => prev.replace(suggestion.original, suggestion.replacement));
  }, []);

  const handleAddImprovementLog = useCallback((log: Omit<ImprovementLog, 'id' | 'timestamp'>) => {
    const newLog: ImprovementLog = {
      ...log,
      id: Date.now(),
      timestamp: new Date(),
    };
    setAnalysisSessions(prevSessions => {
        if (prevSessions.length === 0) {
            console.error("Attempted to add improvement log with no active analysis session.");
            return prevSessions;
        }
        const currentSession = prevSessions[prevSessions.length - 1];
        const updatedSession = {
            ...currentSession,
            improvements: [...currentSession.improvements, newLog],
        };
        return [...prevSessions.slice(0, -1), updatedSession];
    });
  }, []);


  const renderContent = () => {
    if (validationWarning) {
      const warnings: string[] = [];
      if (!validationWarning.is_cv_valid && validationWarning.cv_reason) {
        warnings.push(`${t('validation.cv_prefix')} ${validationWarning.cv_reason}`);
      }
      if (!validationWarning.is_jd_valid && validationWarning.jd_reason) {
        warnings.push(`${t('validation.jd_prefix')} ${validationWarning.jd_reason}`);
      }
       return (
        <div className="max-w-2xl mx-auto bg-amber-400/20 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl border border-amber-200/50 animate__animated animate__fadeInUp">
          <div className="text-center">
            <HiExclamationTriangle className="w-16 h-16 text-amber-500 mx-auto drop-shadow-lg" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">{t('validation.heading')}</h2>
            <p className="mt-2 text-gray-700">{t('validation.intro')}</p>
            <div className="mt-4 text-left bg-amber-200/20 p-4 rounded-lg border border-amber-200/30">
              <ul className="space-y-2 text-sm text-amber-900 list-disc list-inside">
                {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
              </ul>
            </div>
             <p className="mt-4 text-sm text-gray-600">{t('validation.risk')}</p>
          </div>
          <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                const resetValidation = () => setValidationWarning(null);
                changeStep(Step.UploadJD, { onStepChange: resetValidation });
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-white/30 backdrop-blur-md px-6 py-3 text-base font-semibold text-amber-900 shadow-lg border border-white/50 hover:bg-white/50 transition-all"
            >
              <HiChevronLeft className="h-4 w-4" />
              {t('validation.fix')}
            </button>
            <button
              onClick={() => runActualAnalysis(cvText, jdText)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 backdrop-blur-md px-8 py-3 text-base font-semibold text-white shadow-lg border border-white/20 hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 transition-all duration-200"
            >
              {t('validation.analyze_anyway')}
            </button>
          </div>
        </div>
      );
    }

    if (loadingStage && currentStep === Step.Analysis) {
      return <LoadingAnalysis stage={loadingStage} onCancel={handleCancelAnalysis} onComplete={handleLoadingComplete} />;
    }
    
    switch (currentStep) {
      case Step.UploadCV:
        return <Step1UploadCV onUploadSuccess={handleCvUpload} />;
      case Step.UploadJD:
        return <Step2UploadJD onUploadSuccess={handleJdUploadAndAnalyze} onBack={handleBack} cvFileName={cvFileName} />;
      case Step.ReviewProfile:
        return (
          <Step2ReviewProfile
            profile={cvProfile}
            isParsing={isParsingProfile}
            error={profileError}
            onSubmit={handleProfileSubmit}
            onBack={handleBackFromReview}
          />
        );
      case Step.JobMatches:
        return (
          <Step3JobMatches
            matches={jobMatches}
            isLoading={!!jobSearchStage}
            loadingStage={jobSearchStage}
            locationLabel={jobSearchMeta.locationLabel}
            query={jobSearchMeta.query}
            error={jobSearchError}
            onBack={handleBackFromJobMatches}
            onPickJob={handlePickJob}
            onRetry={handleRetryJobSearch}
            matchThreshold={JOB_MATCH_THRESHOLD}
          />
        );
      case Step.Analysis:
        return (
          <Step3Analysis
            result={analysisResult}
            analysisSessions={analysisSessions}
            cvText={cvText}
            structuredJd={structuredJd}
            jdText={jdText}
            onJdTextChange={setJdText}
            onCvTextChange={setCvText}
            onReanalyze={handleReanalyze}
            onStartOver={handleStartOver}
            isAnalyzing={!!loadingStage}
            onApplySuggestion={handleApplySuggestion}
            onAddImprovementLog={handleAddImprovementLog}
          />
        );
      default:
        return <Step1UploadCV onUploadSuccess={handleCvUpload} />;
    }
  };

  const latestScore = analysisSessions.length > 0
    ? analysisSessions[analysisSessions.length - 1].scoreAfter
    : analysisResult?.suitability_score ?? null;

  // App is a single-viewport workspace on lg+ — no page scroll in any state,
  // including loading and validation warning (their cards center in the main area).
  const isFitScreen = true;
  const isStep3Dashboard =
    currentStep === Step.Analysis && !loadingStage && !validationWarning;

  return (
    <div
      className={`app-bg font-sans flex flex-col relative ${
        isFitScreen ? 'min-h-screen lg:h-screen lg:overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Ambient color blobs — give liquid-glass surfaces something to refract */}
      <div className="ambient-blobs" aria-hidden="true">
        <div className="blob-accent" />
      </div>

      {showResumeBanner && (
        <ResumeBanner
          score={latestScore}
          onContinue={() => {
            setShowResumeBanner(false);
            try { trackEvent('session_resumed', { score: latestScore }); } catch {}
          }}
          onDiscard={() => {
            handleStartOver();
            try { trackEvent('session_discarded'); } catch {}
          }}
        />
      )}

      <div className="relative z-10 flex flex-col flex-grow lg:min-h-0">
      <Header
        status={
          loadingStage
            ? t('loading.title.analysis')
            : isStep3Dashboard && analysisResult
            ? `${t('analysis.overall')}: ${analysisResult.suitability_score}/100`
            : t(`step.${currentStep}.name` as any)
        }
      />

      {!isStep3Dashboard && (
        <div
          id="step-indicator"
          className="relative z-20 animate__animated animate__fadeIn animate__fast"
        >
          <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-3 lg:py-4">
            <StepIndicator steps={flowMode === 'find-jobs' ? FIND_JOBS_STEPS : STEPS} currentStep={currentStep} />
          </div>
        </div>
      )}

      <main
        className={`w-full ${
          isStep3Dashboard
            ? 'flex-grow p-1.5 sm:p-3 md:p-4 lg:p-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden lg:flex lg:flex-col'
            : isFitScreen
            ? 'flex-grow p-1.5 sm:p-3 md:p-4 lg:px-5 lg:pt-3 lg:pb-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden lg:flex lg:flex-col lg:items-center'
            : 'flex-grow p-1.5 sm:p-3 md:p-4 lg:p-6'
        }`}
      >
          {error && (
            <div className="max-w-3xl mx-auto bg-red-100 backdrop-blur-lg border border-red-500/20 text-red-900 px-4 py-3 rounded-xl mb-6 text-sm text-center shadow-lg animate__animated animate__shakeX">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div
            className={`${animationClass} w-full ${
              isStep3Dashboard ? 'lg:flex-1 lg:min-h-0 lg:flex lg:flex-col' : ''
            } ${
              isFitScreen && !isStep3Dashboard
                ? 'lg:flex-1 lg:min-h-0 lg:max-h-full lg:flex lg:flex-col lg:overflow-hidden'
                : ''
            }`}
          >
            {renderContent()}
          </div>
      </main>

      <Footer compact={isFitScreen} />
      </div>

    </div>
  );
}