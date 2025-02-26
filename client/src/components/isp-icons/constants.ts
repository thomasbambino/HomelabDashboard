import { ISPMappingConfig } from './types.js';

// This will be populated with the actual ISP configurations
export const ISP_MAPPINGS: ISPMappingConfig[] = [
  {
    name: 'AT&T',
    matches: ['AT&T', 'ATT', 'AT and T'],
    iconPath: '/att-logo.png'
  },
  {
    name: 'Google',
    matches: ['Google', 'Google Fiber'],
    iconPath: '/google-logo.png'
  },
  {
    name: 'T-Mobile',
    matches: ['T-Mobile', 'TMobile', 'T Mobile'],
    iconPath: '/tmobile-logo.png'
  },
  {
    name: 'Frontier',
    matches: ['Frontier', 'Frontier Communications'],
    iconPath: '/frontier-logo.png'
  },
  {
    name: 'Spectrum',
    matches: ['Spectrum', 'Charter', 'Charter Communications'],
    iconPath: '/spectrum-logo.png'
  },
  {
    name: 'Cox',
    matches: ['Cox', 'Cox Communications'],
    iconPath: '/cox-logo.png'
  },
  {
    name: 'Verizon',
    matches: ['Verizon', 'Verizon Fios', 'Verizon Wireless'],
    iconPath: '/verizon-logo.png'
  }
];

// Helper function to find the matching ISP config
export function findISPConfig(ispName: string): ISPMappingConfig | undefined {
  const normalizedName = ispName.toLowerCase();
  return ISP_MAPPINGS.find(config => 
    config.matches.some(match => 
      normalizedName.includes(match.toLowerCase())
    )
  );
}