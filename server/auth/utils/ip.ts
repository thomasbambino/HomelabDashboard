import { Request } from 'express';
import { storage } from '../../storage';

/**
 * Get client IP address from request
 * 
 * @param req Express request
 * @returns Client IP address
 */
export async function getClientIp(req: Request): Promise<string> {
  // Try different request headers
  const ipFromXForwardedFor = req.headers['x-forwarded-for'] as string;
  const ipFromForwardedFor = req.headers['forwarded'] as string;
  const ipFromReal = req.headers['x-real-ip'] as string;
  const ipFromRemoteAddr = req.socket.remoteAddress;
  
  // Check X-Forwarded-For header (may contain multiple IPs)
  if (ipFromXForwardedFor) {
    const ips = ipFromXForwardedFor.split(',').map(ip => ip.trim());
    // Return the first IP in the list
    if (ips.length > 0) {
      return ips[0];
    }
  }
  
  // Check Forwarded header
  if (ipFromForwardedFor) {
    const matches = ipFromForwardedFor.match(/for=([^;]+)/);
    if (matches && matches.length > 1) {
      const forValue = matches[1].trim();
      // Remove quotes if present
      return forValue.replace(/^"(.*)"$/, '$1');
    }
  }
  
  // Check X-Real-IP header
  if (ipFromReal) {
    return ipFromReal.trim();
  }
  
  // Fall back to remote address from socket
  if (ipFromRemoteAddr) {
    // Handle IPv6 localhost
    if (ipFromRemoteAddr === '::1') {
      return '127.0.0.1';
    }
    // Handle IPv4-mapped IPv6 addresses (starting with ::ffff:)
    if (ipFromRemoteAddr.startsWith('::ffff:')) {
      return ipFromRemoteAddr.substring(7);
    }
    return ipFromRemoteAddr;
  }
  
  // Could not determine IP
  return 'unknown';
}

/**
 * Record login attempt
 * 
 * @param ip Client IP address
 * @param userId User ID (null for failed login attempts)
 * @param identifier User identifier (email/username)
 * @param success Whether login was successful
 */
export async function recordLoginAttempt(
  ip: string, 
  userId: number | null, 
  identifier: string,
  success: boolean
): Promise<void> {
  await storage.createLoginAttempt({
    ip,
    userId,
    identifier,
    success,
    timestamp: new Date()
  });
}

/**
 * Check if an IP has too many failed login attempts
 * 
 * @param ip Client IP address
 * @param windowMinutes Time window in minutes
 * @param maxAttempts Maximum number of failed attempts allowed in the time window
 * @returns True if the IP has too many failed attempts
 */
export async function hasTooManyFailedLoginAttempts(
  ip: string, 
  windowMinutes: number = 30, 
  maxAttempts: number = 5
): Promise<boolean> {
  const windowTime = new Date();
  windowTime.setMinutes(windowTime.getMinutes() - windowMinutes);
  
  const failedAttempts = await storage.getFailedLoginAttemptsByIp(ip, windowTime);
  
  return failedAttempts.length >= maxAttempts;
}

/**
 * Check if a specific login attempt is blocked due to too many failed attempts
 * 
 * @param ip Client IP address
 * @param identifier User identifier (email/username), optional
 * @returns True if login attempt is blocked
 */
export async function isLoginBlocked(ip: string, identifier?: string): Promise<boolean> {
  // First check IP-based rate limiting
  const ipBlocked = await hasTooManyFailedLoginAttempts(ip);
  if (ipBlocked) {
    return true;
  }
  
  // If identifier is provided, check identifier-based rate limiting
  if (identifier) {
    const windowTime = new Date();
    windowTime.setMinutes(windowTime.getMinutes() - 30); // 30 minute window
    
    const failedAttempts = await storage.getFailedLoginAttemptsByIdentifier(identifier, windowTime);
    return failedAttempts.length >= 5; // Block after 5 failed attempts
  }
  
  return false;
}