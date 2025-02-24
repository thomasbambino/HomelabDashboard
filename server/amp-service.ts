import axios from 'axios';

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
    this.baseUrl = process.env.AMP_API_URL || '';
    this.username = process.env.AMP_API_USERNAME || '';
    this.password = process.env.AMP_API_PASSWORD || '';
  }

  private async login(): Promise<string> {
    try {
      const response = await axios.post<AMPLoginResponse>(`${this.baseUrl}/API/Core/Login`, {
        username: this.username,
        password: this.password,
        token: '',
        rememberMe: false,
      });

      this.sessionId = response.data.sessionId;
      return this.sessionId;
    } catch (error) {
      console.error('AMP login failed:', error);
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
      'Cookie': `AMPSessionID=${sessionId}`,
    };
  }

  async getInstances(): Promise<AMPInstance[]> {
    const sessionId = await this.ensureAuthenticated();
    try {
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