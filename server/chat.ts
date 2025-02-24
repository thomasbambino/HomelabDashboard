import { StreamChat } from 'stream-chat';
import { storage } from './storage';
import { User } from '@shared/schema';
import { Server } from 'http';
import WebSocket from 'ws';

export class ChatServer {
  private streamClient: StreamChat | null = null;
  private wsServer: WebSocket.Server | null = null;
  private readonly hasStreamChat: boolean;

  constructor() {
    this.hasStreamChat = Boolean(process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET);

    if (this.hasStreamChat) {
      this.streamClient = StreamChat.getInstance(
        process.env.STREAM_API_KEY!,
        process.env.STREAM_API_SECRET!
      );
      console.log('Stream Chat server initialized');
    } else {
      console.log('Stream Chat credentials not found, chat features will be limited');
    }
  }

  initialize(httpServer: Server) {
    // Initialize WebSocket server
    this.wsServer = new WebSocket.Server({ server: httpServer });

    this.wsServer.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established');

      ws.on('message', (message: WebSocket.RawData) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received message:', data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('WebSocket server initialized');
  }

  broadcastToRoom(roomId: number, message: unknown) {
    if (!this.wsServer) {
      console.warn('WebSocket server not initialized');
      return;
    }

    const messageStr = JSON.stringify(message);
    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  async connectUser(user: User) {
    if (!this.hasStreamChat || !this.streamClient) {
      console.warn('Stream Chat not available');
      return { token: null };
    }

    try {
      console.log('Generating token for user:', {
        userId: user.id,
        username: user.username,
        role: user.role,
        userIdType: typeof user.id
      });

      const streamRole = user.role === 'admin' ? 'admin' : 'user';
      const userIdStr = user.id.toString();

      try {
        await this.streamClient.disconnectUser(userIdStr);
        console.log('Disconnected existing user connection');
      } catch (error) {
        console.log('No existing connection to disconnect');
      }

      const token = this.streamClient.createToken(userIdStr);
      console.log('Generated Stream Chat token:', token);

      await this.streamClient.upsertUser({
        id: userIdStr,
        name: user.username,
        role: streamRole,
      });

      await this.ensurePublicChannel(userIdStr);
      console.log('User upserted to Stream Chat');

      return { token };
    } catch (error) {
      console.error('Error connecting user to Stream Chat:', error);
      throw error;
    }
  }

  private async ensurePublicChannel(userId: string) {
    if (!this.hasStreamChat || !this.streamClient) {
      return;
    }

    try {
      const channels = await this.streamClient.queryChannels(
        { type: 'messaging', id: 'public' },
        {},
        { limit: 1 }
      );

      let publicChannel;
      if (channels.length === 0) {
        publicChannel = this.streamClient.channel('messaging', 'public', {
          name: 'Public Chat',
          members: [userId],
          created_by: { id: userId },
        });
        await publicChannel.create();
        console.log('Created new public channel');
      } else {
        publicChannel = channels[0];
        await publicChannel.addMembers([userId]);
        console.log('Added user to existing public channel');
      }
    } catch (error) {
      console.error('Error ensuring public channel:', error);
      throw error;
    }
  }

  async createChannel(channelType: 'messaging' | 'team', channelId: string, name: string, members: string[]) {
    if (!this.hasStreamChat || !this.streamClient) {
      throw new Error('Stream Chat not available');
    }

    try {
      console.log('Creating channel:', { channelType, channelId, name, members });
      const channel = this.streamClient.channel(channelType, channelId, {
        name,
        members,
      });

      await channel.create();
      return channel;
    } catch (error) {
      console.error('Error creating Stream Chat channel:', error);
      throw error;
    }
  }

  async deleteChannel(channelType: string, channelId: string) {
    if (!this.hasStreamChat || !this.streamClient) {
      throw new Error('Stream Chat not available');
    }

    try {
      const channel = this.streamClient.channel(channelType, channelId);
      await channel.delete();
    } catch (error) {
      console.error('Error deleting Stream Chat channel:', error);
      throw error;
    }
  }

  public close() {
    if (this.wsServer) {
      this.wsServer.close();
    }
  }
}