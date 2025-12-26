import React from 'react';

export const ShirtIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M20 13c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4V7c0-2.2 1.8-4 4-4h1.5a2 2 0 0 1 1.6.8L12 5l.9-1.2a2 2 0 0 1 1.6-.8H16c2.2 0 4 1.8 4 4v6z" />
    <path d="M12 13v8" />
    <path d="M7.5 13c-1.5 0-2.5.5-3.5 1.5" />
    <path d="M16.5 13c1.5 0 2.5.5 3.5 1.5" />
  </svg>
);