import { storage } from '../../storage';
import { getClientIp } from './ip';
import { Request, Response, NextFunction } from 'express';

// In-memory rate limiting for different actions
// Key: action type (e.g., 'login', 'api')
// Value: Map of IP addresses to arrays of timestamps
const rateLimits = new Map<string, Map<string, number[]>>();

// Limits by action type
const RATE_LIMIT_CONFIGS = {
  // Login attempts (5 per minute)
  login: {
    maxAttempts: 5,
    windowSeconds: 60,
    blockSeconds: 300 // 5 minutes block
  },
  
  // Registration attempts (3 per 5 minutes)
  registration: {
    maxAttempts: 3,
    windowSeconds: 300, // 5 minutes
    blockSeconds: 900 // 15 minutes block
  },
  
  // Password reset (3 per 5 minutes)
  reset: {
    maxAttempts: 3,
    windowSeconds: 300, // 5 minutes
    blockSeconds: 600 // 10 minutes block
  },
  
  // Password change (5 per minute)
  'password-change': {
    maxAttempts: 5,
    windowSeconds: 60,
    blockSeconds: 300 // 5 minutes block
  },
  
  // Admin actions (higher limits - 15 per minute)
  'admin-action': {
    maxAttempts: 15,
    windowSeconds: 60,
    blockSeconds: 300 // 5 minutes block
  },
  
  // API requests (60 per minute)
  api: {
    maxAttempts: 60,
    windowSeconds: 60,
    blockSeconds: 300 // 5 minutes block
  }
};

// Clean up old rate limit entries every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
setInterval(cleanupRateLimits, CLEANUP_INTERVAL);

function cleanupRateLimits(): void {
  const now = Date.now();
  
  // Go through each action type
  for (const [actionType, ipMap] of rateLimits.entries()) {
    const config = RATE_LIMIT_CONFIGS[actionType as keyof typeof RATE_LIMIT_CONFIGS];
    
    if (!config) {
      continue;
    }
    
    // Go through each IP address
    for (const [ip, timestamps] of ipMap.entries()) {
      // Remove timestamps older than the window
      const cutoff = now - (config.windowSeconds * 1000);
      const newTimestamps = timestamps.filter(ts => ts > cutoff);
      
      if (newTimestamps.length === 0) {
        // No recent attempts, remove IP
        ipMap.delete(ip);
      } else {
        // Update with only recent timestamps
        ipMap.set(ip, newTimestamps);
      }
    }
    
    // Remove action type if no IPs
    if (ipMap.size === 0) {
      rateLimits.delete(actionType);
    }
  }
}

/**
 * Add a timestamp for the specified action and IP
 * 
 * @param actionType Action type (e.g., 'login', 'api')
 * @param ip IP address
 */
export function addRateLimitEntry(actionType: string, ip: string): void {
  // Get or create map for action type
  let ipMap = rateLimits.get(actionType);
  if (!ipMap) {
    ipMap = new Map<string, number[]>();
    rateLimits.set(actionType, ipMap);
  }
  
  // Get or create timestamps array for IP
  const timestamps = ipMap.get(ip) || [];
  
  // Add current timestamp
  timestamps.push(Date.now());
  
  // Update map
  ipMap.set(ip, timestamps);
}

/**
 * Reset rate limit for an IP and action
 * Useful when successful login occurs after failures
 * 
 * @param actionType Action type
 * @param ip IP address
 */
export function resetRateLimit(actionType: string, ip: string): void {
  const ipMap = rateLimits.get(actionType);
  if (ipMap) {
    ipMap.delete(ip);
  }
}

/**
 * Check if the rate limit has been exceeded
 * 
 * @param actionType Action type
 * @param ip IP address
 * @returns Whether the rate limit has been exceeded
 */
