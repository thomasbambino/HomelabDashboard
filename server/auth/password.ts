import crypto from 'crypto';

// Flag to track if we have bcrypt
let hasBcrypt = false;
let bcrypt: any = null;

// Try to load bcrypt if available
try {
  bcrypt = require('bcrypt');
  hasBcrypt = true;
} catch (error) {
  console.warn('bcrypt module not available, falling back to pbkdf2');
}

// Constants for PBKDF2 (fallback if bcrypt is not available)
const PBKDF2_ITERATIONS = 10000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const SALT_LENGTH = 16;

/**
 * Hash a password using bcrypt or PBKDF2 if bcrypt is not available
 * 
 * @param password Plain text password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  // Check if the password is already hashed
  if (password.startsWith('$2b$') || password.startsWith('pbkdf2:')) {
    return password;
  }
  
  if (hasBcrypt) {
    try {
      // Use bcrypt for hashing (recommended)
      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);
      return hash;
    } catch (error) {
      console.error('Error using bcrypt:', error);
      // Fall back to PBKDF2 if bcrypt fails
      return hashPasswordWithPbkdf2(password);
    }
  } else {
    // Use PBKDF2 as fallback
    return hashPasswordWithPbkdf2(password);
  }
}

/**
 * Hash a password using PBKDF2 (fallback method)
 * Format: pbkdf2:iterations:salt:hash
 * 
 * @param password Plain text password
 * @returns Hashed password string
 */
function hashPasswordWithPbkdf2(password: string): string {
  // Generate a random salt
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  
  // Hash the password
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  ).toString('hex');
  
  // Format: pbkdf2:iterations:salt:hash
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 * 
 * @param password Plain text password
 * @param hash Stored hash
 * @returns True if the password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  
  // Check hash format
  if (hash.startsWith('$2b$') && hasBcrypt) {
    // bcrypt hash
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error comparing with bcrypt:', error);
      return false;
    }
  } else if (hash.startsWith('pbkdf2:')) {
    // PBKDF2 hash
    return verifyPasswordPbkdf2(password, hash);
  }
  
  // Unknown hash format
  return false;
}

/**
 * Verify a password against a PBKDF2 hash
 * Format: pbkdf2:iterations:salt:hash
 * 
 * @param password Plain text password
 * @param storedHash Stored hash (pbkdf2:iterations:salt:hash)
 * @returns True if the password matches, false otherwise
 */
function verifyPasswordPbkdf2(password: string, storedHash: string): boolean {
  try {
    // Split the stored hash into parts
    const [prefix, iterations, salt, hash] = storedHash.split(':');
    
    if (prefix !== 'pbkdf2' || !iterations || !salt || !hash) {
      return false;
    }
    
    // Hash the provided password with the same salt and iterations
    const derivedKey = crypto.pbkdf2Sync(
      password,
      salt,
      parseInt(iterations, 10),
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST
    ).toString('hex');
    
    // Compare the derived key with the stored hash
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(derivedKey, 'hex')
    );
  } catch (error) {
    console.error('Error verifying PBKDF2 password:', error);
    return false;
  }
}

/**
 * Generate a secure random token
 * 
 * @param length Length of the token in bytes (default: 32)
 * @returns Hexadecimal string
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random API key
 * Format: prefix_base64url
 * 
 * @param prefix Prefix for the API key (default: 'sk')
 * @param length Length of the token in bytes (default: 32)
 * @returns API key string
 */
export function generateApiKey(prefix = 'sk', length = 32): string {
  const buffer = crypto.randomBytes(length);
  const base64 = buffer.toString('base64');
  const base64url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${prefix}_${base64url}`;
}

/**
 * Check if the password needs to be upgraded
 * This is useful when migrating from a legacy system or when 
 * password hashing parameters have changed.
 * 
 * @param hash The stored hash
 * @returns True if the hash needs to be upgraded, false otherwise
 */
export function shouldUpgradePassword(hash: string): boolean {
  if (!hash) {
    return false;
  }
  
  // If bcrypt is available but the hash is PBKDF2, upgrade to bcrypt
  if (hasBcrypt && hash.startsWith('pbkdf2:')) {
    return true;
  }
  
  // For PBKDF2, check if the iterations are too low
  if (hash.startsWith('pbkdf2:')) {
    const [, iterations] = hash.split(':');
    const iterationCount = parseInt(iterations, 10);
    return iterationCount < PBKDF2_ITERATIONS;
  }
  
  // For bcrypt, we could check if the salt rounds are too low
  // but we'll leave that for a future update
  
  return false;
}