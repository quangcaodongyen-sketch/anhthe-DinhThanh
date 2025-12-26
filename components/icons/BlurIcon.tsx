
import React from 'react';

export const BlurIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    {...props}>
    <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
    <circle cx="12" cy="12" r="5" strokeDasharray="2 2" strokeOpacity="0.6"/>
    <circle cx="12" cy="12" r="7.5" strokeDasharray="2 4" strokeOpacity="0.4"/>
    <circle cx="12" cy="12" r="10" strokeDasharray="2 6" strokeOpacity="0.2"/>
  </svg>
);
