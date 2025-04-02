import { storage } from '../storage';
import { hashPassword, verifyPassword, generateToken } from './password';

/**
 * Create a new user
 * 
 * @param userData User data
 * @returns The created user
 */
export async function createUser(userData: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  role?: string;
  approved?: boolean;
}): Promise<any> {
  try {
    // Hash the password
    const passwordHash = await hashPassword(userData.password);
    
    // Create the user
    const user = await storage.createUser({
      username: userData.username,
      email: userData.email,
      passwordHash,
      displayName: userData.displayName || userData.username,
      role: userData.role || 'user',
      approved: userData.approved !== undefined ? userData.approved : false,
      created: new Date(),
      lastLogin: null,
      locked: false,
    });
    
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Authenticate a user with username/email and password
 * 
 * @param usernameOrEmail Username or email
 * @param password Password
 * @returns The user if authentication is successful, null otherwise
 */
export async function authenticateUser(usernameOrEmail: string, password: string): Promise<any> {
  try {
    // Get user by username or email
    const user = await storage.getUserByUsernameOrEmail(usernameOrEmail);
    
    if (!user) {
      return null;
    }
    
    // Check if the user is locked
    if (user.locked) {
      console.warn(`Authentication attempt for locked user: ${usernameOrEmail}`);
      return null;
    }
    
    // Check password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    
    if (!passwordValid) {
      console.warn(`Invalid password for user: ${usernameOrEmail}`);
      return null;
    }
    
    // Update last login time
    await storage.updateUser(user.id, {
      lastLogin: new Date()
    });
    
    return user;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

/**
 * Generate a password reset token for a user
 * 
 * @param email User's email
 * @returns The token and user info if successful, null otherwise
 */
export async function generatePasswordResetToken(email: string): Promise<{ token: string; user: any } | null> {
  try {
    // Find the user
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return null;
    }
    
    // Generate a token
    const token = generateToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token expires in 1 hour
    
    // Save the token
    await storage.createPasswordResetToken({
      userId: user.id,
      token,
      expires
    });
    
    return { token, user };
  } catch (error) {
    console.error('Error generating password reset token:', error);
    return null;
  }
}

/**
 * Reset a user's password using a token
 * 
 * @param token Reset token
 * @param newPassword New password
 * @returns True if successful, false otherwise
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    // Get the token
    const resetToken = await storage.getPasswordResetToken(token);
    
    if (!resetToken) {
      return false;
    }
    
    // Check if the token is expired
    if (resetToken.expires < new Date()) {
      await storage.deletePasswordResetToken(token);
      return false;
    }
    
    // Hash the new password
    const passwordHash = await hashPassword(newPassword);
    
    // Update the user's password
    await storage.updateUser(resetToken.userId, {
      passwordHash
    });
    
    // Delete the token
    await storage.deletePasswordResetToken(token);
    
    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    return false;
  }
}

/**
 * Lock a user account
 * 
 * @param user User to lock
 * @returns Updated user
 */
export async function lockUser(user: any): Promise<any> {
  return await storage.updateUser(user.id, {
    locked: true
  });
}

/**
 * Unlock a user account
 * 
 * @param user User to unlock
 * @returns Updated user
 */
export async function unlockUser(user: any): Promise<any> {
  return await storage.updateUser(user.id, {
    locked: false
  });
}

/**
 * Change a user's password
 * 
 * @param userId User ID
 * @param currentPassword Current password
 * @param newPassword New password
 * @returns True if successful, false otherwise
 */
export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    // Get the user
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return false;
    }
    
    // Verify the current password
    const passwordValid = await verifyPassword(currentPassword, user.passwordHash);
    
    if (!passwordValid) {
      return false;
    }
    
    // Hash the new password
    const passwordHash = await hashPassword(newPassword);
    
    // Update the user's password
    await storage.updateUser(userId, {
      passwordHash
    });
    
    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    return false;
  }
}

/**
 * Generate an API key for a user
 * 
 * @param userId User ID
 * @param name Name for the API key
 * @returns The API key data if successful, null otherwise
 */
export async function generateApiKey(userId: number, name: string): Promise<any> {
  try {
    const apiKey = await storage.createApiKey({
      userId,
      name,
      key: generateToken(32),
      created: new Date(),
      lastUsed: null
    });
    
    return apiKey;
  } catch (error) {
    console.error('Error generating API key:', error);
    return null;
  }
}

/**
 * Delete an API key
 * 
 * @param keyId API key ID
 * @param userId User ID (for authorization check)
 * @returns True if successful, false otherwise
 */
export async function deleteApiKey(keyId: number, userId: number): Promise<boolean> {
  try {
    // Verify the key belongs to the user
    const key = await storage.getApiKeyById(keyId);
    
    if (!key || key.userId !== userId) {
      return false;
    }
    
    await storage.deleteApiKey(keyId);
    return true;
  } catch (error) {
    console.error('Error deleting API key:', error);
    return false;
  }
}