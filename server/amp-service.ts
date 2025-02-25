import axios, { AxiosError } from 'axios';
import https from 'https';
import axiosRetry from 'axios-retry';

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
  Initialized: boolean;
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
  private retryCount = 3;
  private retryDelay = 1000;
  private apiVersions = ['2.6.0.6', '2.6.0.5', '2.6.0.4']; // Supported API versions


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

  private async callAPI<T>(endpoint: string, parameters: any = {}): Promise<T> {
    console.log(`Calling API endpoint: ${endpoint} with parameters:`, parameters);

    if (this.sessionId) {
      parameters.SESSIONID = this.sessionId;
    }

    try {
      const response = await axios.post<AMPResponse<T>>(
        `${this.baseUrl}/API/${endpoint}`,
        parameters,
        {
          headers: {
            'Accept': 'text/javascript',
            'Content-Type': 'application/json',
            'User-Agent': 'AMPDashboard/1.0'
          }
        }
      );

      console.log(`API Response for ${endpoint}:`, response.data);

      if (response.data.success === false) {
        throw new Error(response.data.resultReason || 'API call failed');
      }

      return response.data.result;
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

      const response = await this.callAPI<{sessionID: string}>('Core/Login', loginData);
      this.sessionId = response.sessionID;
      this.sessionExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      console.log('Login successful, session established');
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
      const response = await this.callAPI<{AvailableInstances: AMPInstance[]}>('ADSModule/GetInstances');
      console.log('Found instances:', response.AvailableInstances);
      return response.AvailableInstances || [];
    } catch (error) {
      console.error('Failed to fetch instances:', error);
      throw error;
    }
  }

  async startInstance(instanceId: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.callAPI(`ADSModule/StartInstance`, { InstanceID: instanceId });
  }

  async stopInstance(instanceId: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.callAPI(`ADSModule/StopInstance`, { InstanceID: instanceId });
  }

  async getInstanceStatus(instanceId: string): Promise<AMPInstance> {
    await this.ensureAuthenticated();
    return this.callAPI(`ADSModule/GetInstance`, { InstanceID: instanceId });
  }

  async getSystemInfo(): Promise<AMPSystemInfo> {
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