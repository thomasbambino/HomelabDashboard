import React from 'react';
import { ISPIconProps } from './types';
import { findISPConfig } from './constants';
import { NetworkIcon } from './NetworkIcon';

export function ISPIcon({ className = "", size = 16, ispName }: ISPIconProps & { ispName: string }) {
  const config = findISPConfig(ispName);
  
  if (!config) {
    return <NetworkIcon className={className} size={size} />;
  }

  return (
    <img 
      src={config.iconPath}
      alt={`${config.name} logo`}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
