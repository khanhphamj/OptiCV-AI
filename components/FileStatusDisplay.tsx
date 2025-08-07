import React from 'react';
import FileTypeIcon from './FileTypeIcon';
import { HiXCircle, HiCheckCircle } from 'react-icons/hi2/';

interface FileStatusDisplayProps {
  fileName: string;
  statusText: string;
  onRemove: () => void;
  fileSize?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileStatusDisplay: React.FC<FileStatusDisplayProps> = ({ fileName, statusText, onRemove, fileSize }) => {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between transition-all duration-300 shadow-sm animate__animated animate__fadeIn">
      <div className="flex items-center gap-3 min-w-0">
        <FileTypeIcon fileName={fileName} />
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-gray-800 text-sm md:text-base truncate" title={fileName}>
            {fileName}
          </span>
          <div className="flex items-center gap-1.5 text-emerald-700 text-sm font-medium">
            <HiCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{statusText}</span>
            {typeof fileSize === 'number' && (
              <>
                <span className="text-gray-400 mx-1">·</span>
                <span className="font-mono text-gray-500 text-xs">{formatFileSize(fileSize)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <button 
        onClick={onRemove} 
        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-4"
        aria-label={`Remove file ${fileName}`}
      >
        <HiXCircle className="h-7 w-7" />
      </button>
    </div>
  );
};

export default FileStatusDisplay;