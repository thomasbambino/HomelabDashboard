import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { rateLimitMiddleware } from './utils/rate-limit';

// Role levels for access control
const ROLE_LEVELS = {
  superadmin: 3,
  admin: 2,
  user: 1,
  pending: 0
};

/**
 * Middleware to check if a user is authenticated
 * 
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
}

/**
 * Check rate limits for a route
 * 
 * @param maxAttempts Maximum number of requests allowed in the time window
 * @param windowSeconds Time window in seconds
 * @param routeName Identifier for the route
 * @returns Express middleware function
 */
export function checkRateLimit(
  maxAttempts: number, 
  windowSeconds: number, 
  routeName: string
) {
  return rateLimitMiddleware(maxAttempts, windowSeconds, routeName);
}

/**
 * Middleware to check if a user is an admin or superadmin
 * 
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const user = req.user as any;
  
  if (!user.role || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  next();
}

/**
 * Middleware to check if a user is a superadmin
 * 
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const user = req.user as any;
  
  if (!user.role || user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Superadmin access required'
    });
  }
  
  next();
}

/**
 * Middleware to check if a user is approved
 * 
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function isApproved(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const user = req.user as any;
  
  if (!user.approved) {
    return res.status(403).json({
      success: false,
      message: 'Account not approved. Please wait for administrator approval.'
    });
  }
  
  next();
}

/**
 * Middleware to check if a user has a specific role level or higher
 * 
 * @param minRole Minimum required role
 * @returns Express middleware function
 */
export function hasRole(minRole: 'superadmin' | 'admin' | 'user' | 'pending') {
  const minLevel = ROLE_LEVELS[minRole];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = req.user as any;
    
    if (!user.role || ROLE_LEVELS[user.role] < minLevel) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. ${minRole} role or higher required.`
      });
    }
    
    next();
  };
}

/**
 * Check if the requesting user can modify the target user
 * 
 * @param requestingUser The user making the request
 * @param targetUserId ID of the user to modify
 * @returns True if the requesting user can modify the target user
 */
function canModifyUser(targetUser: any, requestingUser: any) {
  // Users can always modify themselves
  if (targetUser.id === requestingUser.id) {
    return true;
  }
  
  // Superadmins can modify any user
  if (requestingUser.role === 'superadmin') {
    return true;
  }
  
  // Admins can modify users and other admins, but not superadmins
  if (requestingUser.role === 'admin' && targetUser.role !== 'superadmin') {
    return true;
  }
  
  return false;
}

/**
 * Middleware to check if the requesting user can modify a specific user
 * 
 * @param userIdParam Name of the request parameter containing the user ID
 * @returns Express middleware function
 */
export function canModifyUserMiddleware(userIdParam: string = 'userId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const requestingUser = req.user as any;
      const targetUserId = parseInt(req.params[userIdParam], 10);
      
      if (isNaN(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }
      
      // Get the target user
      const targetUser = await storage.getUserById(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if the requesting user can modify the target user
      if (!canModifyUser(targetUser, requestingUser)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to modify this user'
        });
      }
      
      // Attach the target user to the request for later use
      req.targetUser = targetUser;
      next();
    } catch (error) {
      console.error('Error in canModifyUserMiddleware:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}