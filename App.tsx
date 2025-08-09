
import React, { useState, useCallback, useEffect } from 'react';
import { Step, AnalysisResult, AISuggestion, ValidationResult, StructuredJd, ImprovementLog, AnalysisSession } from './types';
import { STEPS } from './constants';
import Header from './components/Header';
import StepIndicator from './components/StepIndicator';
import Step1UploadCV from './components/Step1UploadCV';
import Step2UploadJD from './components/Step2UploadJD';
import Step3Analysis from './components/Step3Analysis';
import { analyzeCv, validateDocuments, structureJd } from './services/openAIService';
import LoadingAnalysis from './components/LoadingAnalysis';
import Footer from './components/Footer';
import { HiExclamationTriangle, HiChevronLeft } from 'react-icons/hi2';
import { trackEvent, trackPageView } from './utils/analytics';

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.UploadCV);
  const [cvText, setCvText] = useState<string>('');
  const [cvFileName, setCvFileName] = useState<string>('');
  const [jdText, setJdText] = useState<string>('');
  const [jdFileName, setJdFileName] = useState<string>('');
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [structuredJd, setStructuredJd] = useState<StructuredJd | null>(null);
  const [analysisSessions, setAnalysisSessions] = useState<AnalysisSession[]>([]);
  
  const [loadingStage, setLoadingStage] = useState<'validation' | 'analysis' | 'complete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<ValidationResult | null>(null);

  const [isAnimating, setIsAnimating] = useState(false);
  const [animationClass, setAnimationClass] = useState('animate__animated animate__fadeIn');

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

  const handleCvUpload = (text: string, fileName: string) => {
    setCvText(text);
    setCvFileName(fileName);
    changeStep(Step.UploadJD);
    setError(null);
    try { trackEvent('cv_uploaded', { fileName }); } catch {}
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
      console.log('📊 Calling Gemini APIs...');
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
      const warnings = [];
      if (!validationWarning.is_cv_valid && validationWarning.cv_reason) {
        warnings.push(`For your CV: ${validationWarning.cv_reason}`);
      }
      if (!validationWarning.is_jd_valid && validationWarning.jd_reason) {
        warnings.push(`For the Job Description: ${validationWarning.jd_reason}`);
      }
       return (
        <div className="max-w-2xl mx-auto bg-amber-400/20 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl border border-amber-200/50 animate__animated animate__fadeInUp">
          <div className="text-center">
            <HiExclamationTriangle className="w-16 h-16 text-amber-500 mx-auto drop-shadow-lg" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Content Warning</h2>
            <p className="mt-2 text-gray-700">Our AI has flagged a potential issue with your documents:</p>
            <div className="mt-4 text-left bg-amber-200/20 p-4 rounded-lg border border-amber-200/30">
              <ul className="space-y-2 text-sm text-amber-900 list-disc list-inside">
                {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
              </ul>
            </div>
             <p className="mt-4 text-sm text-gray-600">This might lead to inaccurate analysis. We recommend going back to fix it.</p>
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
              Go Back & Fix
            </button>
            <button
              onClick={() => runActualAnalysis(cvText, jdText)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 backdrop-blur-md px-8 py-3 text-base font-semibold text-white shadow-lg border border-white/20 hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 transition-all duration-200"
            >
              Analyze Anyway
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

  return (
    <div className="min-h-screen font-sans flex flex-col bg-slate-100">
      <Header />
      
      <div id="step-indicator" className="relative z-20 -mt-16">
        <div className="max-w-5xl mx-auto py-2 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6">
            <StepIndicator steps={STEPS} currentStep={currentStep} />
        </div>
      </div>

      <main className="flex-grow p-1.5 sm:p-3 md:p-4 lg:p-6 w-full">
        <div className="max-w-6xl mx-auto">
          {useEffect(() => { try { trackPageView(); } catch {} }, [])}
          {error && (
            <div className="max-w-3xl mx-auto bg-red-100 backdrop-blur-lg border border-red-500/20 text-red-900 px-4 py-3 rounded-xl mb-6 text-sm text-center shadow-lg animate__animated animate__shakeX">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div className={animationClass}>
            {renderContent()}
          </div>
        </div>
      </main>
      
      <Footer />

    </div>
  );
}