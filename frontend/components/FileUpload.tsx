import React, { useState, useCallback } from 'react';
import { extractText } from '../services/fileParser';
import { HiCloudArrowUp, HiSparkles, HiDocumentText } from 'react-icons/hi2';
import LottieAnimation from './LottieAnimation';

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
      className={`relative group block w-full rounded-2xl p-10 cursor-pointer overflow-hidden animate-soft-rise transition-[transform,box-shadow,background-color] duration-300 ease-out
      ${
        dragOver
          ? 'bg-emerald-500/10 ring-4 ring-emerald-500/60 scale-[1.03] shadow-xl shadow-emerald-500/30'
          : 'bg-slate-50/60 ring-1 ring-slate-200 hover:ring-emerald-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-emerald-500/10 shadow-inner'
      }`}
    >
      {/* Ambient gradient glow — intensifies on hover/drag */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-1/2 -left-1/4 w-[150%] h-[200%] rounded-full blur-3xl transition-opacity duration-500 ${
          dragOver ? 'opacity-60' : 'opacity-0 group-hover:opacity-30'
        }`}
        style={{
          background:
            'radial-gradient(circle at 30% 40%, rgba(16,185,129,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(20,184,166,0.35) 0%, transparent 50%)',
        }}
      />

      {/* Animated dashed border overlay (idle + hover) */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 ${
          isParsing ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(16,185,129,0.35) 0 10px, transparent 10px 22px)',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor' as any,
          maskComposite: 'exclude' as any,
          padding: '1.5px',
          animation: dragOver ? 'upload-dash 1.2s linear infinite' : 'upload-dash 3.5s linear infinite',
        }}
      />

      <div className="relative z-10 text-center">
        {isParsing ? (
          <div className="flex flex-col items-center animate-reveal">
            <LottieAnimation
              animationPath="/animations/sparkles-loop-loader.json"
              className="w-28 h-28 -my-2"
              loop={true}
              autoplay={true}
            />
            <p className="mt-2 font-semibold text-slate-800 font-headline">Đang đọc tài liệu…</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <span>Trích xuất nội dung</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
            {parsingFileSize !== null && (
              <p className="mt-2 text-xs text-slate-400 font-mono">{formatFileSize(parsingFileSize)}</p>
            )}
          </div>
        ) : (
          <>
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              {/* Pulse ring behind icon while hovering */}
              <span
                aria-hidden
                className={`absolute inset-0 rounded-full bg-emerald-400/20 transition-all duration-500 ${
                  dragOver ? 'scale-125 opacity-100 animate-ping' : 'scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-60'
                }`}
              />
              <HiCloudArrowUp
                className={`relative h-16 w-16 transition-all duration-300 icon-float ${
                  dragOver
                    ? 'text-emerald-600 scale-110 -translate-y-1'
                    : 'text-slate-500 group-hover:text-emerald-600'
                }`}
              />
              {/* Floating sparkles on hover/drag */}
              <HiSparkles
                aria-hidden
                className={`absolute -top-1 -right-2 h-4 w-4 text-emerald-500 transition-all duration-300 ${
                  dragOver ? 'opacity-100 rotate-12 scale-125' : 'opacity-0 group-hover:opacity-80 group-hover:-rotate-6'
                }`}
              />
              <HiDocumentText
                aria-hidden
                className={`absolute -bottom-1 -left-2 h-4 w-4 text-teal-500 transition-all duration-500 ${
                  dragOver ? 'opacity-100 -rotate-12 scale-110' : 'opacity-0 group-hover:opacity-70'
                }`}
              />
            </div>
            <div className="mt-4 text-slate-800">
              <p className="font-semibold text-lg">
                {dragOver ? 'Thả file để tải lên!' : 'Kéo & thả file tại đây'}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                hoặc <span className="font-semibold text-emerald-600 group-hover:underline">chọn file từ thiết bị</span>
              </p>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">PDF, DOCX tối đa 5MB</p>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.docx" disabled={isParsing} />
          </>
        )}
      </div>
    </label>
  );
};

export default FileUpload;
