import React, { useState, useCallback } from 'react';
import { extractText } from '../services/fileParser';
import { HiArrowPath, HiCloudArrowUp } from 'react-icons/hi2/';

interface FileUploadProps {
  onUploadSuccess: (text: string, fileName: string, fileSize: number) => void;
  onUploadStart: () => void;
  onUploadError: (error: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadStart, onUploadError }) => {
  const [dragOver, setDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingFileSize, setParsingFileSize] = useState<number | null>(null);

  const handleFile = useCallback(async (file: File | null) => {
    if (!file) return;

    onUploadStart();
    setIsParsing(true);
    setParsingFileSize(file.size);

    if (file.size > 5 * 1024 * 1024) {
      onUploadError('File is too large. Please upload a file under 5MB.');
      setIsParsing(false);
      setParsingFileSize(null);
      return;
    }

    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type) && !file.name.endsWith('.docx')) {
      onUploadError('Invalid file type. Please upload a PDF or DOCX file.');
      setIsParsing(false);
      setParsingFileSize(null);
      return;
    }

    try {
      const text = await extractText(file);
      onUploadSuccess(text, file.name, file.size);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      onUploadError(errorMessage);
    } finally {
      setIsParsing(false);
      setParsingFileSize(null);
    }
  }, [onUploadSuccess, onUploadStart, onUploadError]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <label
      htmlFor="file-upload"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full flex justify-center rounded-2xl p-10 transition-all duration-300 cursor-pointer 
      ${
        dragOver 
          ? 'bg-emerald-500/10 ring-4 ring-emerald-500/50 scale-105' 
          : 'bg-black/5 shadow-inner'
      }`}
    >
      <div className="text-center">
        {isParsing ? (
          <div className="flex flex-col items-center">
              <HiArrowPath className="mx-auto h-12 w-12 text-gray-500 animate-spin" />
              <p className="mt-4 font-semibold text-gray-700">Parsing Document...</p>
              {parsingFileSize !== null && (
                <p className="mt-1 text-sm text-gray-500">{formatFileSize(parsingFileSize)}</p>
              )}
          </div>
        ) : (
           <>
              <HiCloudArrowUp className={`mx-auto h-16 w-16 transition-colors duration-200 ${dragOver ? 'text-emerald-600' : 'text-gray-500'}`} />
              <div className="mt-4 text-gray-700">
                <p className="font-semibold text-lg">
                  {dragOver ? 'Drop your file to upload!' : 'Drag & drop your file here'}
                </p>
                <p className="text-sm text-gray-500">
                  or <span className="font-semibold text-emerald-600">browse from your device</span>
                </p>
              </div>
              <p className="mt-4 text-xs leading-5 text-gray-500">PDF, DOCX up to 5MB</p>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.docx" disabled={isParsing} />
           </>
        )}
      </div>
    </label>
  );
};

export default FileUpload;