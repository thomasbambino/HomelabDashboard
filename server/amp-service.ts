import axios, { AxiosError } from 'axios';
import https from 'https';
import axiosRetry from 'axios-retry';

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

interface AMPAPIMethod {
  Name: string;
  Description: string;
  ReturnType: string;
  Parameters: {
    Name: string;
    Type: string;
  }[];
}

interface AMPAPISpec {
  [key: string]: AMPAPIMethod;
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
  private currentApiVersion: string;

  constructor() {
    this.baseUrl = (process.env.AMP_API_URL || '').replace(/\/$/, '');
    this.username = process.env.AMP_API_USERNAME || '';
    this.password = process.env.AMP_API_PASSWORD || '';
    this.currentApiVersion = this.apiVersions[0];

    if (!this.baseUrl || !this.username || !this.password) {
      console.error('AMP configuration missing:', {
        hasUrl: !!this.baseUrl,
        hasUsername: !!this.username,
        hasPassword: !!this.password
      });
    }

    // Configure axios with retry logic
    axiosRetry(axios, {
      retries: this.retryCount,
      retryDelay: (retryCount) => retryCount * this.retryDelay,
      retryCondition: (error: AxiosError) => {
        // Retry on network errors or 5xx server errors
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response?.status ? error.response.status >= 500 : false);
      }
    });

    // Configure axios to ignore SSL certificate issues if needed
    axios.defaults.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  private isSessionValid(): boolean {
    if (!this.sessionId || !this.sessionExpiry) return false;
    // Check if session is still valid (with 5 minute buffer)
    return new Date() < new Date(this.sessionExpiry.getTime() - 5 * 60 * 1000);
  }

  private async login(): Promise<string> {
    try {
      console.log('Attempting to login to AMP at:', this.baseUrl);

      const loginData = {
        username: this.username,
        password: this.password,
        token: '',
        rememberMe: false,
      };
      console.log('Login request data:', { ...loginData, password: '[REDACTED]' });
      console.log('Login endpoint:', `${this.baseUrl}/API/Core/Login`);

      // Try each API version until one works
      for (const version of this.apiVersions) {
        try {
          console.log(`Attempting login with API version: ${version}`);
          const response = await axios.post<AMPLoginResponse>(`${this.baseUrl}/API/Core/Login`, loginData, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'AMPDashboard/1.0',
              'X-AMP-Version': version
            },
            validateStatus: function (status) {
              return status < 500; // Accept any status code to handle authentication errors
            }
          });

          console.log('Login response status:', response.status);
          console.log('Login response headers:', response.headers);

          if (response.status === 401 || response.status === 403) {
            console.log(`Authentication failed with API version ${version}:`, response.data);
            continue;
          }

          if (response.data?.sessionID) {
            this.currentApiVersion = version;
            this.sessionId = response.data.sessionID;
            // Set session expiry to 1 hour from now
            this.sessionExpiry = new Date(Date.now() + 60 * 60 * 1000);
            console.log('Successfully logged in to AMP using API version:', version);
            return this.sessionId;
          } else {
            console.log(`No session ID in response for version ${version}:`, response.data);
          }
        } catch (error) {
          console.log(`Login attempt failed with API version ${version}`);
          if (axios.isAxiosError(error)) {
            console.error('Error details:', {
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              headers: error.response?.headers
            });
          } else {
            console.error('Non-axios error:', error);
          }
          continue;
        }
      }

