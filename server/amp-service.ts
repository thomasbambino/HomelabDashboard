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
    this.baseUrl = (process.env.AMP_API_URL || '').replace(/\/$/, '');
    this.username = process.env.AMP_API_USERNAME || '';
    this.password = process.env.AMP_API_PASSWORD || '';

    if (!this.baseUrl || !this.username || !this.password) {
      console.error('AMP configuration missing:', {
        hasUrl: !!this.baseUrl,
        hasUsername: !!this.username,
        hasPassword: !!this.password
      });
    }

    axios.defaults.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  public reinitialize(url: string, username: string, password: string) {
    console.log('Reinitializing AMP service with new credentials');
    this.baseUrl = url.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.sessionId = null;
    this.sessionExpiry = null;
  }

  private async callAPI(endpoint: string, parameters: any = {}) {
    if (this.sessionId) {
      parameters.SESSIONID = this.sessionId;
    }

    console.log(`Calling API endpoint: ${endpoint} with parameters:`, {...parameters, password: '[REDACTED]'});

    try {
      const response = await axios.post(
        `${this.baseUrl}/API/${endpoint}`,
        parameters,
        {
          headers: {
            'Accept': 'text/javascript',
            'Content-Type': 'application/json',
          }
        }
      );

      console.log(`API Response for ${endpoint}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
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

      const response = await this.callAPI('Core/Login', loginData);
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

  async getInstances(): Promise<AMPInstance[]> {
    await this.ensureAuthenticated();
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
    await this.ensureAuthenticated();
    try {
      console.log(`Starting instance ${instanceId}`);
      await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Start`, {});
      console.log(`Successfully started instance ${instanceId}`);
    } catch (error) {
      console.error(`Failed to start instance ${instanceId}:`, error);
      throw error;
    }
  }

  async stopInstance(instanceId: string): Promise<void> {
    await this.ensureAuthenticated();
    try {
      console.log(`Stopping instance ${instanceId}`);
      await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Stop`, {});
      console.log(`Successfully stopped instance ${instanceId}`);
    } catch (error) {
      console.error(`Failed to stop instance ${instanceId}:`, error);
      throw error;
    }
  }

  async restartInstance(instanceId: string): Promise<void> {
    await this.ensureAuthenticated();
    try {
      console.log(`Restarting instance ${instanceId}`);
      await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Restart`, {});
      console.log(`Successfully restarted instance ${instanceId}`);
    } catch (error) {
      console.error(`Failed to restart instance ${instanceId}:`, error);
      throw error;
    }
  }

  async killInstance(instanceId: string): Promise<void> {
    await this.ensureAuthenticated();
    try {
      console.log(`Killing instance ${instanceId}`);
      await this.callAPI(`ADSModule/Servers/${instanceId}/API/Core/Kill`, {});
      console.log(`Successfully killed instance ${instanceId}`);
    } catch (error) {
      console.error(`Failed to kill instance ${instanceId}:`, error);
      throw error;
    }
  }

  async getInstanceStatus(instanceId: string): Promise<any> {
    await this.ensureAuthenticated();
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
    await this.ensureAuthenticated();
    return this.callAPI('Core/GetSystemInfo');
  }

  async getAPISpec(): Promise<any> {
    await this.ensureAuthenticated();
    return this.callAPI('Core/GetAPISpec');
  }

  async getModuleInfo(): Promise<any> {
    await this.ensureAuthenticated();
    return this.callAPI('Core/GetModuleInfo');
  }
}

export const ampService = new AMPService();