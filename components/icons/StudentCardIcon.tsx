import React from 'react';

export const StudentCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <rect x="3" y="2" width="18" height="20" rx="2" />
    <rect x="7" y="6" width="10" height="7" rx="1" />
    <line x1="7" y1="16" x2="17" y2="16" />
    <line x1="7" y1="18" x2="13" y2="18" />
  </svg>
);