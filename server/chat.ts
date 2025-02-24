import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { ChatMessage, ChatRoom, User } from '@shared/schema';

interface ChatClient extends WebSocket {
  userId?: number;
  isAlive: boolean;
}

export class ChatServer {
  private wss: WebSocketServer;
  private clients: Map<number, Set<ChatClient>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/chat',
      clientTracking: true
    });

    this.setupWebSocketServer();

    // Set up ping interval
    setInterval(() => {
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
      console.log('New WebSocket connection');

      // Get userId from query parameter
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const userId = parseInt(url.searchParams.get('userId') || '0');

      if (!userId) {
        console.log('No userId provided, closing connection');
        ws.close(1008, 'No userId provided');
        return;
      }

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.log('Invalid userId, closing connection');
        ws.close(1008, 'Invalid userId');
        return;
      }

      console.log(`WebSocket connection established for user ${userId}`);
      ws.userId = userId;
      ws.isAlive = true;

      // Add to clients map
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)?.add(ws);

      // Update user status
      await storage.updateUser({ id: userId, isOnline: true });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data);
          console.log('Received message:', message);

          const roomId = message.roomId;
          if (!roomId) {
            console.log('No roomId provided in message');
            return;
          }

          // Broadcast message to room
          this.broadcastToRoom(roomId, {
            type: message.type,
            roomId: roomId,
            data: message.data
          });

        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      ws.on('close', async () => {
        console.log(`WebSocket connection closed for user ${userId}`);
        this.clients.get(userId)?.delete(ws);
        if (this.clients.get(userId)?.size === 0) {
          this.clients.delete(userId);
          await storage.updateUser({ 
            id: userId, 
            isOnline: false,
            lastSeen: new Date()
          });
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  public broadcastToRoom(roomId: number, message: any) {
    storage.getChatMembers(roomId).then(members => {
      members.forEach(member => {
        this.sendToUser(member.userId, message);
      });
    });
  }

  private sendToUser(userId: number, message: any) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const messageStr = JSON.stringify(message);
    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  public close() {
    this.wss.close();
  }
}