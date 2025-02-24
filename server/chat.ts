import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { ChatMessage, ChatRoom, User } from '@shared/schema';
import { parse } from 'cookie';

interface ChatClient extends WebSocket {
  userId?: number;
  isAlive: boolean;
}

interface BroadcastMessage {
  type: 'message' | 'typing' | 'read' | 'user_status';
  roomId?: number;
  data: any;
}

export class ChatServer {
  private wss: WebSocketServer;
  private clients: Map<number, Set<ChatClient>> = new Map();
  private pingInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/chat' });
    this.setupWebSocketServer();

    // Set up ping interval to keep connections alive and detect stale ones
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((client: ChatClient) => {
        if (!client.isAlive) {
          client.terminate();
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (ws: ChatClient, req) => {
      console.log('New WebSocket connection attempt');

      // Extract user ID from the session
      const userId = await this.getUserIdFromSession(req);
      if (!userId) {
        console.log('WebSocket connection rejected: Unauthorized');
        ws.close(1008, 'Unauthorized');
        return;
      }

      console.log(`WebSocket connection authenticated for user ${userId}`);
      ws.userId = userId;
      ws.isAlive = true;

      // Add client to the clients map
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)?.add(ws);

      // Update user's online status
      await storage.updateUser({ id: userId, isOnline: true });
      this.broadcastUserStatus(userId, true);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data);
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            data: { message: 'Invalid message format' } 
          }));
        }
      });

      ws.on('close', async () => {
        console.log(`WebSocket connection closed for user ${userId}`);
        // Remove client from the clients map
        this.clients.get(userId)?.delete(ws);
        if (this.clients.get(userId)?.size === 0) {
          this.clients.delete(userId);
          // Update user's online status
          await storage.updateUser({ 
            id: userId, 
            isOnline: false,
            lastSeen: new Date()
          });
          this.broadcastUserStatus(userId, false);
        }
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
      });
    });
  }

  private async handleMessage(ws: ChatClient, message: any) {
    if (!ws.userId) return;

    console.log(`Handling message of type ${message.type} from user ${ws.userId}`);

    switch (message.type) {
      case 'send_message':
        await this.handleChatMessage(ws.userId, message.data);
        break;
      case 'typing':
        await this.handleTypingIndicator(ws.userId, message.data);
        break;
      case 'read':
        await this.handleReadReceipt(ws.userId, message.data);
        break;
      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          data: { message: 'Unknown message type' } 
        }));
    }
  }

  private async handleChatMessage(userId: number, data: { 
    roomId: number, 
    content: string,
    type?: 'text' | 'image' | 'file',
    replyTo?: number 
  }) {
    // Check if user is a member of the room
    const member = await storage.getChatMember(data.roomId, userId);
    if (!member) return;

    // Create and save the message
    const message = await storage.createChatMessage({
      roomId: data.roomId,
      senderId: userId,
      content: data.content,
      type: data.type || 'text',
      replyTo: data.replyTo,
    });

    // Update room's last message timestamp
    await storage.updateChatRoom({
      id: data.roomId,
      lastMessageAt: new Date(),
    });

    // Broadcast to all room members
    this.broadcastToRoom(data.roomId, {
      type: 'message',
      roomId: data.roomId,
      data: message,
    });
  }

  private async handleTypingIndicator(userId: number, data: { roomId: number }) {
    this.broadcastToRoom(data.roomId, {
      type: 'typing',
      roomId: data.roomId,
      data: { userId },
    }, userId); // Exclude sender
  }

  private async handleReadReceipt(userId: number, data: { roomId: number }) {
    await storage.updateChatMember({
      roomId: data.roomId,
      userId: userId,
      lastRead: new Date(),
    });

    this.broadcastToRoom(data.roomId, {
      type: 'read',
      roomId: data.roomId,
      data: { userId, timestamp: new Date() },
    });
  }

  private broadcastToRoom(roomId: number, message: BroadcastMessage, excludeUserId?: number) {
    storage.getChatMembers(roomId).then(members => {
      members.forEach(member => {
        if (excludeUserId && member.userId === excludeUserId) return;
        this.sendToUser(member.userId, message);
      });
    });
  }

  private broadcastUserStatus(userId: number, isOnline: boolean) {
    const message: BroadcastMessage = {
      type: 'user_status',
      data: { userId, isOnline, timestamp: new Date() },
    };

    // Broadcast to all connected clients
    this.wss.clients.forEach((client: ChatClient) => {
      if (client.readyState === WebSocket.OPEN && client.userId !== userId) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private sendToUser(userId: number, message: BroadcastMessage) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const messageStr = JSON.stringify(message);
    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  private async getUserIdFromSession(req: any): Promise<number | null> {
    try {
      // Extract session ID from cookie
      const cookies = parse(req.headers.cookie || '');
      const sessionId = cookies['connect.sid']?.split('.')[0].slice(2);

      if (!sessionId) {
        console.log('No session ID found in cookies');
        return null;
      }

      return new Promise((resolve) => {
        storage.sessionStore.get(sessionId, (err: any, session: any) => {
          if (err || !session?.passport?.user) {
            console.log('Session store error or no user in session:', err);
            resolve(null);
            return;
          }
          console.log('Successfully retrieved user ID from session:', session.passport.user);
          resolve(session.passport.user);
        });
      });
    } catch (error) {
      console.error('Error extracting user ID from session:', error);
      return null;
    }
  }

  public close() {
    clearInterval(this.pingInterval);
    this.wss.close();
  }
}