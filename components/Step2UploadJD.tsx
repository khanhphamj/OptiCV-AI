
import React, { useState } from 'react';
import FileUpload from './FileUpload';
import { HiCheck, HiChevronLeft, HiSparkles, HiPencil, HiDocumentArrowUp } from 'react-icons/hi2';
import FileStatusDisplay from './FileStatusDisplay';
import LottieAnimation from './LottieAnimation';


interface Step2UploadJDProps {
  onUploadSuccess: (text: string, fileName: string) => void;
  onBack: () => void;
  cvFileName: string;
}

const Step2UploadJD: React.FC<Step2UploadJDProps> = ({ onUploadSuccess, onBack, cvFileName }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [pastedJd, setPastedJd] = useState('');
  const [fileData, setFileData] = useState<{ text: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileParsed = (text: string, name: string, size: number) => {
    setFileData({ text, name, size });
    setError(null);
  };
  
  const handleRemoveFile = () => {
    setFileData(null);
    setError(null);
  };

  const handleAnalyze = () => {
    setError(null);
    if (activeTab === 'paste') {
      if (pastedJd.trim().length < 50) {
        setError('Please paste a job description with at least 50 characters.');
        return;
      }
      onUploadSuccess(pastedJd, 'Pasted Job Description');
    } else if (fileData) {
      onUploadSuccess(fileData.text, fileData.name);
    }
  };

  const isAnalyzeDisabled = (activeTab === 'paste' && pastedJd.trim().length < 50) || (activeTab === 'upload' && !fileData);

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-200/30">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 font-headline">Step 2: Add Job Description</h2>
        <p className="mt-2 text-gray-600">Paste the job posting or upload the file for the role you're targeting.</p>
      </div>

      <div className="mt-8 space-y-4">
        <div className="bg-slate-100 border border-slate-200/80 rounded-xl p-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-full">
                      <HiCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                      <p className="font-semibold text-gray-800">CV: <span className="font-normal truncate">{cvFileName}</span></p>
                  </div>
              </div>
              <button onClick={onBack} className="text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors">Change CV</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => { setActiveTab('paste'); setError(null); }}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'paste' ? 'bg-white text-emerald-700 shadow' : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <HiPencil className="h-5 w-5" />
            Paste Text
          </button>
          <button
            onClick={() => { setActiveTab('upload'); setError(null); }}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'upload' ? 'bg-white text-emerald-700 shadow' : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <HiDocumentArrowUp className="h-5 w-5" />
            Upload File
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'paste' ? (
            <div className="relative">
              <textarea
                value={pastedJd}
                onChange={(e) => setPastedJd(e.target.value)}
                placeholder="Paste the complete job description here...&#10;&#10;Include:&#10;• Job title and requirements&#10;• Required skills and experience&#10;• Responsibilities and qualifications"
                style={{ height: '260px' }}
                className="w-full p-4 bg-slate-50 text-gray-800 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-colors shadow-inner hide-scrollbar"
              />
              <span className="absolute bottom-3 right-3 text-xs text-gray-500">
                {pastedJd.trim().length} characters
              </span>
            </div>
          ) : (
            <div>
              {!fileData ? (
                <FileUpload
                  onUploadSuccess={handleFileParsed}
                  onUploadStart={() => setError(null)}
                  onUploadError={setError}
                />
              ) : (
                 <FileStatusDisplay
                    fileName={fileData.name}
                    statusText="Ready for analysis"
                    onRemove={handleRemoveFile}
                    fileSize={fileData.size}
                  />
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-6 py-3.5 text-base font-semibold text-gray-800 shadow-sm border border-slate-300/50 hover:bg-slate-300 transition-all"
        >
          <HiChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzeDisabled}
          className="group relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-8 py-3.5 text-base font-semibold text-white shadow-lg border border-white/20 hover:bg-emerald-600 hover:shadow-emerald-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105"
        >
          <LottieAnimation
            animationPath="/animations/sparkles-loop-loader.json"
            className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-20 transition-opacity"
          />
          <span className="relative z-10 flex items-center gap-2">
            <HiSparkles className="h-5 w-5" />
            Analyze with AI
          </span>
        </button>
      </div>
    </div>
  );
};

export default Step2UploadJD;
