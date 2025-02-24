import { StreamChat } from 'stream-chat';
import { storage } from './storage';
import { User } from '@shared/schema';

export class ChatServer {
  private streamClient: StreamChat;

  constructor() {
    if (!process.env.STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      throw new Error('Stream Chat credentials not found');
    }

    this.streamClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY,
      process.env.STREAM_API_SECRET
    );
    console.log('Stream Chat server initialized');
    this.initializePublicChannel();
  }

  private async initializePublicChannel() {
    try {
      // Check if public channel exists
      const channels = await this.streamClient.queryChannels({ id: 'public' });

      if (channels.length === 0) {
        // Create public channel if it doesn't exist
        await this.streamClient.channel('team', 'public', {
          name: 'Public Chat',
          created_by: { id: 'system' },
        }).create();
        console.log('Public channel created');
      } else {
        console.log('Public channel already exists');
      }
    } catch (error) {
      console.error('Error initializing public channel:', error);
    }
  }

  async connectUser(user: User) {
    try {
      const userId = user.id.toString(); // Ensure ID is a string
      console.log('Generating token for user:', {
        userId,
        username: user.username
      });

      // Create a Stream Chat token for the user
      const token = this.streamClient.createToken(userId);
      console.log('Generated Stream Chat token:', token);

      // Upsert the user to Stream Chat
      await this.streamClient.upsertUser({
        id: userId,
        name: user.username,
        role: user.role,
      });

      console.log('User upserted to Stream Chat');
      return { token };
    } catch (error) {
      console.error('Error connecting user to Stream Chat:', error);
      throw error;
    }
  }

  async createChannel(channelType: 'messaging' | 'team', channelId: string, name: string, members: string[]) {
    try {
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
    try {
      const channel = this.streamClient.channel(channelType, channelId);
      await channel.delete();
    } catch (error) {
      console.error('Error deleting Stream Chat channel:', error);
      throw error;
    }
  }

  public close() {
    // No need to explicitly close Stream Chat client
  }
}