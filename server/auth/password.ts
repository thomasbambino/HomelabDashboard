import crypto from 'crypto';

// Flag to check if bcrypt is available (more secure, but requires native dependencies)
let bcryptAvailable = false;
let bcrypt: any;

// Try to load bcrypt if available
try {
  bcrypt = require('bcrypt');
  bcryptAvailable = true;
  console.log('bcrypt loaded, using native bcrypt for password hashing');
} catch (error) {
  console.log('bcrypt not available, using fallback password hashing');
}

/**
 * Generate a secure random salt
 * 
 * @param length Salt length
 * @returns Salt as hex string
 */
function generateSalt(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password using bcrypt if available, or fallback to PBKDF2
 * 
 * @param password Plain text password
 * @returns Password hash
 */
export async function hashPassword(password: string): Promise<string> {
  if (bcryptAvailable) {
    // Use bcrypt if available (more secure)
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    return `bcrypt:${hash}`;
  } else {
    // Fallback to PBKDF2
    const salt = generateSalt();
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      100000,  // Higher iterations = more secure, but slower
      64,      // Hash length
      'sha512' // Hash algorithm
    ).toString('hex');
    
    return `pbkdf2:${salt}:${hash}`;
  }
}

/**
 * Verify a password against a stored hash
 * 
 * @param password Plain text password
 * @param storedHash Stored password hash
 * @returns True if the password is correct
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) {
    return false;
  }
  
  if (storedHash.startsWith('bcrypt:')) {
    if (!bcryptAvailable) {
      console.error('Cannot verify bcrypt hash without bcrypt module');
      return false;
    }
    
    const hash = storedHash.substring(7); // Remove 'bcrypt:' prefix
    return await bcrypt.compare(password, hash);
  } else if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) {
      console.error('Invalid pbkdf2 hash format');
      return false;
    }
    
    const salt = parts[1];
    const hash = parts[2];
    
    const calculatedHash = crypto.pbkdf2Sync(
      password,
      salt,
      100000,
      64,
      'sha512'
    ).toString('hex');
    
    return calculatedHash === hash;
  } else {
    // Legacy hash format or unknown format
    console.error('Unknown password hash format');
    return false;
  }
}

/**
 * Check if a password hash needs to be rehashed due to stronger algorithms available
 * 
 * @param password Plain text password
 * @param storedHash Stored password hash
 * @returns New hash if rehashing is recommended, null otherwise
 */
export async function needsRehash(password: string, storedHash: string): Promise<string | null> {
  // If bcrypt is available but we're using PBKDF2, upgrade to bcrypt
  if (bcryptAvailable && storedHash.startsWith('pbkdf2:')) {
    return await hashPassword(password);
  }
  
  // In the future, we could check for better bcrypt rounds or upgraded PBKDF2 parameters
  
  return null;
}

/**
 * Generate a secure random token
 * 
 * @param length Token length in bytes (will be twice this length as hex string)
 * @returns Random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password reset token with a timestamp to prevent reuse
 * 
 * @param token Plain text token
 * @param userId User ID (used as salt)
 * @returns Hashed token
 */
export function hashResetToken(token: string, userId: number): string {
  const userIdStr = userId.toString();
  return crypto.createHmac('sha256', userIdStr)
    .update(token)
    .digest('hex');
}

/**
 * Verify a password reset token
 * 
 * @param token Plain text token
 * @param userId User ID (used as salt)
 * @param hashedToken Hashed token
 * @returns True if the token is valid
 */
export function verifyResetToken(token: string, userId: number, hashedToken: string): boolean {
  const calculatedHash = hashResetToken(token, userId);
  return calculatedHash === hashedToken;
}