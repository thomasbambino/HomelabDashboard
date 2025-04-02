import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Check if the user is authenticated
 * If not, send a 401 Unauthorized response
 * 
 * @returns Express middleware
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    error: 'Unauthorized',
    message: 'You must be logged in to access this resource'
  });
}

/**
 * Check if the user is an admin
 * If not, send a 403 Forbidden response
 * This also checks if the user is authenticated
 * 
 * @returns Express middleware
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource'
    });
  }
  
  const user = req.user as any;
  
  if (user.role === 'admin' || user.role === 'superadmin') {
    return next();
  }
  
  res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have permission to access this resource'
  });
}

/**
 * Check if the user is a superadmin
 * If not, send a 403 Forbidden response
 * This also checks if the user is authenticated
 * 
 * @returns Express middleware
 */
export function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource'
    });
  }
  
  const user = req.user as any;
  
  if (user.role === 'superadmin') {
    return next();
  }
  
  res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have permission to access this resource'
  });
}

/**
 * Check if the user is approved
 * If not, send a 403 Forbidden response
 * This also checks if the user is authenticated
 * 
 * @returns Express middleware
 */
export function isApproved(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource'
    });
  }
  
  const user = req.user as any;
  
  if (user.approved) {
    return next();
  }
  
  res.status(403).json({
    error: 'Forbidden',
    message: 'Your account requires approval. Please contact an administrator.'
  });
}

/**
 * Check if the user can modify a specific user
 * Normal users can only modify themselves
 * Admins can modify normal users
 * Superadmins can modify anyone except other superadmins
 * 
 * @param requestingUser The user making the request
 * @param targetUserId The ID of the user being modified
 * @returns Whether the requesting user can modify the target user
 */
export function canModifyUser(requestingUser: any, targetUserId: number): boolean {
  // User can always modify themselves
  if (requestingUser.id === targetUserId) {
    return true;
  }
  
  // Otherwise check roles
  switch (requestingUser.role) {
    case 'superadmin':
      // Superadmins can modify anyone except other superadmins
      // We need to check the target user's role
      const targetUser = storage.getUserById(targetUserId);
      return !(targetUser && targetUser.role === 'superadmin');
      
    case 'admin':
      // Admins can modify normal users
      // We need to check the target user's role
      const targetUserForAdmin = storage.getUserById(targetUserId);
      return !(targetUserForAdmin && ['admin', 'superadmin'].includes(targetUserForAdmin.role));
      
    default:
      // Normal users can only modify themselves (checked above)
      return false;
  }
}

/**
 * Middleware to check if the user can modify a specific user
 * Uses the userIdParam parameter to extract the target user ID from request parameters
 * 
 * @param userIdParam The parameter name for the user ID (default: 'id')
 * @returns Express middleware
 */
export function canModifyUserMiddleware(userIdParam = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource'
      });
    }
    
    const user = req.user as any;
    const targetUserId = parseInt(req.params[userIdParam], 10);
    
    if (isNaN(targetUserId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid user ID'
      });
    }
    
    // Check if the user can modify the target user
    const canModify = await canModifyUser(user, targetUserId);
    
    if (canModify) {
      return next();
    }
    
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to modify this user'
    });
  };
}

/**
 * Helper to determine if a user can access specific settings
 * Different setting types have different permission requirements
 * 
 * @param user The user attempting to access the settings
 * @param settingType The type of settings being accessed
 * @returns Whether the user can access the settings
 */
export function canAccessSettings(user: any, settingType: string): boolean {
  if (!user) {
    return false;
  }
  
  // Define permission levels for different setting types
  const settingPermissions: { [key: string]: number } = {
    // Public settings can be accessed by anyone
    'public': 0,
    
    // User settings can be accessed by approved users
    'user': 1,
    
    // Admin settings can only be accessed by admins and superadmins
    'admin': 2,
    
    // System settings can only be accessed by superadmins
    'system': 3
  };
  
  // Define role permission levels
  const rolePermissions = {
    'superadmin': 3,
    'admin': 2,
    'user': user.approved ? 1 : 0,
    'pending': 0
  };
  
  // Get the required permission level for the setting type
  const requiredPermission = settingPermissions[settingType] || 0;
  
  // Get the user's permission level based on their role
  const userPermission = rolePermissions[user.role] || 0;
  
  // Check if the user has sufficient permissions
  return userPermission >= requiredPermission;
}

/**
 * Middleware to check if the user can access specific settings
 * Uses the settingTypeParam parameter to extract the setting type from request parameters
 * 
 * @param settingTypeParam The parameter name for the setting type (default: 'type')
 * @returns Express middleware
 */
export function canAccessSettingsMiddleware(settingTypeParam = 'type') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource'
      });
    }
    
    const user = req.user as any;
    const settingType = req.params[settingTypeParam] || 'user';
    
    // Check if the user can access the settings
    const canAccess = canAccessSettings(user, settingType);
    
    if (canAccess) {
      return next();
    }
    
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access these settings'
    });
  };
}