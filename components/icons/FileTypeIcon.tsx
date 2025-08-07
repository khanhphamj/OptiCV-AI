

import React from 'react';
import { DocumentTextIcon } from './DocumentTextIcon';
import { PdfFileIcon } from './PdfFileIcon';
import { WordFileIcon } from './WordFileIcon';

const FileTypeIcon: React.FC<{ fileName: string; className?: string }> = ({ fileName, className }) => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  // The className prop allows for overriding size if needed, but defaults to a consistent size.
  const iconClasses = className || 'w-12 h-12';

  if (extension === 'pdf') {
    return <PdfFileIcon className={iconClasses} />;
  } 
  
  if (extension === 'docx') {
    return <WordFileIcon className={iconClasses} />;
  }
  
  // Fallback for other file types with a generic container
  return (
    <div className={`${iconClasses} flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-200`}>
      <DocumentTextIcon className="w-8 h-8 text-gray-600" />
    </div>
  );
};

export default FileTypeIcon;