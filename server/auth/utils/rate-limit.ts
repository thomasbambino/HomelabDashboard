import { Request, Response, NextFunction } from 'express';
import { storage } from '../../storage';
import { getClientIp } from './ip';

// In-memory rate limit store
// Map<ipAddress, Map<resourceName, { count: number, resetAt: Date }>>
const rateLimits = new Map<string, { [key: string]: { count: number; resetAt: Date } }>();

// Configure defaults
const DEFAULT_WINDOW = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_REQUESTS = 5; // 5 attempts

/**
 * Apply rate limiting to a route or middleware
 * 
 * @param options Rate limit options
 * @returns Express middleware
 */
export function rateLimit(options: {
  windowMs?: number;
  max?: number;
  resource?: string;
  message?: string;
}) {
  const windowMs = options.windowMs || DEFAULT_WINDOW;
  const max = options.max || DEFAULT_MAX_REQUESTS;
  const resource = options.resource || 'generic';
  const message = options.message || 'Too many requests, please try again later.';
  
  // Clean up expired entries periodically
  setInterval(() => {
    for (const [ip, resources] of rateLimits.entries()) {
      let allExpired = true;
      for (const key in resources) {
        const data = resources[key];
        if (data.resetAt > new Date()) {
          allExpired = false;
        } else {
          delete resources[key];
        }
      }
      
      if (allExpired) {
        rateLimits.delete(ip);
      }
    }
  }, 10 * 60 * 1000); // Run cleanup every 10 minutes
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get client IP
      const ip = await getClientIp(req);
      
      // Get or create rate limit entry for this IP
      let ipLimits = rateLimits.get(ip);
      if (!ipLimits) {
        ipLimits = {};
        rateLimits.set(ip, ipLimits);
      }
      
      // Get or create rate limit entry for this resource
      let resourceLimit = ipLimits[resource];
      if (!resourceLimit) {
        resourceLimit = {
          count: 0,
          resetAt: new Date(Date.now() + windowMs)
        };
        ipLimits[resource] = resourceLimit;
      }
      
      // Check if the window has expired
      if (resourceLimit.resetAt < new Date()) {
        // Reset counter
        resourceLimit.count = 0;
        resourceLimit.resetAt = new Date(Date.now() + windowMs);
      }
      
      // Check if we've hit the limit
      if (resourceLimit.count >= max) {
        // Calculate remaining time
        const remainingMs = resourceLimit.resetAt.getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        
        // Add headers
        res.set('Retry-After', String(Math.ceil(remainingMs / 1000)));
        res.set('X-RateLimit-Limit', String(max));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(Math.ceil(resourceLimit.resetAt.getTime() / 1000)));
        
        // Log the rate limit hit
        console.warn(
          `Rate limit exceeded for ${resource} by IP ${ip}, ` +
          `remaining time: ${remainingMinutes} minutes`
        );
        
        // Return error
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `${message} Please try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`
        });
      }
      
      // Increment counter
      resourceLimit.count++;
      
      // Add headers
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', String(max - resourceLimit.count));
      res.set('X-RateLimit-Reset', String(Math.ceil(resourceLimit.resetAt.getTime() / 1000)));
      
      // Continue to next middleware
      next();
    } catch (error) {
      console.error('Error in rate limit middleware:', error);
      next();
    }
  };
}

/**
 * Rate limit for login attempts
 * This uses a stricter limit than other resources
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  resource: 'login',
  message: 'Too many login attempts, please try again later.'
});

/**
 * Rate limit for registration attempts
 */
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  resource: 'register',
  message: 'Too many registration attempts, please try again later.'
});

/**
 * Rate limit for password reset requests
 */
export const resetPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  resource: 'resetPassword',
  message: 'Too many password reset attempts, please try again later.'
});

/**
 * Rate limit for API key requests
 */
export const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  resource: 'apiKey',
  message: 'Too many API key requests, please try again later.'
});