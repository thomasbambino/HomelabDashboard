import { Request } from 'express';
import { storage } from '../../storage';
import axios from 'axios';

/**
 * Get information about an IP address (geolocation, ISP, etc.)
 * 
 * @param ip IP address
 * @returns IP information including geolocation and ISP
 */
export async function getIpInfo(ip: string): Promise<{
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
}> {
  try {
    // First check if we have cached data for this IP
    const cachedInfo = await storage.getIpInfoFromCache(ip);
    if (cachedInfo) {
      return cachedInfo;
    }
    
    // For privacy and security, don't query external services for private IPs
    if (
      ip === 'localhost' ||
      ip === '127.0.0.1' ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') ||
      ip.startsWith('192.168.')
    ) {
      return { ip, country: 'Local', region: 'Local', city: 'Local', isp: 'Local Network' };
    }
    
    // Use IP-API for geolocation (free, no API key required)
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`, {
      timeout: 3000 // 3 second timeout
    });
    
    if (response.data && response.data.status === 'success') {
      const ipInfo = {
        ip,
        country: response.data.country,
        region: response.data.regionName,
        city: response.data.city,
        isp: response.data.isp
      };
      
      // Cache this IP info for future lookups
      await storage.cacheIpInfo(ipInfo);
      
      return ipInfo;
    }
    
    return { ip };
  } catch (error) {
    console.error('Error getting IP info:', error);
    return { ip };
  }
}

/**
 * Get the client's IP address from the request
 * Handles proxies and various IP headers
 * 
 * @param req Express request
 * @returns The client's IP address
 */
export async function getClientIp(req: Request): Promise<string> {
  // Trust the following headers to provide the real IP address
  // X-Forwarded-For is used by most proxies
  // CF-Connecting-IP is used by Cloudflare
  // X-Real-IP is used by Nginx
  // Trust X-Forwarded-For for Replit deployment
  
  let ip = req.headers['x-forwarded-for'] as string;
  
  if (ip) {
    // X-Forwarded-For can include multiple IPs, take the first one
    const ips = ip.split(',');
    ip = ips[0].trim();
  } else if (req.headers['cf-connecting-ip']) {
    // Cloudflare IP
    ip = req.headers['cf-connecting-ip'] as string;
  } else if (req.headers['x-real-ip']) {
    // Nginx real IP
    ip = req.headers['x-real-ip'] as string;
  } else {
    // Fallback to the socket IP
    ip = req.ip || req.socket.remoteAddress || '';
  }
  
  // If IPv6 format, extract IPv4 if embedded (e.g., ::ffff:127.0.0.1)
  if (ip.includes('::ffff:')) {
    ip = ip.split('::ffff:')[1];
  }
  
  return ip || 'unknown';
}

/**
 * Track login attempt from an IP address
 * 
 * @param userId User ID (0 for unknown users)
 * @param ip IP address
 * @param success Whether the login was successful
 */
export async function trackLoginIp(userId: number, ip: string, success: boolean): Promise<void> {
  try {
    await storage.createLoginHistory({
      userId,
      ip,
      successful: success,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error tracking login IP:', error);
  }
}

/**
 * Check if an IP address is suspicious
 * An IP is considered suspicious if it has too many failed login attempts
 * 
 * @param ip IP address to check
 * @returns Whether the IP is suspicious
 */
export async function isSuspiciousIp(ip: string): Promise<boolean> {
  try {
    // Check if IP is banned
    const banned = await isIpBanned(ip);
    if (banned) {
      return true;
    }
    
    // Get recent failed login attempts from this IP
    const failedAttempts = await storage.getFailedLoginAttempts(ip, 24); // Last 24 hours
    
    // IP is suspicious if it has too many failed login attempts
    // 10 or more failed attempts in the last 24 hours
    return failedAttempts >= 10;
  } catch (error) {
    console.error('Error checking suspicious IP:', error);
    return false;
  }
}

/**
 * Get login history for a user
 * 
 * @param userId User ID
 * @param limit Maximum number of records to return
 * @returns Array of login history records
 */
export async function getUserLoginHistory(userId: number, limit: number = 10): Promise<any[]> {
  try {
    return await storage.getUserLoginHistory(userId, limit);
  } catch (error) {
    console.error('Error getting user login history:', error);
    return [];
  }
}

/**
 * Get failed login attempts by IP
 * 
 * @param limit Maximum number of records to return
 * @returns Array of IP addresses and their failed login counts
 */
export async function getFailedLoginsByIp(limit: number = 50): Promise<any[]> {
  try {
    return await storage.getFailedLoginsByIp(limit);
  } catch (error) {
    console.error('Error getting failed logins by IP:', error);
    return [];
  }
}

/**
 * Ban an IP address
 * 
 * @param ip IP address to ban
 * @param reason Reason for the ban
 * @param adminId ID of the admin who banned the IP
 * @param expiresAt When the ban expires (null for permanent)
 */
export async function banIp(
  ip: string,
  reason: string,
  adminId: number,
  expiresAt: Date | null = null
): Promise<void> {
  try {
    await storage.createIpBan({
      ip,
      reason,
      createdBy: adminId,
      createdAt: new Date(),
      expiresAt
    });
  } catch (error) {
    console.error('Error banning IP:', error);
    throw error;
  }
}

/**
 * Unban an IP address
 * 
 * @param ip IP address to unban
 * @param adminId ID of the admin who unbanned the IP
 */
export async function unbanIp(ip: string, adminId: number): Promise<void> {
  try {
    await storage.deleteIpBan(ip, adminId);
  } catch (error) {
    console.error('Error unbanning IP:', error);
    throw error;
  }
}

/**
 * Check if an IP is banned
 * 
 * @param ip IP address to check
 * @returns Whether the IP is banned
 */
export async function isIpBanned(ip: string): Promise<boolean> {
  try {
    const bans = await storage.getIpBans(ip);
    
    if (bans.length === 0) {
      return false;
    }
    
    // Check if any bans are active (not expired)
    const now = new Date();
    return bans.some(ban => !ban.expiresAt || ban.expiresAt > now);
  } catch (error) {
    console.error('Error checking IP ban:', error);
    return false;
  }
}

/**
 * Get all IP bans
 * 
 * @param includeExpired Whether to include expired bans
 * @returns Array of IP bans
 */
export async function getIpBans(includeExpired: boolean = false): Promise<any[]> {
  try {
    const bans = await storage.getAllIpBans();
    
    if (includeExpired) {
      return bans;
    }
    
    // Filter out expired bans
    const now = new Date();
    return bans.filter(ban => !ban.expiresAt || ban.expiresAt > now);
  } catch (error) {
    console.error('Error getting IP bans:', error);
    return [];
  }
}