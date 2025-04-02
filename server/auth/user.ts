import { storage } from '../storage';
import { hashPassword, generateTimedToken, verifyTimedToken } from './password';

/**
 * Create a new user
 * 
 * @param userData User data to create
 * @returns Created user
 */
export async function createUser(userData: {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'superadmin' | 'admin' | 'user' | 'pending';
  avatarUrl?: string;
}): Promise<any> {
  try {
    // Hash the password
    const passwordHash = await hashPassword(userData.password);
    
    // Default role to 'pending' if not specified
    const role = userData.role || 'pending';
    
    // Create the user
    const user = await storage.createUser({
      username: userData.username,
      email: userData.email.toLowerCase(),
      passwordHash,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      role,
      avatarUrl: userData.avatarUrl || '',
      failedLoginAttempts: 0,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Remove sensitive data before returning
    delete user.passwordHash;
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Create admin user if no admin exists
 * 
 * @param email Admin email
 * @param password Admin password
 * @param username Admin username (default: 'admin')
 * @returns Created admin user or null if admin already exists
 */
export async function createAdminIfNoneExists(
  email: string,
  password: string,
  username: string = 'admin'
): Promise<any | null> {
  try {
    // Check if any admin exists
    const adminExists = await storage.hasUserWithRole(['admin', 'superadmin']);
    
    if (adminExists) {
      return null; // Admin already exists
    }
    
    // Create admin user
    const adminUser = await createUser({
      username,
      email,
      password,
      role: 'superadmin',
      firstName: 'System',
      lastName: 'Administrator'
    });
    
    console.log('Created initial admin user:', adminUser.username);
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

/**
 * Find a user by reset token
 * 
 * @param token Reset token
 * @returns User if found, null otherwise
 */
export async function findUserByResetToken(token: string): Promise<any | null> {
  try {
    return await storage.getUserByResetToken(token);
  } catch (error) {
    console.error('Error finding user by reset token:', error);
    return null;
  }
}

/**
 * Request password reset for a user
 * 
 * @param email User email
 * @param generateToken Function to generate reset token
 * @returns Reset token info or null if user not found
 */
export async function requestPasswordReset(
  email: string,
  generateToken: (userId: number) => { token: string; expires: Date; signature: string }
): Promise<{ userId: number; token: string; expires: Date } | null> {
  try {
    // Find user by email
    const user = await storage.getUserByEmail(email.toLowerCase());
    
    if (!user) {
      return null; // User not found
    }
    
    // Generate reset token
    const { token, expires, signature } = generateToken(user.id);
    
    // Save token to user record
    await storage.updateUser(user.id, {
      resetToken: token,
      resetTokenExpires: expires,
      resetTokenSignature: signature
    });
    
    return {
      userId: user.id,
      token,
      expires
    };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
}

/**
 * Reset user password using token
 * 
 * @param token Reset token
 * @param signature Token signature
 * @param newPassword New password
 * @param verifyToken Function to verify token authenticity
 * @returns User or null if token is invalid
 */
export async function resetPassword(
  token: string,
  signature: string,
  newPassword: string,
  verifyToken: (token: string, userId: number, signature: string, expires: Date) => boolean
): Promise<any | null> {
  try {
    // Find user by reset token
    const user = await storage.getUserByResetToken(token);
    
    if (!user || !user.resetTokenExpires || !user.resetTokenSignature) {
      return null; // Invalid token or user
    }
    
    // Verify token
    const isValid = verifyToken(
      token,
      user.id,
      signature || user.resetTokenSignature,
      user.resetTokenExpires
    );
    
    if (!isValid) {
      return null; // Invalid token
    }
    
    // Hash the new password
    const passwordHash = await hashPassword(newPassword);
    
    // Update user password and clear reset token
    const updatedUser = await storage.updateUser(user.id, {
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
      resetTokenSignature: null,
      failedLoginAttempts: 0, // Reset failed login attempts
      updatedAt: new Date()
    });
    
    // Remove sensitive data before returning
    delete updatedUser.passwordHash;
    return updatedUser;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

/**
 * Change user password (when user knows current password)
 * 
 * @param userId User ID
 * @param currentPassword Current password
 * @param newPassword New password
 * @param verifyPassword Function to verify password
 * @returns Updated user or null if current password is incorrect
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  verifyPassword: (password: string, hash: string) => Promise<boolean>
): Promise<any | null> {
  try {
    // Get user with password hash
    const user = await storage.getUserById(userId, true);
    
    if (!user) {
      return null; // User not found
    }
    
    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    
    if (!isValid) {
      return null; // Current password is incorrect
    }
    
    // Hash the new password
    const passwordHash = await hashPassword(newPassword);
    
    // Update user password
    const updatedUser = await storage.updateUser(userId, {
      passwordHash,
      updatedAt: new Date()
    });
    
    // Remove sensitive data before returning
    delete updatedUser.passwordHash;
    return updatedUser;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}

/**
 * Approve user account
 * 
 * @param userId User ID to approve
 * @param approverId ID of user performing the approval
 * @returns Updated user
 */
export async function approveUser(userId: number, approverId: number): Promise<any> {
  try {
    // Get current user role
    const user = await storage.getUserById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Only change role if current role is 'pending'
    if (user.role !== 'pending') {
      return user; // User already approved
    }
    
    // Update user role to 'user'
    const updatedUser = await storage.updateUser(userId, {
      role: 'user',
      approvedBy: approverId,
      approvedAt: new Date(),
      updatedAt: new Date()
    });
    
    return updatedUser;
  } catch (error) {
    console.error('Error approving user:', error);
    throw error;
  }
}

/**
 * Update user role
 * 
 * @param userId User ID to update
 * @param newRole New role
 * @param adminId ID of admin performing the update
 * @returns Updated user
 */
export async function updateUserRole(
  userId: number,
  newRole: 'superadmin' | 'admin' | 'user' | 'pending',
  adminId: number
): Promise<any> {
  try {
    // Get admin user to verify role
    const admin = await storage.getUserById(adminId);
    
    if (!admin || !['superadmin', 'admin'].includes(admin.role)) {
      throw new Error('Unauthorized: Not an admin');
    }
    
    // Get user to update
    const user = await storage.getUserById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Super admins can only be modified by other super admins
    if (user.role === 'superadmin' && admin.role !== 'superadmin') {
      throw new Error('Unauthorized: Cannot modify a superadmin');
    }
    
    // Only superadmins can create other superadmins
    if (newRole === 'superadmin' && admin.role !== 'superadmin') {
      throw new Error('Unauthorized: Only superadmins can create superadmins');
    }
    
    // Update user role
    const updatedUser = await storage.updateUser(userId, {
      role: newRole,
      updatedAt: new Date(),
      updatedBy: adminId
    });
    
    return updatedUser;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Lock or unlock a user account
 * 
 * @param userId User ID to update
 * @param locked Whether to lock (true) or unlock (false) the account
 * @param adminId ID of admin performing the update
 * @returns Updated user
 */
export async function setUserLockStatus(
  userId: number,
  locked: boolean,
  adminId: number
): Promise<any> {
  try {
    // Get admin user to verify role
    const admin = await storage.getUserById(adminId);
    
    if (!admin || !['superadmin', 'admin'].includes(admin.role)) {
      throw new Error('Unauthorized: Not an admin');
    }
    
    // Get user to update
    const user = await storage.getUserById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Admins can't lock superadmins
    if (user.role === 'superadmin' && admin.role !== 'superadmin') {
      throw new Error('Unauthorized: Cannot modify a superadmin');
    }
    
    // Update user locked status
    const updatedUser = await storage.updateUser(userId, {
      locked,
      updatedAt: new Date(),
      updatedBy: adminId,
      // Reset failed login attempts when unlocking
      ...(locked === false && { failedLoginAttempts: 0 })
    });
    
    return updatedUser;
  } catch (error) {
    console.error('Error setting user lock status:', error);
    throw error;
  }
}