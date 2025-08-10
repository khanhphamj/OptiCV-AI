import React, { useState } from 'react';
import FileUpload from './FileUpload';
import FileStatusDisplay from './FileStatusDisplay';
import { HiChevronRight } from 'react-icons/hi2';

interface Step1UploadCVProps {
  onUploadSuccess: (text: string, fileName: string) => void;
}

const Step1UploadCV: React.FC<Step1UploadCVProps> = ({ onUploadSuccess }) => {
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
  
  const handleProceed = () => {
    setError(null);
    if (fileData) {
      onUploadSuccess(fileData.text, fileData.name);
    }
  };

  const isProceedDisabled = !fileData;

  return (
    <div className="w-full sm:max-w-xl md:max-w-2xl mx-auto bg-white p-3 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200/30">
      <div className="text-center">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 font-headline">Step 1: Upload Your CV</h2>
        <p className="mt-1 text-sm sm:text-base text-gray-600">Upload your resume file. Use your most recent CV for the best results.</p>
      </div>

      <div className="mt-3 sm:mt-5 md:mt-6 space-y-3 sm:space-y-4">
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
              statusText="Ready to continue!"
              onRemove={handleRemoveFile}
              fileSize={fileData.size}
            />
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-2 rounded-md border border-red-200 flex items-center gap-2">
            <span role="img" aria-label="Warning icon">⚠️</span>
            <span><strong>Error:</strong> {error}</span>
          </div>
        )}
      </div>

      <div className="mt-5 sm:mt-6 text-center">
        <button
          onClick={handleProceed}
          disabled={isProceedDisabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-lg border border-white/20 hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none group"
        >
          <span>Continue to Job Description</span>
          <HiChevronRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default Step1UploadCV;