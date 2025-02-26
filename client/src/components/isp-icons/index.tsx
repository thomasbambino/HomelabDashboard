import React from 'react';

export function AttIcon({ className = "", size = 16 }: { className?: string, size?: number }) {
  return (
    <img 
      className={className}
      src="/att-logo.png"
      alt="AT&T Logo"
      style={{ width: size, height: size }}
    />
  );
}

export function GoogleIcon({ className = "", size = 16 }: { className?: string, size?: number }) {
  return (
    <img 
      className={className}
      src="/google-logo.png"
      alt="Google Logo"
      style={{ width: size, height: size }}
    />
  );
}

export function ComcastIcon({ className = "", size = 16 }: { className?: string, size?: number }) {
  return (
    <img 
      className={className}
      src="/comcast-logo.png"
      alt="Comcast Logo"
      style={{ width: size, height: size }}
    />
  );
}

export function VerizonIcon({ className = "", size = 16 }: { className?: string, size?: number }) {
  return (
    <img 
      className={className}
      src="/verizon-logo.png"
      alt="Verizon Logo"
      style={{ width: size, height: size }}
    />
  );
}

export function TmobileIcon({ className = "", size = 16 }: { className?: string, size?: number }) {
  return (
    <img 
      className={className}
      src="/tmobile-logo.png"
      alt="T-Mobile Logo"
      style={{ width: size, height: size }}
    />
  );
}

export function FrontierIcon({ className = "", size = 16 }: { className?: string, size?: number }) {
  return (
    <img 
      className={className}
      src="/frontier-logo.png"
      alt="Frontier Logo"
      style={{ width: size, height: size }}
    />
  );
}

export function SpectrumIcon({ className = "", size = 16 }: { className?: string, size?: number }) {
  return (
    <img 
      className={className}
      src="/spectrum-logo.png"
      alt="Spectrum Logo"
      style={{ width: size, height: size }}
    />
  );
}

export function CoxIcon({ className = "", size = 16 }: { className?: string, size?: number }) {
  return (
    <img 
      className={className}
      src="/cox-logo.png"
      alt="Cox Logo"
      style={{ width: size, height: size }}
    />
  );
}

export function NetworkIcon({ className = "", size = 16 }: { className?: string, size?: number }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 512 512" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size }}
    >
      <path 
        d="M256 0C114.615 0 0 114.615 0 256s114.615 256 256 256 256-114.615 256-256S397.385 0 256 0zm0 448c-106.039 0-192-85.961-192-192S149.961 64 256 64s192 85.961 192 192-85.961 192-192 192z"
        fill="currentColor"
      />
    </svg>
  );
}