import React from 'react';

export const SuitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M16 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
    <path d="M9.5 8 7 22l5-3 5 3-2.5-14" />
    <path d="M9.5 8a2.5 2.5 0 0 1 5 0" />
    <path d="M12 13a2 2 0 0 1-2-2V8" />
  </svg>
);