export function isRateLimited(actionType: string, ip: string): boolean {
  const config = RATE_LIMIT_CONFIGS[actionType as keyof typeof RATE_LIMIT_CONFIGS];
  
  if (!config) {
    return false; // No config for this action type
  }
  
  const ipMap = rateLimits.get(actionType);
  if (!ipMap) {
    return false; // No entries for this action type
  }
  
  const timestamps = ipMap.get(ip);
  if (!timestamps || timestamps.length === 0) {
    return false; // No entries for this IP
  }
  
  // Get timestamps within the window
  const now = Date.now();
  const windowStart = now - (config.windowSeconds * 1000);
  const recentTimestamps = timestamps.filter(ts => ts > windowStart);
  
  // Check if number of attempts exceeds the limit
  return recentTimestamps.length >= config.maxAttempts;
}

/**
 * Get the number of attempts within the rate limit window
 * 
 * @param actionType Action type
 * @param ip IP address
 * @returns Number of attempts
 */
export function getRateLimitCount(actionType: string, ip: string): number {
  const config = RATE_LIMIT_CONFIGS[actionType as keyof typeof RATE_LIMIT_CONFIGS];
  
  if (!config) {
    return 0; // No config for this action type
  }
  
  const ipMap = rateLimits.get(actionType);
  if (!ipMap) {
    return 0; // No entries for this action type
  }
  
  const timestamps = ipMap.get(ip);
  if (!timestamps || timestamps.length === 0) {
    return 0; // No entries for this IP
  }
  
  // Get timestamps within the window
  const now = Date.now();
  const windowStart = now - (config.windowSeconds * 1000);
  const recentTimestamps = timestamps.filter(ts => ts > windowStart);
  
  return recentTimestamps.length;
}

/**
 * Express middleware for rate limiting with admin privileges consideration
 * 
 * @param actionType Action type
 * @returns Express middleware function
 */
export function rateLimitMiddleware(actionType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get client IP
      const ip = await getClientIp(req);
      
      // Get config
      const config = RATE_LIMIT_CONFIGS[actionType as keyof typeof RATE_LIMIT_CONFIGS];
      
      if (!config) {
        return next(); // No rate limit defined for this action
      }
      
      // Determine if this is an admin user (higher rate limits)
      const isAdminUser = req.isAuthenticated() && req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
      
      // Get the effective max attempts - higher for admin users
      const effectiveMaxAttempts = isAdminUser ? Math.max(config.maxAttempts * 3, config.maxAttempts + 10) : config.maxAttempts;
      
      // Check if rate limited with admin privileges
      const count = getRateLimitCount(actionType, ip);
      if (count >= effectiveMaxAttempts) {
        // Add retry-after header
        res.set('Retry-After', config.blockSeconds.toString());
        
        // Return error
        return res.status(429).json({
          status: false,
          message: 'Too many requests, please try again later',
          retryAfter: config.blockSeconds
        });
      }
      
      // Add rate limit entry
      addRateLimitEntry(actionType, ip);
      
      // Add rate limit info to headers
      res.set('X-RateLimit-Limit', effectiveMaxAttempts.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, effectiveMaxAttempts - (count + 1)).toString());
      res.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + config.windowSeconds).toString());
      
      // Continue to next middleware
      next();
    } catch (error) {
      console.error('Error in rate limit middleware:', error);
      next(error);
    }
  };
}

/**
 * Legacy middleware for checking rate limits
 * Used mainly with auth routes for login and registration
 * 
 * @deprecated Use rateLimitMiddleware('login') instead
 */
export const checkRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = await getClientIp(req);
    const actionType = 'login';
    
    // Check if rate limited
    if (isRateLimited(actionType, ip)) {
      const config = RATE_LIMIT_CONFIGS[actionType];
      res.set('Retry-After', config.blockSeconds.toString());
      
      return res.status(429).json({
        status: false,
        message: 'Too many attempts, please try again later',
        retryAfter: config.blockSeconds
      });
    }
    
    // Add rate limit entry
    addRateLimitEntry(actionType, ip);
    
    // Add rate limit info to headers
    const count = getRateLimitCount(actionType, ip);
    const config = RATE_LIMIT_CONFIGS[actionType];
    
    res.set('X-RateLimit-Limit', config.maxAttempts.toString());
    res.set('X-RateLimit-Remaining', Math.max(0, config.maxAttempts - count).toString());
    res.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + config.windowSeconds).toString());
    
    next();
  } catch (error) {
    console.error('Error in rate limit middleware:', error);
    next(error);
  }
};