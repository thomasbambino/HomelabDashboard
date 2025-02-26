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
      console.log('Generating token for user:', {
        userId: user.id,
        username: user.username,
        role: user.role,
        userIdType: typeof user.id
      });

      // Map application roles to Stream Chat roles
      const streamRole = user.role === 'admin' ? 'admin' : 'user';

      // First, try to disconnect any existing connections
      try {
        await this.streamClient.disconnectUser(user.id.toString());
        console.log('Disconnected existing user connection');
      } catch (error) {
        // Ignore errors if user wasn't connected
        console.log('No existing connection to disconnect');
      }

      // Create a Stream Chat token for the user
      const token = this.streamClient.createToken(user.id.toString());
      console.log('Generated Stream Chat token:', token);

      // Upsert the user to Stream Chat
      await this.streamClient.upsertUser({
        id: user.id.toString(),
        name: user.username,
        role: streamRole,
      });
      console.log('User upserted to Stream Chat');

      // Ensure user is added to public channel
      await this.ensurePublicChannel(user.id.toString());

      return { token };
    } catch (error) {
      console.error('Error connecting user to Stream Chat:', error);
      throw error;
    }
  }

  private async ensurePublicChannel(userId: string) {
    try {
      // Try to find existing public channel
      const channels = await this.streamClient.queryChannels(
        { type: 'messaging', id: 'public' },
        {},
        { limit: 1 }
      );

      let publicChannel;

      if (channels.length === 0) {
        // Create public channel if it doesn't exist
        publicChannel = this.streamClient.channel('messaging', 'public', {
          name: 'Public Chat',
          members: [userId],
          created_by: { id: userId },
        });
        await publicChannel.create();
        console.log('Created new public channel');
      } else {
        publicChannel = channels[0];
        // Add user to existing public channel
        await publicChannel.addMembers([userId]);
        console.log('Added user to existing public channel');
      }
    } catch (error) {
      console.error('Error ensuring public channel:', error);
      throw error;
    }
  }

  async createChannel(channelType: 'messaging' | 'team', channelId: string, name: string, members: string[]) {
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