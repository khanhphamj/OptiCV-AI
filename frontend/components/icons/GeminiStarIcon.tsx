
import React from 'react';

export const GeminiStarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4f46e5" />
        <stop offset="30%" stopColor="#d946ef" />
        <stop offset="70%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#14b8a6" />
      </linearGradient>
    </defs>
    <path
      fill="url(#gemini-gradient)"
      d="M24,0 L30.3,17.7 L48,24 L30.3,30.3 L24,48 L17.7,30.3 L0,24 L17.7,17.7 Z"
    />
  </svg>
);
