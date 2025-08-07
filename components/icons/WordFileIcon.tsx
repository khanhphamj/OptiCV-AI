
import React from 'react';

// A professional icon for DOCX files, inspired by the Google Drive style.
export const WordFileIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fillRule="evenodd">
      {/* Blue document background */}
      <path fill="#4285F4" d="M8,2 L33,2 L40,9 L40,46 C40,47.1045695 39.1045695,48 38,48 L10,48 C8.8954305,48 8,47.1045695 8,46 L8,2 Z"/>
      {/* Darker blue folded corner */}
      <path fill="#356AC3" d="M33,2 L40,9 L33,9 L33,2 Z"/>
      {/* White lines for document */}
      <rect fill="#FFFFFF" x="14" y="20" width="20" height="3" rx="1.5" />
      <rect fill="#FFFFFF" x="14" y="27" width="20" height="3" rx="1.5" />
      <rect fill="#FFFFFF" x="14" y="34" width="12" height="3" rx="1.5" />
    </g>
  </svg>
);
