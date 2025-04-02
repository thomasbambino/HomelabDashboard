import { Request } from 'express';

/**
 * Get the client IP address from a request
 * 
 * @param req Express request
 * @returns IP address
 */
export async function getClientIp(req: Request): Promise<string> {
  // Check forwarded headers first (for proxies)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for might contain multiple IPs, take the first one
    if (typeof forwardedFor === 'string') {
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      return ips[0];
    } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }
  }
  
  // Try real IP header (used by some proxies like Nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }
  
  // Fallback to remote address
  return req.socket.remoteAddress || '';
}

/**
 * Anonymize an IP address for logging (GDPR compliance)
 * 
 * @param ip IP address to anonymize
 * @returns Anonymized IP address
 */
export function anonymizeIp(ip: string): string {
  if (!ip) {
    return '';
  }
  
  // Check if it's an IPv6 address
  if (ip.includes(':')) {
    // For IPv6, keep the first 4 segments
    const segments = ip.split(':');
    return segments.slice(0, 4).join(':') + ':0:0:0:0';
  }
  
  // For IPv4, keep the first 3 octets
  const octets = ip.split('.');
  if (octets.length === 4) {
    return octets.slice(0, 3).join('.') + '.0';
  }
  
  // If we can't parse it, just return it
  return ip;
}

/**
 * Classify an IP address (public, private, localhost)
 * 
 * @param ip IP address to classify
 * @returns 'public', 'private', 'localhost', or 'unknown'
 */
export function classifyIp(ip: string): 'public' | 'private' | 'localhost' | 'unknown' {
  if (!ip) {
    return 'unknown';
  }
  
  // Check for localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return 'localhost';
  }
  
  // Check for private IPv4
  if (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    (ip.startsWith('172.') && parseInt(ip.split('.')[1], 10) >= 16 && parseInt(ip.split('.')[1], 10) <= 31)
  ) {
    return 'private';
  }
  
  // Check for private IPv6
  if (ip.startsWith('fc') || ip.startsWith('fd')) {
    return 'private';
  }
  
  // Otherwise assume public
  return 'public';
}