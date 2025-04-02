import { storage } from '../storage';
import { hashPassword } from './password';

/**
 * Create a new user
 * 
 * @param username Username for the new user
 * @param email Email address for the new user
 * @param password Plain text password for the new user
 * @param role Role for the new user (default: 'user')
 * @param approved Whether the user is approved (default: false)
 * @returns Promise that resolves to the created user
 */
export async function createUser(
  username: string,
  email: string,
  password: string,
  role: 'superadmin' | 'admin' | 'user' | 'pending' = 'pending',
  approved: boolean = false
) {
  // Hash the password
  const passwordHash = await hashPassword(password);
  
  // Create the user
  const user = await storage.createUser({
    username,
    email,
    passwordHash,
    role,
    approved,
    locked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null
  });
  
  return user;
}

/**
 * Change a user's password
 * 
 * @param userId User ID
 * @param newPassword New plain text password
 * @returns Promise that resolves when the password has been changed
 */
export async function changePassword(userId: number, newPassword: string): Promise<void> {
  // Hash the new password
  const passwordHash = await hashPassword(newPassword);
  
  // Update the user's password hash
  await storage.updateUserPasswordHash(userId, passwordHash);
}

/**
 * Check if a username is available (not already taken)
 * 
 * @param username Username to check
 * @returns Promise that resolves to true if the username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const user = await storage.getUserByUsername(username);
  return !user;
}

/**
 * Check if an email is available (not already taken)
 * 
 * @param email Email to check
 * @returns Promise that resolves to true if the email is available
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
  const user = await storage.getUserByEmail(email);
  return !user;
}

/**
 * Approve a user
 * 
 * @param userId User ID
 * @returns Promise that resolves when the user has been approved
 */
export async function approveUser(userId: number): Promise<void> {
  await storage.updateUser(userId, {
    approved: true,
    role: 'user', // Upgrade from 'pending' to 'user'
    updatedAt: new Date()
  });
}

/**
 * Change a user's role
 * 
 * @param userId User ID
 * @param newRole New role
 * @returns Promise that resolves when the role has been changed
 */
export async function changeUserRole(
  userId: number, 
  newRole: 'superadmin' | 'admin' | 'user' | 'pending'
): Promise<void> {
  await storage.updateUser(userId, {
    role: newRole,
    updatedAt: new Date()
  });
}

/**
 * Lock or unlock a user account
 * 
 * @param userId User ID
 * @param locked Whether the account should be locked
 * @returns Promise that resolves when the account has been locked/unlocked
 */
export async function setUserLockStatus(userId: number, locked: boolean): Promise<void> {
  await storage.updateUser(userId, {
    locked,
    updatedAt: new Date()
  });
}

/**
 * Delete a user
 * 
 * @param userId User ID
 * @returns Promise that resolves when the user has been deleted
 */
export async function deleteUser(userId: number): Promise<void> {
  await storage.deleteUser(userId);
}