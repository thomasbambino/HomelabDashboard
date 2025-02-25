import axios, { AxiosError } from 'axios';
import https from 'https';

interface AMPResponse<T> {
  result: T;
  success?: boolean;
  resultReason?: string;
}

interface AMPModuleInfo {
  Modules: {
    [key: string]: {
      ModuleID: string;
      FriendlyName: string;
      Description: string;
      Version: string;
      Author: string;
    };
  };
  AvailableModules: string[];
}

interface AMPLoginResponse {
  result: number;
  resultReason: string;
  success: boolean;
  permissions: string[];
  sessionID: string;
  rememberMeToken: string;
  userInfo: {
    ID: string;
    Username: string;
    EmailAddress: string | null;
    IsTwoFactorEnabled: boolean;
    Disabled: boolean;
    LastLogin: string;
    GravatarHash: string;
    IsLDAPUser: boolean;
    AvatarBase64: string | null;
  };
}

interface AMPInstance {
  InstanceID: string;
  FriendlyName: string;
  Running: boolean;
  Status: string;
  ActiveUsers: number;
  MaxUsers: number;
}

interface AMPSystemInfo {
  Version: string;
  Branch: string;
  BuildDate: string;
  TargetFramework: string;
  OSDescription: string;
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

  private async callAPI(endpoint: string, parameters: any = {}, instanceId?: string) {
    console.log(`Calling API endpoint: ${endpoint} with instanceId: ${instanceId || 'none'}`);

    if (this.sessionId) {
      parameters.SESSIONID = this.sessionId;
    }

    const apiUrl = instanceId 
      ? `${this.baseUrl}/API/ADSModule/Servers/${instanceId}/API/${endpoint}`
      : `${this.baseUrl}/API/${endpoint}`;

    console.log('Full API URL:', apiUrl);

    try {
      const response = await axios.post(
        apiUrl,
        parameters,
        {
          headers: {
            'Accept': 'text/javascript',
            'Content-Type': 'application/json',
          }
        }
      );

      console.log(`API Response for ${endpoint}:`, response.data);

      if (response.data && typeof response.data === 'object') {
        if (response.data.Status === false) {
          throw new Error(response.data.Error || 'API call failed');
        }
        return response.data;
      }

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
      const response = await this.callAPI('ADSModule/GetInstances');

      if (response && Array.isArray(response) && response.length > 0) {
        const instances = response[0].AvailableInstances || [];
        console.log('Found instances:', instances);
        return instances;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch instances:', error);
      throw error;
    }
  }

  async startInstance(instanceId: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.callAPI('Core/Start', {}, instanceId);
  }

  async stopInstance(instanceId: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.callAPI('Core/Stop', {}, instanceId);
  }

  async restartInstance(instanceId: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.callAPI('Core/Restart', {}, instanceId);
  }

  async killInstance(instanceId: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.callAPI('Core/Kill', {}, instanceId);
  }

  async getInstanceStatus(instanceId: string): Promise<any> {
    await this.ensureAuthenticated();
    return this.callAPI('Core/GetStatus', {}, instanceId);
  }

  async getMetrics(instanceId: string): Promise<{
    TPS: string;
    Users: [string, string];
    CPU: string;
    Memory: [string, string];
    Uptime: string;
  }> {
    await this.ensureAuthenticated();
    const result = await this.callAPI('Core/GetStatus', {}, instanceId);

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

  async getModuleInfo(): Promise<AMPModuleInfo> {
    await this.ensureAuthenticated();
    return this.callAPI('Core/GetModuleInfo');
  }
}

export const ampService = new AMPService();