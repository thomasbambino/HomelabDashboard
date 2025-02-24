import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { ChatMessage, ChatRoom, User } from '@shared/schema';

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
      // Extract user ID from the session (you'll need to implement this)
      const userId = await this.getUserIdFromSession(req);
      if (!userId) {
        ws.close(1008, 'Unauthorized');
        return;
      }

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
    });
  }

  private async handleMessage(ws: ChatClient, message: any) {
    if (!ws.userId) return;

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
    storage.getChatRoomMembers(roomId).then(members => {
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
    // Extract user ID from session
    const sessionId = req.url.split('?')[1]?.split('=')[1];
    if (!sessionId) return null;

    return new Promise((resolve) => {
      storage.sessionStore.get(sessionId, (err: any, session: any) => {
        if (err || !session?.passport?.user) {
          resolve(null);
          return;
        }
        resolve(session.passport.user);
      });
    });
  }

  public close() {
    clearInterval(this.pingInterval);
    this.wss.close();
  }
}