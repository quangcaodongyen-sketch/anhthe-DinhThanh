
import React from 'react';

export const AnimateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
    <path d="M12 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" />
    <path d="M12 15a5 5 0 0 0-5 5" />
    <path d="m17.5 12.5 3-2.5-3-2.5v5z" />
  </svg>
);
