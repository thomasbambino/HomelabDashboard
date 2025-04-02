import { IService } from './interfaces';
import axios from 'axios';

/**
 * Interface for AMP instance information
 */
export interface AMPInstance {
  InstanceID: string;
  FriendlyName: string;
  Running: boolean;
  Status: string;
  Metrics: {
    'CPU Usage': {
      RawValue: number;
      MaxValue: number;
    };
    'Memory Usage': {
      RawValue: number;
      MaxValue: number;
    };
    'Active Users': {
      RawValue: number;
      MaxValue: number;
    };
  };
  ApplicationEndpoints?: Array<{
    DisplayName: string;
    Endpoint: string;
  }>;
}

/**
 * Service for interacting with AMP (Application Management Platform) game server management
 */
export class AMPService implements IService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private sessionId: string | null = null;
  private sessionExpiry: Date | null = null;
  private initialized: boolean = false;

  constructor() {
    this.baseUrl = process.env.AMP_API_URL || '';
    this.username = process.env.AMP_API_USERNAME || '';
    this.password = process.env.AMP_API_PASSWORD || '';
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.baseUrl && this.username && this.password) {
      try {
        await this.login();
        this.initialized = true;
        console.log('AMP Service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize AMP Service:', error);
        throw error;
      }
    } else {
      console.warn('AMP Service not fully configured - missing credentials');
    }
  }

  /**
   * Reinitialize the service with new configuration
   */
  async reinitialize(baseUrl?: string, username?: string, password?: string): Promise<void> {
    if (baseUrl) this.baseUrl = baseUrl;
    if (username) this.username = username;
    if (password) this.password = password;
    
    this.sessionId = null;
    this.sessionExpiry = null;
    
    await this.initialize();
  }

  /**
   * Check if the service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      return true;
    } catch (error) {
      console.error('AMP Service health check failed:', error);
      return false;
    }
  }

  /**
   * Make an API call to the AMP server
   */
  private async makeAPICall(endpoint: string, parameters: any = {}, requiresAuth: boolean = true) {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const requestData = {
      SESSIONID: requiresAuth ? this.sessionId : null,
      ...parameters
    };

    try {
      const response = await axios.post(url, requestData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status !== 200) {
        throw new Error(`API call failed with status ${response.status}`);
      }

      const data = response.data;
      if (data.Status !== 200) {
        throw new Error(`API returned error status: ${data.Status}, Message: ${data.Message}`);
      }

      return data.Result;
    } catch (error) {
      console.error(`Error calling AMP API at ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Log in to the AMP server
   */
  private async login(): Promise<void> {
    try {
      const result = await this.makeAPICall('Core/Login', {
        username: this.username,
        password: this.password,
        rememberMe: true,
        token: ''
      }, false);

      this.sessionId = result.SessionID;
      
      // Set session expiry to 1 hour from now
      this.sessionExpiry = new Date();
      this.sessionExpiry.setHours(this.sessionExpiry.getHours() + 1);
      
      console.log('Successfully logged in to AMP');
    } catch (error) {
      console.error('Failed to login to AMP:', error);
      throw error;
    }
  }

  /**
   * Ensure the service is authenticated
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.sessionId || !this.sessionExpiry || new Date() > this.sessionExpiry) {
      await this.login();
    }
  }

  /**
   * Call the AMP API
   */
  private async callAPI(endpoint: string, parameters: any = {}): Promise<any> {
    await this.ensureAuthenticated();
    return this.makeAPICall(endpoint, parameters, true);
  }

  /**
   * Start an AMP instance
   */
  async startInstance(instanceId: string): Promise<void> {
    await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Start`, {});
  }

  /**
   * Stop an AMP instance
   */
  async stopInstance(instanceId: string): Promise<void> {
    await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Stop`, {});
  }

  /**
   * Restart an AMP instance
   */
  async restartInstance(instanceId: string): Promise<void> {
    await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Restart`, {});
  }

  /**
   * Kill an AMP instance
   */
  async killInstance(instanceId: string): Promise<void> {
    await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Kill`, {});
  }

  /**
   * Get all AMP instances
   */
  async getInstances(): Promise<AMPInstance[]> {
    try {
      console.log('Fetching AMP instances');
      const result = await this.callAPI('ADSModule/GetInstances', {});
      
      if (!Array.isArray(result)) {
        console.error('Expected array of instances but got:', result);
        return [];
      }
      
      console.log(`Retrieved ${result.length} AMP instances`);
      return result;
    } catch (error) {
      console.error('Error getting AMP instances:', error);
      return [];
    }
  }

  /**
   * Get status of a specific instance
   */
  async getInstanceStatus(instanceId: string): Promise<any> {
    return await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/GetStatus`, {});
  }

  /**
   * Get metrics for a specific instance
   */
  async getMetrics(instanceId: string): Promise<{
    cpu: number;
    memory: number;
    activePlayers: number;
    maxPlayers: number;
  }> {
    try {
      const status = await this.getInstanceStatus(instanceId);
      
      // Extract the metrics
      const cpu = status.Metrics?.['CPU Usage']?.RawValue || 0;
      const memory = status.Metrics?.['Memory Usage']?.RawValue || 0;
      const activePlayers = status.Metrics?.['Active Users']?.RawValue || 0;
      const maxPlayers = status.Metrics?.['Active Users']?.MaxValue || 0;
      
      return {
        cpu,
        memory,
        activePlayers,
        maxPlayers
      };
    } catch (error) {
      console.error(`Error getting metrics for instance ${instanceId}:`, error);
      return {
        cpu: 0,
        memory: 0,
        activePlayers: 0,
        maxPlayers: 0
      };
    }
  }

  /**
   * Get user list for a specific instance
   */
  async getUserList(instanceId: string): Promise<string[]> {
    try {
      const result = await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/GetUserList`, {});
      
      if (!Array.isArray(result)) {
        console.warn(`Expected array of users for instance ${instanceId} but got:`, result);
        return [];
      }
      
      return result;
    } catch (error) {
      console.error(`Error getting user list for instance ${instanceId}:`, error);
      return [];
    }
  }

  /**
   * Get active player count for a specific instance
   */
  async getActivePlayerCount(instanceId: string): Promise<number> {
    try {
      const users = await this.getUserList(instanceId);
      return users.length;
    } catch (error) {
      console.error(`Error getting active player count for instance ${instanceId}:`, error);
      return 0;
    }
  }

  /**
   * Debug player count issues for a specific instance
   */
  async debugPlayerCount(instanceId: string): Promise<void> {
    try {
      console.log(`DEBUG: Getting status for instance ${instanceId}`);
      const status = await this.getInstanceStatus(instanceId);
      console.log('Status:', JSON.stringify(status, null, 2));
      
      console.log(`DEBUG: Getting user list for instance ${instanceId}`);
      const users = await this.getUserList(instanceId);
      console.log('Users:', users);
      
      console.log(`DEBUG: Getting metrics for instance ${instanceId}`);
      const metrics = await this.getMetrics(instanceId);
      console.log('Metrics:', metrics);
    } catch (error) {
      console.error(`Error during player count debugging for instance ${instanceId}:`, error);
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<any> {
    return await this.callAPI('Core/GetSystemInfo', {});
  }

  /**
   * Get available API methods
   */
  async getAvailableAPIMethods(): Promise<any> {
    try {
      const result = await this.callAPI('Core/GetAPISpec', {});
      return result;
    } catch (error) {
      console.error('Error getting API spec:', error);
      
      try {
        console.log('Trying GetAPISpecification instead...');
        const result = await this.callAPI('Core/GetAPISpecification', {});
        return result;
      } catch (innerError) {
        console.error('Also failed to get API specification:', innerError);
        
        // If GetAPISpec also doesn't exist, try a different approach
        try {
          console.log('Trying to get module info instead...');
          const moduleInfo = await this.callAPI('Core/GetModuleInfo', {});
          console.log('Module info (might contain API hints):', moduleInfo);
          return moduleInfo;
        } catch (innerError) {
          console.error('Also failed to get module info:', innerError);
          throw new Error('Cannot determine available API methods');
        }
      }
    }
  }
}

// Export a singleton instance
export const ampService = new AMPService();