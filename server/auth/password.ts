import * as crypto from 'crypto';
import * as util from 'util';

// Try to import bcrypt but provide a fallback if it's not available
let bcrypt: any = null;
try {
  bcrypt = require('bcrypt');
} catch (error) {
  console.warn('bcrypt not available, using fallback implementation');
}

// Constants for secure token generation
const RESET_TOKEN_BYTES = 32; // 256 bits
const TOKEN_EXPIRY_HOURS = 24; // 24 hours
const PBKDF2_ITERATIONS = 100000; // 100,000 iterations for PBKDF2
const PBKDF2_KEY_LENGTH = 64; // 512 bits
const PBKDF2_DIGEST = 'sha512';
const SALT_BYTES = 16; // 128 bits

/**
 * Hash a password using bcrypt or fallback to PBKDF2
 * 
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  if (bcrypt) {
    // Use bcrypt if available (preferred)
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  } else {
    // Fallback to PBKDF2
    return await hashPasswordFallback(password);
  }
}

/**
 * Verify a password against a hash
 * 
 * @param password Plain text password
 * @param hash Hashed password
 * @returns Whether the password matches the hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (bcrypt && hash.startsWith('$2')) {
    // Use bcrypt if available and the hash is a bcrypt hash
    return await bcrypt.compare(password, hash);
  } else {
    // Fallback to PBKDF2
    return await verifyPasswordFallback(password, hash);
  }
}

/**
 * Fallback password hashing using PBKDF2
 * This is used when bcrypt is not available
 * 
 * @param password Plain text password
 * @returns Hashed password with salt (format: pbkdf2:salt:hash)
 */
async function hashPasswordFallback(password: string): Promise<string> {
  // Generate random salt
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  
  // Hash the password using PBKDF2
  const pbkdf2 = util.promisify(crypto.pbkdf2);
  const hash = await pbkdf2(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  );
  
  // Return formatted hash
  return `pbkdf2:${salt}:${hash.toString('hex')}`;
}

/**
 * Fallback password verification using PBKDF2
 * This is used when bcrypt is not available or for legacy passwords
 * 
 * @param password Plain text password
 * @param storedHash Stored hash from hashPasswordFallback
 * @returns Whether the password matches the hash
 */
async function verifyPasswordFallback(password: string, storedHash: string): Promise<boolean> {
  // Check if this is a PBKDF2 hash
  if (!storedHash.startsWith('pbkdf2:')) {
    return false;
  }
  
  // Extract salt and hash from stored hash
  const parts = storedHash.split(':');
  if (parts.length !== 3) {
    return false;
  }
  
  const salt = parts[1];
  const originalHash = parts[2];
  
  // Hash the provided password with the same salt
  const pbkdf2 = util.promisify(crypto.pbkdf2);
  const hash = await pbkdf2(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  );
  
  // Compare the hashes
  return hash.toString('hex') === originalHash;
}

/**
 * Generate a secure random token for password reset or other purposes
 * 
 * @param userId User ID to associate with the token
 * @returns Token, expiration date, and signature
 */
export function generateTimedToken(userId: number): {
  token: string;
  expires: Date;
  signature: string;
} {
  // Generate a random token
  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  
  // Set expiration date
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);
  
  // Generate signature to verify the token
  const signature = crypto
    .createHmac('sha256', process.env.APP_SECRET || 'default-secret')
    .update(`${token}:${userId}:${expires.getTime()}`)
    .digest('hex');
  
  return {
    token,
    expires,
    signature
  };
}

/**
 * Verify a timed token (e.g., password reset token)
 * 
 * @param token Token to verify
 * @param userId User ID associated with the token
 * @param signature Original signature
 * @param expires Expiration date
 * @returns Whether the token is valid
 */
export function verifyTimedToken(
  token: string,
  userId: number,
  signature: string,
  expires: Date
): boolean {
  // Check if token has expired
  if (expires < new Date()) {
    return false;
  }
  
  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.APP_SECRET || 'default-secret')
    .update(`${token}:${userId}:${expires.getTime()}`)
    .digest('hex');
  
  // Check if signatures match
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

/**
 * Generate a secure random string for use as app secrets
 * 
 * @param length Length of the secret
 * @returns Random string
 */
export function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a temporary password for user accounts
 * Creates a password that is secure but readable by users
 * 
 * @param length Length of the password (default: 10)
 * @returns A secure random password
 */
export function generateTemporaryPassword(length: number = 10): string {
  // Define character sets
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I, O which can be confused
  const lowercaseChars = 'abcdefghijkmnpqrstuvwxyz'; // Excluding l, o which can be confused
  const numberChars = '23456789'; // Excluding 0, 1 which can be confused
  const specialChars = '@#$%^&*-_=+?';
  
  // Combine all character sets
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  
  // Initialize password
  let password = '';
  
  // Ensure password has at least one of each character type
  password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Fill the rest of the password with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password to make it more random
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if a password hash needs to be updated to a newer algorithm
 * 
 * @param password Plain text password
 * @param hash Existing hash
 * @returns New hash if rehash is needed, null otherwise
 */
export async function needsRehash(password: string, hash: string): Promise<string | null> {
  // If using fallback but bcrypt is now available
  if (hash.startsWith('pbkdf2:') && bcrypt) {
    return await hashPassword(password);
  }
  
  // No rehash needed
  return null;
}