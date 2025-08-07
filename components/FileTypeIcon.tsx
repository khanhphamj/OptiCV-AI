
import React from 'react';
import { HiDocumentText } from 'react-icons/hi2';
import { PdfFileIcon } from './icons/PdfFileIcon';
import { WordFileIcon } from './icons/WordFileIcon';

const FileTypeIcon: React.FC<{ fileName: string }> = ({ fileName }) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const iconClasses = 'w-12 h-12 flex-shrink-0';

  if (extension === 'pdf') {
    return <PdfFileIcon className={iconClasses} />;
  }

  if (extension === 'docx') {
    return <WordFileIcon className={iconClasses} />;
  }

  // Fallback for other file types
  return (
    <div className={`${iconClasses} flex items-center justify-center rounded-lg bg-gray-200`}>
      <HiDocumentText className="w-8 h-8 text-gray-600" />
    </div>
  );
};

export default FileTypeIcon;
