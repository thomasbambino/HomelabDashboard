import React from 'react';

export function AttIcon({ className = "" }: { className?: string }) {
  return (
    <img 
      className={className}
      src="/att-logo.png"
      alt="AT&T Logo"
    />
  );
}

export function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <img 
      className={className}
      src="/google-logo.png"
      alt="Google Logo"
    />
  );
}

export function ComcastIcon({ className = "" }: { className?: string }) {
  return (
    <img 
      className={className}
      src="/comcast-logo.png"
      alt="Comcast Logo"
    />
  );
}

export function VerizonIcon({ className = "" }: { className?: string }) {
  return (
    <img 
      className={className}
      src="/verizon-logo.png"
      alt="Verizon Logo"
    />
  );
}

export function TmobileIcon({ className = "" }: { className?: string }) {
  return (
    <img 
      className={className}
      src="/tmobile-logo.png"
      alt="T-Mobile Logo"
    />
  );
}

export function FrontierIcon({ className = "" }: { className?: string }) {
  return (
    <img 
      className={className}
      src="/frontier-logo.png"
      alt="Frontier Logo"
    />
  );
}

export function SpectrumIcon({ className = "" }: { className?: string }) {
  return (
    <img 
      className={className}
      src="/spectrum-logo.png"
      alt="Spectrum Logo"
    />
  );
}

export function CoxIcon({ className = "" }: { className?: string }) {
  return (
    <img 
      className={className}
      src="/cox-logo.png"
      alt="Cox Logo"
    />
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