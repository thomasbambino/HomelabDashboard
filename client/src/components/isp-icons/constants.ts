import { ISPMappingConfig } from './types.js';

export const ISP_MAPPINGS: ISPMappingConfig[] = [
  {
    name: 'AT&T',
    matches: ['AT&T', 'ATT', 'AT and T', 'AT&T Internet'],
    iconPath: '/isp-logos/at_t_internet_101x101.png'
  },
  {
    name: 'Verizon',
    matches: ['Verizon', 'Verizon Fios', 'Verizon Business', 'Verizon Wireless'],
    iconPath: '/isp-logos/verizon_fios_101x101.png'
  },
  {
    name: 'Comcast',
    matches: ['Comcast', 'Comcast Business', 'Xfinity'],
    iconPath: '/isp-logos/comcast_business_101x101.png'
  },
  {
    name: 'Spectrum',
    matches: ['Spectrum', 'Charter', 'Charter Communications', 'Spectrum Business'],
    iconPath: '/isp-logos/spectrum_101x101.png'
  },
  {
    name: 'Cox',
    matches: ['Cox', 'Cox Communications', 'Cox Business'],
    iconPath: '/isp-logos/cox_communications_101x101.png'
  },
  {
    name: 'CenturyLink',
    matches: ['CenturyLink', 'Lumen'],
    iconPath: '/isp-logos/centurylink_101x101.png'
  },
  {
    name: 'Frontier',
    matches: ['Frontier', 'Frontier Communications'],
    iconPath: '/isp-logos/frontier_communications_101x101.png'
  },
  {
    name: 'RCN',
    matches: ['RCN'],
    iconPath: '/isp-logos/rcn_101x101.png'
  },
  {
    name: 'HughesNet',
    matches: ['HughesNet'],
    iconPath: '/isp-logos/hughesnet_101x101.png'
  },
  {
    name: 'Viasat',
    matches: ['Viasat'],
    iconPath: '/isp-logos/viasat_101x101.png'
  },
  {
    name: 'Starlink',
    matches: ['Starlink'],
    iconPath: '/isp-logos/starlink_101x101.png'
  },
  {
    name: 'Google Fiber',
    matches: ['Google', 'Google Fiber'],
    iconPath: '/isp-logos/google_fiber_101x101.png'
  },
  // Add additional ISPs as needed
];

// Helper function to find the matching ISP config
export function findISPConfig(ispName: string): ISPMappingConfig | undefined {
  if (!ispName) return undefined;

  const normalizedName = ispName.toLowerCase();
  return ISP_MAPPINGS.find(config => 
    config.matches.some(match => 
      normalizedName.includes(match.toLowerCase())
    )
  );
}