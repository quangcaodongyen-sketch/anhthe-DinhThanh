
import React from 'react';

export const IDCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9.5" cy="10.5" r="2.5" />
    <path d="M15.5 15.5a4 4 0 0 0-8 0" />
    <path d="M15 11h4" />
    <path d="M15 13h2" />
  </svg>
);