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
  }

  async connectUser(user: User) {
    try {
      const userId = user.id.toString();

      console.log('Connecting user to Stream Chat:', {
        userId,
        username: user.username
      });

      // Create a Stream Chat token for the user
      const token = this.streamClient.createToken(userId);

      // Upsert the user to Stream Chat
      await this.streamClient.upsertUsers({
        [userId]: {
          id: userId,
          name: user.username,
          role: 'user',
        }
      });

      console.log('User successfully connected to Stream Chat');
      return { token };
    } catch (error) {
      console.error('Error connecting user to Stream Chat:', error);
      throw error;
    }
  }

  async createChannel(channelType: string, channelId: string, name: string, members: string[]) {
    try {
      console.log('Creating Stream Chat channel:', {
        type: channelType,
        id: channelId,
        name,
        members
      });

      const channel = this.streamClient.channel(channelType, channelId, {
        name,
        members,
        created_by_id: members[0]
      });

      await channel.create();
      console.log('Stream Chat channel created successfully');
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