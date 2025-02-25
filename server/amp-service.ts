import axios from 'axios';
import https from 'https';

interface AMPInstance {
  InstanceID: string;
  FriendlyName: string;
  Running: boolean;
  Status: string;
  ActiveUsers: number;
  MaxUsers: number;
}

export class AMPService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private sessionId: string | null = null;
  private sessionExpiry: Date | null = null;

  constructor() {
    this.baseUrl = process.env.AMP_API_URL || '';
    this.username = process.env.AMP_API_USERNAME || '';
    this.password = process.env.AMP_API_PASSWORD || '';

    if (!this.baseUrl || !this.username || !this.password) {
      console.error('AMP configuration missing:', {
        hasUrl: !!this.baseUrl,
        hasUsername: !!this.username,
        hasPassword: !!this.password
      });
    }

    // Configure axios for HTTPS
    axios.defaults.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  public reinitialize(url: string, username: string, password: string) {
    console.log('Reinitializing AMP service with new credentials');
    this.baseUrl = url;
    this.username = username;
    this.password = password;
    this.sessionId = null;
    this.sessionExpiry = null;
  }

  private async makeAPICall(endpoint: string, parameters: any = {}, requiresAuth: boolean = true) {
    try {
      const url = `${this.baseUrl}/API/${endpoint}`;
      console.log(`Making API call to ${url}`, { 
        ...parameters, 
        password: parameters.password ? '[REDACTED]' : undefined 
      });

      const response = await axios.post(
        url,
        parameters,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 10000 // 10 second timeout
        }
      );

      console.log(`API Response from ${endpoint}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Failed to connect to AMP server at ${this.baseUrl}. Please check if the server is running and accessible.`);
        }
        throw new Error(`API call failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  private async login(): Promise<void> {
    try {
      console.log('Attempting to login to AMP');
      const loginData = {
        username: this.username,
        password: this.password,
        token: '',
        rememberMe: false
      };

      const response = await this.makeAPICall('Core/Login', loginData, false);
      if (response.sessionID) {
        this.sessionId = response.sessionID;
        this.sessionExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        console.log('Login successful, session established');
      } else {
        throw new Error('No session ID in login response');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.sessionId || !this.sessionExpiry || new Date() > this.sessionExpiry) {
      await this.login();
    }
  }

  private async callAPI(endpoint: string, parameters: any = {}): Promise<any> {
    await this.ensureAuthenticated();
    return this.makeAPICall(endpoint, { ...parameters, SESSIONID: this.sessionId }, true);
  }

  async getInstances(): Promise<AMPInstance[]> {
    try {
      console.log('Fetching AMP instances');
      const result = await this.callAPI('ADSModule/GetInstances', {});
      console.log('Raw instance response:', result);

      if (result && Array.isArray(result) && result.length > 0 && result[0].AvailableInstances) {
        const instances = result[0].AvailableInstances;
        console.log('Found instances:', instances);
        return instances;
      }
      console.log('No instances found in response');
      return [];
    } catch (error) {
      console.error('Failed to fetch instances:', error);
      throw error;
    }
  }

  async startInstance(instanceId: string): Promise<void> {
    try {
      console.log(`Starting instance ${instanceId}`);
      await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Start`, {});
      console.log(`Successfully sent start command to instance ${instanceId}`);

      // Wait briefly to allow the command to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check the instance status
      const status = await this.getInstanceStatus(instanceId);
      console.log(`Status after start command for ${instanceId}:`, status);
    } catch (error) {
      console.error(`Failed to start instance ${instanceId}:`, error);
      throw error;
    }
  }

  async stopInstance(instanceId: string): Promise<void> {
    try {
      console.log(`Stopping instance ${instanceId}`);
      await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Stop`, {});
      console.log(`Successfully sent stop command to instance ${instanceId}`);

      // Wait briefly to allow the command to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check the instance status
      const status = await this.getInstanceStatus(instanceId);
      console.log(`Status after stop command for ${instanceId}:`, status);
    } catch (error) {
      console.error(`Failed to stop instance ${instanceId}:`, error);
      throw error;
    }
  }

  async restartInstance(instanceId: string): Promise<void> {
    try {
      console.log(`Restarting instance ${instanceId}`);
      await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Restart`, {});
      console.log(`Successfully sent restart command to instance ${instanceId}`);

      // Wait briefly to allow the command to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check the instance status
      const status = await this.getInstanceStatus(instanceId);
      console.log(`Status after restart command for ${instanceId}:`, status);
    } catch (error) {
      console.error(`Failed to restart instance ${instanceId}:`, error);
      throw error;
    }
  }

  async killInstance(instanceId: string): Promise<void> {
    try {
      console.log(`Killing instance ${instanceId}`);
      await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Kill`, {});
      console.log(`Successfully sent kill command to instance ${instanceId}`);

      // Wait briefly to allow the command to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check the instance status
      const status = await this.getInstanceStatus(instanceId);
      console.log(`Status after kill command for ${instanceId}:`, status);
    } catch (error) {
      console.error(`Failed to kill instance ${instanceId}:`, error);
      throw error;
    }
  }

  async getInstanceStatus(instanceId: string): Promise<any> {
    try {
      console.log(`Getting status for instance ${instanceId}`);
      const status = await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/GetStatus`, {});
      console.log(`Status for instance ${instanceId}:`, status);
      return status;
    } catch (error) {
      console.error(`Failed to get status for instance ${instanceId}:`, error);
      throw error;
    }
  }

  async getMetrics(instanceId: string): Promise<{
    TPS: string;
    Users: [string, string];
    CPU: string;
    Memory: [string, string];
    Uptime: string;
  }> {
    const result = await this.getInstanceStatus(instanceId);

    if (!result) {
      return {
        TPS: '0',
        Users: ['0', '0'],
        CPU: '0',
        Memory: ['0', '0'],
        Uptime: '0'
      };
    }

    return {
      TPS: result.State?.toString() || '0',
      Users: [
        result.Metrics?.['Active Users']?.RawValue?.toString() || '0',
        result.Metrics?.['Active Users']?.MaxValue?.toString() || '0'
      ],
      CPU: result.Metrics?.['CPU Usage']?.RawValue?.toString() || '0',
      Memory: [
        result.Metrics?.['Memory Usage']?.RawValue?.toString() || '0',
        result.Metrics?.['Memory Usage']?.MaxValue?.toString() || '0'
      ],
      Uptime: result.Uptime?.toString() || '0'
    };
  }

  async getSystemInfo(): Promise<any> {
    try {
      await this.ensureAuthenticated();
      return await this.callAPI('Core/GetSystemInfo');
    } catch (error) {
      console.error('Failed to get system info:', error);
      throw error;
    }
  }

  async getAPISpec(): Promise<any> {
    try {
      await this.ensureAuthenticated();
      return await this.callAPI('Core/GetAPISpec');
    } catch (error) {
      console.error('Failed to get API spec:', error);
      throw error;
    }
  }

  async getModuleInfo(): Promise<any> {
    try {
      await this.ensureAuthenticated();
      return await this.callAPI('Core/GetModuleInfo');
    } catch (error) {
      console.error('Failed to get module info:', error);
      throw error;
    }
  }
}

export const ampService = new AMPService();