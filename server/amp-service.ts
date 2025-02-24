import axios from 'axios';
import https from 'https';

interface AMPLoginResponse {
  sessionId: string;
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

export class AMPService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private sessionId: string | null = null;

  constructor() {
    // Remove trailing slash if present
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

    // Configure axios to ignore SSL certificate issues if needed
    axios.defaults.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
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

      const response = await axios.post<AMPLoginResponse>(`${this.baseUrl}/API/Core/Login`, loginData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'AMPDashboard/1.0',
          'X-AMP-Version': '2.6.0.6'
        }
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', response.headers);
      console.log('Login response data:', response.data);

      if (!response.data?.sessionId) {
        console.error('Login response data:', response.data);
        throw new Error('No session ID received from AMP login');
      }

      console.log('Successfully logged in to AMP');
      this.sessionId = response.data.sessionId;
      return this.sessionId;
    } catch (error) {
      console.error('AMP login failed:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response:', error.response?.data);
        console.error('Request URL:', error.config?.url);
        console.error('Request method:', error.config?.method);
        console.error('Request headers:', error.config?.headers);
      }
      throw new Error('Failed to authenticate with AMP');
    }
  }

  private async ensureAuthenticated(): Promise<string> {
    if (!this.sessionId) {
      return this.login();
    }
    return this.sessionId;
  }

  private getHeaders(sessionId: string) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': `AMPSessionID=${sessionId}`,
      'User-Agent': 'AMPDashboard/1.0',
      'X-AMP-Version': '2.6.0.6'
    };
  }

  async getInstances(): Promise<AMPInstance[]> {
    const sessionId = await this.ensureAuthenticated();
    try {
      console.log('Fetching instances from AMP');
      const response = await axios.get<{ result: AMPInstance[] }>(
        `${this.baseUrl}/API/ADSModule/GetInstances`,
        { headers: this.getHeaders(sessionId) }
      );

      // Ensure we return an array
      const instances = response.data.result || [];
      console.log('AMP Instances fetched:', instances);
      return instances;
    } catch (error) {
      console.error('Failed to fetch AMP instances:', error);
      if (axios.isAxiosError(error)) {
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
      throw new Error('Failed to fetch game server status');
    }
  }
}

export const ampService = new AMPService();