import { Router } from 'express';
import { storage } from '../../../storage';
import { isAuthenticated, isAdmin, isSuperAdmin, canModifyUser } from '../../middleware/auth-middleware';
import { asyncHandler } from '../../middleware/error-handler';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { services } from '../../../services';

const router = Router();

// Get current user profile
router.get('/profile', isAuthenticated, asyncHandler(async (req, res) => {
  // Return user data without sensitive information
  const user = req.user as any;
  const { password, ...userData } = user;
  res.json(userData);
}));

// Get list of all users (admin only)
router.get('/', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    
    // Filter out sensitive information
    const sanitizedUsers = users.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = user;
      return userData;
    });
    
    res.json(sanitizedUsers);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({
      message: 'Failed to fetch users',
      error: error.message
    });
  }
}));

// Get user by ID
router.get('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  
  // Check if user has permission to view this user
  const requestingUser = req.user as any;
  if (requestingUser.id !== userId && !['admin', 'superadmin'].includes(requestingUser.role)) {
    return res.status(403).json({ message: 'You do not have permission to view this user' });
  }
  
  try {
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Filter out sensitive information
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error);
    res.status(500).json({
      message: 'Failed to fetch user',
      error: error.message
    });
  }
}));

// Update user by ID
router.patch('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const requestingUser = req.user as any;
  
  // Check if user has permission to update this user
  if (!canModifyUser(requestingUser, userId)) {
    return res.status(403).json({ message: 'You do not have permission to update this user' });
  }
  
  try {
    // Define schema for update payload
    const updateUserSchema = z.object({
      username: z.string().min(3).max(30).optional(),
      email: z.string().email().optional(),
      name: z.string().min(2).max(50).optional(),
      role: z.enum(['user', 'admin', 'superadmin', 'pending']).optional(),
      avatar: z.string().optional(),
      preferences: z.record(z.any()).optional()
    });
    
    // If not admin/superadmin, restrict role updates
    if (requestingUser.role !== 'admin' && requestingUser.role !== 'superadmin') {
      updateUserSchema.omit({ role: true });
    }
    
    // Superadmin restriction - only superadmins can grant superadmin role
    if (requestingUser.role !== 'superadmin' && req.body.role === 'superadmin') {
      return res.status(403).json({ message: 'Only superadmins can grant superadmin privileges' });
    }
    
    const updateData = updateUserSchema.parse(req.body);
    
    // Update the user
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Filter out sensitive information
    const { password, ...userData } = updatedUser;
    res.json(userData);
  } catch (error) {
    if (error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    
    console.error(`Failed to update user ${userId}:`, error);
    res.status(500).json({
      message: 'Failed to update user',
      error: error.message
    });
  }
}));

// Delete user by ID
router.delete('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const requestingUser = req.user as any;
  
  // Check if user has permission to delete this user
  if (!canModifyUser(requestingUser, userId)) {
    return res.status(403).json({ message: 'You do not have permission to delete this user' });
  }
  
  // Prevent deleting the last superadmin
  if (requestingUser.role === 'superadmin') {
    const allSuperadmins = await storage.getUsersByRole('superadmin');
    if (allSuperadmins.length === 1 && allSuperadmins[0].id === userId) {
      return res.status(403).json({ message: 'Cannot delete the last superadmin account' });
    }
  }
  
  try {
    const deleted = await storage.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User successfully deleted' });
  } catch (error) {
    console.error(`Failed to delete user ${userId}:`, error);
    res.status(500).json({
      message: 'Failed to delete user',
      error: error.message
    });
  }
}));

// Approve a pending user (admin only)
router.post('/:id/approve', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  
  try {
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'pending') {
      return res.status(400).json({ message: 'User is already approved' });
    }
    
    // Update the user role to 'user'
    const updatedUser = await storage.updateUser(userId, { role: 'user' });
    
    // Send approval email notification
    try {
      const emailService = services.get('email');
      if (emailService) {
        await emailService.sendUserNotification(
          user.email,
          'Account Approved',
          `Your account has been approved. You can now log in to the system.`
        );
      }
    } catch (err) {
      console.error('Failed to send approval notification email:', err);
      // Don't fail the approval if email fails
    }
    
    // Filter out sensitive information
    const { password, ...userData } = updatedUser;
    res.json({
      message: 'User approved successfully',
      user: userData
    });
  } catch (error) {
    console.error(`Failed to approve user ${userId}:`, error);
    res.status(500).json({
      message: 'Failed to approve user',
      error: error.message
    });
  }
}));

// Reject a pending user (admin only)
router.post('/:id/reject', isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  
  try {
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'pending') {
      return res.status(400).json({ message: 'User is not in pending state' });
    }
    
    // Get the email before deleting
    const userEmail = user.email;
    
    // Delete the user
    const deleted = await storage.deleteUser(userId);
    
    // Send rejection email notification
    try {
      const emailService = services.get('email');
      if (emailService) {
        await emailService.sendUserNotification(
          userEmail,
          'Account Request Rejected',
          `We're sorry, but your account request has been rejected.`
        );
      }
    } catch (err) {
      console.error('Failed to send rejection notification email:', err);
      // Don't fail the rejection if email fails
    }
    
    res.json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error(`Failed to reject user ${userId}:`, error);
    res.status(500).json({
      message: 'Failed to reject user',
      error: error.message
    });
  }
}));

export default router;