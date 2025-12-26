
import React from 'react';

export const LayoutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <rect x="7" y="7" width="4" height="4" />
    <rect x="7" y="13" width="4" height="4" />
    <rect x="13" y="7" width="4" height="4" />
    <rect x="13" y="13" width="4" height="4" />
  </svg>
);