      throw new Error('Failed to authenticate with any supported API version');
    } catch (error) {
      console.error('AMP login failed:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response:', error.response?.data);
        console.error('Request URL:', error.config?.url);
        console.error('Request method:', error.config?.method);
        console.error('Request headers:', error.config?.headers);

        // Provide more specific error messages based on the response
        if (error.response?.status === 401) {
          throw new Error('Invalid username or password');
        } else if (error.response?.status === 403) {
          throw new Error('Account lacks necessary permissions');
        } else if (!error.response) {
          throw new Error(`Could not connect to AMP server at ${this.baseUrl}`);
        }
      }
      throw new Error('Failed to authenticate with AMP');
    }
  }

  private async ensureAuthenticated(): Promise<string> {
    if (!this.isSessionValid()) {
      return this.login();
    }
    return this.sessionId!;
  }

  private getHeaders(sessionId: string) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': `AMPSessionID=${sessionId}`,
      'User-Agent': 'AMPDashboard/1.0',
      'X-AMP-Version': this.currentApiVersion
    };
  }

  async getInstances(): Promise<AMPInstance[]> {
    const sessionId = await this.ensureAuthenticated();
    try {
      console.log('Fetching instances from AMP');
      console.log('Using API version:', this.currentApiVersion);
      console.log('Request URL:', `${this.baseUrl}/API/ADSModule/GetInstances`);

      const response = await axios.get<{ result: AMPInstance[] }>(
        `${this.baseUrl}/API/ADSModule/GetInstances`,
        { 
          headers: this.getHeaders(sessionId),
          validateStatus: function (status) {
            return status < 500; // Accept any status less than 500 to capture error responses
          }
        }
      );

      console.log('Raw API Response:', {
        status: response.status,
        headers: response.headers,
        data: response.data
      });

      // Ensure we return an array
      const instances = response.data.result || [];
      if (instances.length === 0) {
        console.log('No instances found. This could mean either no instances exist or insufficient permissions.');
      } else {
        console.log(`Found ${instances.length} AMP instances`);
      }

      return instances;
    } catch (error) {
      console.error('Failed to fetch AMP instances:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('Authentication failed. Clearing session and retrying...');
          // Session might be invalid, clear it and retry once
          this.sessionId = null;
          this.sessionExpiry = null;
          return this.getInstances();
        }
        console.error('Response:', error.response?.data);
        console.error('Request URL:', error.config?.url);
        console.error('Request method:', error.config?.method);
        console.error('Request headers:', error.config?.headers);
      }
      return []; // Return empty array on error instead of throwing
    }
  }

  async startInstance(instanceId: string): Promise<void> {
    const sessionId = await this.ensureAuthenticated();
    try {
      await axios.post(
        `${this.baseUrl}/API/ADSModule/StartInstance`,
        { InstanceID: instanceId },
        { headers: this.getHeaders(sessionId) }
      );
    } catch (error) {
      console.error('Failed to start instance:', error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        // Session might be invalid, clear it and retry once
        this.sessionId = null;
        this.sessionExpiry = null;
        return this.startInstance(instanceId);
      }
      throw new Error('Failed to start game server');
    }
  }

  async stopInstance(instanceId: string): Promise<void> {
    const sessionId = await this.ensureAuthenticated();
    try {
      await axios.post(
        `${this.baseUrl}/API/ADSModule/StopInstance`,
        { InstanceID: instanceId },
        { headers: this.getHeaders(sessionId) }
      );
    } catch (error) {
      console.error('Failed to stop instance:', error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        // Session might be invalid, clear it and retry once
        this.sessionId = null;
        this.sessionExpiry = null;
        return this.stopInstance(instanceId);
      }
      throw new Error('Failed to stop game server');
    }
  }

  async getInstanceStatus(instanceId: string): Promise<AMPInstance> {
    const sessionId = await this.ensureAuthenticated();
    try {
      const response = await axios.get<{ result: AMPInstance }>(
        `${this.baseUrl}/API/ADSModule/GetInstance?InstanceID=${instanceId}`,
        { headers: this.getHeaders(sessionId) }
      );
      return response.data.result;
    } catch (error) {
      console.error('Failed to get instance status:', error);
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        // Session might be invalid, clear it and retry once
        this.sessionId = null;
        this.sessionExpiry = null;
        return this.getInstanceStatus(instanceId);
      }
      throw new Error('Failed to fetch game server status');
    }
  }

  async getSystemInfo(): Promise<AMPSystemInfo> {
    const sessionId = await this.ensureAuthenticated();
    try {
      console.log('Fetching AMP system info');
      const response = await axios.get<{ result: AMPSystemInfo }>(
        `${this.baseUrl}/API/Core/GetSystemInfo`,
        { 
          headers: this.getHeaders(sessionId),
          validateStatus: function (status) {
            return status < 500;
          }
        }
      );

      console.log('System info response:', response.data);
      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch system info:', error);
      throw error;
    }
  }

  async getAPISpec(): Promise<AMPAPISpec> {
    const sessionId = await this.ensureAuthenticated();
    try {
      console.log('Fetching API specification');
      const response = await axios.get<{ result: AMPAPISpec }>(
        `${this.baseUrl}/API/Core/GetAPISpec`,
        { 
          headers: this.getHeaders(sessionId),
          validateStatus: function (status) {
            return status < 500;
          }
        }
      );

      const spec = response.data.result || {};
      console.log('Available API endpoints:', Object.values(spec).map(method => method.Name));
      console.log('Total available methods:', Object.keys(spec).length);

      // Check for specific instance-related methods
      const instanceMethods = Object.values(spec)
        .filter(method => method.Name.toLowerCase().includes('instance'))
        .map(method => method.Name);
      console.log('Instance-related methods:', instanceMethods);

      return spec;
    } catch (error) {
      console.error('Failed to fetch API spec:', error);
      throw error;
    }
  }

  async getModuleInfo(): Promise<AMPModuleInfo> {
    const sessionId = await this.ensureAuthenticated();
    try {
      console.log('Fetching module information');
      const response = await axios.get<{ result: AMPModuleInfo }>(
        `${this.baseUrl}/API/Core/GetModuleInfo`,
        { 
          headers: this.getHeaders(sessionId),
          validateStatus: function (status) {
            return status < 500;
          }
        }
      );

      console.log('Module info response:', response.data);
      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch module info:', error);
      throw error;
    }
  }
}

export const ampService = new AMPService();