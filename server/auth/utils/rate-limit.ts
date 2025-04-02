import { storage } from '../../storage';
import { getClientIp } from './ip';
import { Request, Response, NextFunction } from 'express';

// In-memory storage for rate limiting (will reset on server restart)
const ipRateLimits = new Map<string, Map<string, number[]>>();

/**
 * Check if a request should be rate limited
 * 
 * @param ip Client IP address
 * @param routeName Identifier for the route
 * @param windowSeconds Time window in seconds
 * @param maxAttempts Maximum number of requests allowed in the time window
 * @returns True if the request should be rate limited
 */
export function isRateLimited(ip: string, routeName: string, windowSeconds: number, maxAttempts: number): boolean {
  // Get the IP's rate limit data, or create a new one
  let ipLimits = ipRateLimits.get(ip);
  if (!ipLimits) {
    ipLimits = new Map<string, number[]>();
    ipRateLimits.set(ip, ipLimits);
  }
  
  // Get the timestamps for this route, or create a new array
  let timestamps = ipLimits.get(routeName);
  if (!timestamps) {
    timestamps = [];
    ipLimits.set(routeName, timestamps);
  }
  
  // Get the current time
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  // Filter out old timestamps
  timestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
  
  // Check if the IP has exceeded the rate limit
  if (timestamps.length >= maxAttempts) {
    return true;
  }
  
  // Add the current timestamp to the array
  timestamps.push(now);
  ipLimits.set(routeName, timestamps);
  
  return false;
}

/**
 * Express middleware for rate limiting
 * 
 * @param maxAttempts Maximum number of requests allowed in the time window
 * @param windowSeconds Time window in seconds
 * @param routeName Identifier for the route
 * @returns Express middleware function
 */
export function rateLimitMiddleware(maxAttempts: number, windowSeconds: number, routeName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get the client IP
    const ip = await getClientIp(req);
    
    // Check if the IP is rate limited
    if (isRateLimited(ip, routeName, windowSeconds, maxAttempts)) {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
      return;
    }
    
    next();
  };
}

/**
 * Clear expired rate limits from memory
 * Called periodically to prevent memory growth
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  
  // Loop through all IPs
  for (const [ip, ipLimits] of ipRateLimits.entries()) {
    // Loop through all routes for this IP
    for (const [routeName, timestamps] of ipLimits.entries()) {
      // Filter out timestamps older than 1 hour
      const filteredTimestamps = timestamps.filter(timestamp => now - timestamp < 3600000);
      
      // Update timestamps or remove the route if no timestamps remain
      if (filteredTimestamps.length > 0) {
        ipLimits.set(routeName, filteredTimestamps);
      } else {
        ipLimits.delete(routeName);
      }
    }
    
    // Remove the IP if no routes remain
    if (ipLimits.size === 0) {
      ipRateLimits.delete(ip);
    }
  }
}