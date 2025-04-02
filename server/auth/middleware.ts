import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { rateLimitMiddleware } from './utils/rate-limit';

// Extended type for authenticated requests
export interface AuthenticatedRequest extends Request {
  user?: any;
  targetUser?: any;
  isAuthenticated(): this is AuthenticatedRequest & { user: any };
}

/**
 * Authentication middleware
 * Checks if the user is authenticated
 * 
 * @param allowContinueWithoutAuth If true, continues without returning 401 even if not authenticated
 * @returns Express middleware function
 */
export function isAuthenticated(allowContinueWithoutAuth: boolean = false) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if authenticated
    if (req.isAuthenticated()) {
      // Check if user account is locked
      if (req.user?.locked) {
        return res.status(403).json({
          status: false,
          message: 'Your account is locked. Please contact an administrator.'
        });
      }
      
      return next();
    }
    
    // Allow continuing without auth if specified (for routes that vary behavior based on auth status)
    if (allowContinueWithoutAuth) {
      return next();
    }
    
    // Not authenticated
    return res.status(401).json({
      status: false,
      message: 'Authentication required'
    });
  };
}

/**
 * Authentication middleware for API endpoints
 * Rate limited to prevent brute force attacks
 * 
 * @returns Express middleware function
 */
export function apiAuthentication() {
  return [
    // Apply rate limit to API authentication
    rateLimitMiddleware('api'),
    
    // Check authentication
    isAuthenticated()
  ];
}

/**
 * Authorization middleware for routes requiring specific roles
 * 
 * @param roles Array of roles allowed to access the route
 * @returns Express middleware function
 */
export function hasRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Must be authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }
    
    // Check if account is locked
    if (req.user?.locked) {
      return res.status(403).json({
        status: false,
        message: 'Your account is locked. Please contact an administrator.'
      });
    }
    
    // Check if user has one of the required roles
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: 'Insufficient permissions'
      });
    }
    
    // User has required role
    next();
  };
}

/**
 * Role hierarchy - higher numbers mean higher permissions
 * Used for role-based authorization with minimum level comparison
 */
const ROLE_LEVELS = {
  pending: 0,
  user: 1,
  admin: 2,
  superadmin: 3
};

/**
 * Authorization middleware requiring a minimum role level
 * 
 * @param minRole Minimum role required to access the route
 * @returns Express middleware function
 */
export function hasMinRole(minRole: 'superadmin' | 'admin' | 'user' | 'pending') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Must be authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }
    
    // Check if account is locked
    if (req.user?.locked) {
      return res.status(403).json({
        status: false,
        message: 'Your account is locked. Please contact an administrator.'
      });
    }
    
    // Get role levels
    const userRoleLevel = ROLE_LEVELS[req.user?.role as keyof typeof ROLE_LEVELS] || -1;
    const requiredRoleLevel = ROLE_LEVELS[minRole];
    
    // Check if user's role level is sufficient
    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        status: false,
        message: 'Insufficient permissions'
      });
    }
    
    // User has sufficient role level
    next();
  };
}

/**
 * Authorization middleware to ensure user is approved
 * 
 * @returns Express middleware function
 */
export function isApproved() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Must be authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }
    
    // Check if account is locked
    if (req.user?.locked) {
      return res.status(403).json({
        status: false,
        message: 'Your account is locked. Please contact an administrator.'
      });
    }
    
    // Check if user is approved (role other than 'pending')
    if (!req.user?.role || req.user.role === 'pending') {
      return res.status(403).json({
        status: false,
        message: 'Your account is pending approval'
      });
    }
    
    // User is approved
    next();
  };
}

/**
 * Authorization middleware to ensure user can manage another user
 * Can only manage users with lower role level
 * 
 * @param userIdParamName Name of the URL parameter containing the target user ID
 * @returns Express middleware function
 */
export function canManageUser(userIdParamName: string = 'userId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Must be authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }
    
    // Check if account is locked
    if (req.user?.locked) {
      return res.status(403).json({
        status: false,
        message: 'Your account is locked. Please contact an administrator.'
      });
    }
    
    // Only admins and superadmins can manage users
    if (!req.user?.role || !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: 'Insufficient permissions'
      });
    }
    
    // Get target user ID from URL params
    const targetUserId = parseInt(req.params[userIdParamName], 10);
    
    if (isNaN(targetUserId)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid user ID'
      });
    }
    
    try {
      // Get target user
      const targetUser = await storage.getUserById(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({
          status: false,
          message: 'User not found'
        });
      }
      
      // Check role hierarchy
      const userRoleLevel = ROLE_LEVELS[req.user.role as keyof typeof ROLE_LEVELS];
      const targetRoleLevel = ROLE_LEVELS[targetUser.role as keyof typeof ROLE_LEVELS];
      
      // Can only manage users with lower role level
      // Superadmins can manage other superadmins
      if (targetRoleLevel >= userRoleLevel && req.user.role !== 'superadmin') {
        return res.status(403).json({
          status: false,
          message: 'Insufficient permissions to manage this user'
        });
      }
      
      // Store target user in request for later use
      req.targetUser = targetUser;
      
      // Can manage the user
      next();
    } catch (error) {
      console.error('Error in canManageUser middleware:', error);
      res.status(500).json({
        status: false,
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Middleware to ensure user can only manage their own resources
 * 
 * @param userIdParamName Name of the URL parameter containing the target user ID
 * @returns Express middleware function
 */
export function isSelfOrAdmin(userIdParamName: string = 'userId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Must be authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }
    
    // Check if account is locked
    if (req.user?.locked) {
      return res.status(403).json({
        status: false,
        message: 'Your account is locked. Please contact an administrator.'
      });
    }
    
    // Get target user ID from URL params
    const targetUserId = parseInt(req.params[userIdParamName], 10);
    
    if (isNaN(targetUserId)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid user ID'
      });
    }
    
    // Check if user is accessing their own resource or is an admin
    if (
      req.user.id === targetUserId || 
      ['admin', 'superadmin'].includes(req.user.role)
    ) {
      return next();
    }
    
    // Not authorized
    return res.status(403).json({
      status: false,
      message: 'Insufficient permissions'
    });
  };
}