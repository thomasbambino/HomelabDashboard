import React from 'react';

export function AttIcon({ className = "" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 64 64" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M32 0c17.673 0 32 14.327 32 32 0 17.673-14.327 32-32 32C14.327 64 0 49.673 0 32 0 14.327 14.327 0 32 0zm-.5 13.5c-4.687 0-8.5 3.813-8.5 8.5s3.813 8.5 8.5 8.5 8.5-3.813 8.5-8.5-3.813-8.5-8.5-8.5zm0 20c-4.687 0-8.5 3.813-8.5 8.5s3.813 8.5 8.5 8.5 8.5-3.813 8.5-8.5-3.813-8.5-8.5-8.5z"
        fill="currentColor"
      />
      <text
        x="32"
        y="45"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontSize: '8px', fontWeight: 'bold' }}
      >
        AT&T
      </text>
    </svg>
  );
}

export function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 488 512" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ComcastIcon({ className = "" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 512 512" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M256 0C114.615 0 0 114.615 0 256s114.615 256 256 256 256-114.615 256-256S397.385 0 256 0zm0 384c-70.692 0-128-57.308-128-128s57.308-128 128-128 128 57.308 128 128-57.308 128-128 128z"
        fill="currentColor"
      />
    </svg>
  );
}

export function NetworkIcon({ className = "" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 512 512" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M256 0C114.615 0 0 114.615 0 256s114.615 256 256 256 256-114.615 256-256S397.385 0 256 0zm0 448c-106.039 0-192-85.961-192-192S149.961 64 256 64s192 85.961 192 192-85.961 192-192 192z"
        fill="currentColor"
      />
    </svg>
  );
}