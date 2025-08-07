import React from 'react';

// A professional icon for PDF files, with clear text for better readability.
export const PdfFileIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g fillRule="evenodd">
      {/* Red document background */}
      <path fill="#D9483B" d="M8,2 L33,2 L40,9 L40,46 C40,47.1045695 39.1045695,48 38,48 L10,48 C8.8954305,48 8,47.1045695 8,46 L8,2 Z"/>
      {/* Darker red folded corner */}
      <path fill="#B53C32" d="M33,2 L40,9 L33,9 L33,2 Z"/>
      {/* "PDF" text, bold and centered */}
      <text
        x="24"
        y="31"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="12"
        fontWeight="800"
        fill="#FFFFFF"
        textAnchor="middle"
        letterSpacing="-0.5"
      >
        PDF
      </text>
    </g>
  </svg>
);