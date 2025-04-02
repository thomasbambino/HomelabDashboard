import { Request, Response, NextFunction } from 'express';
import { storage } from '../../storage';
import { createForbiddenError, createUnauthorizedError } from './error-handler';

/**
 * Middleware to check if a user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized: Please log in to access this resource' });
}

/**
 * Middleware to check if a user is an admin
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized: Please log in to access this resource' });
  }
  
  const user = req.user as any;
  if (user.role === 'admin' || user.role === 'superadmin') {
    return next();
  }
  
  return res.status(403).json({ message: 'Forbidden: Admin privileges required' });
}

/**
 * Middleware to check if a user is a superadmin
 */
export function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized: Please log in to access this resource' });
  }
  
  const user = req.user as any;
  if (user.role === 'superadmin') {
    return next();
  }
  
  return res.status(403).json({ message: 'Forbidden: Superadmin privileges required' });
}

/**
 * Middleware to check if a user is approved (not pending)
 */
export function isApproved(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized: Please log in to access this resource' });
  }
  
  const user = req.user as any;
  if (user.role !== 'pending') {
    return next();
  }
  
  return res.status(403).json({ message: 'Your account is pending approval by an administrator' });
}

/**
 * Determines if the requesting user can modify the target user
 * Rules:
 * - A user can modify themselves
 * - An admin can modify any regular user or pending user
 * - A superadmin can modify any user including other admins
 * - Only superadmins can modify other superadmins
 */
export function canModifyUser(requestingUser: any, targetUserId: number) {
  // Users can modify themselves
  if (requestingUser.id === targetUserId) {
    return true;
  }
  
  // Admins can modify regular and pending users
  if (requestingUser.role === 'admin') {
    return true; // We'll check the target user's role in the actual route handler
  }
  
  // Superadmins can modify anyone
  if (requestingUser.role === 'superadmin') {
    return true;
  }
  
  // If we get here, the user doesn't have permission
  return false;
}

/**
 * Middleware to rate limit login/registration attempts based on IP address
 * This helps prevent brute force attacks
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return function(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!requests.has(ip)) {
      // First request from this IP
      requests.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    const request = requests.get(ip)!;
    
    if (now > request.resetTime) {
      // Window expired, reset counter
      request.count = 1;
      request.resetTime = now + windowMs;
      return next();
    }
    
    if (request.count >= maxRequests) {
      // Too many requests
      return res.status(429).json({
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((request.resetTime - now) / 1000)
      });
    }
    
    // Increment counter and proceed
    request.count++;
    return next();
  };
}