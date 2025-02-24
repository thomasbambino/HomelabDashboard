import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { storage } from './storage';
import { ChatMessage, ChatRoom, User } from '@shared/schema';

export class ChatServer {
  private io: SocketIOServer;

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      path: '/socket.io',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketServer();
    console.log('Chat server initialized with Socket.IO');
  }

  private setupSocketServer() {
    this.io.on('connection', async (socket) => {
      console.log('New Socket.IO connection');

      // Get the user from the session
      const user = socket.request.user as User;
      if (!user) {
        console.log('No authenticated user found, disconnecting');
        socket.disconnect();
        return;
      }

      console.log(`User ${user.id} connected`);

      // Join user to their rooms
      const rooms = await storage.listChatRooms(user.id);
      rooms.forEach(room => {
        socket.join(`room:${room.id}`);
      });

      // Update user status
      await storage.updateUser({ id: user.id, isOnline: true });
      this.io.emit('user:status', { userId: user.id, isOnline: true });

      // Handle chat messages
      socket.on('message:send', async (data: { roomId: number; content: string }) => {
        try {
          const message = await storage.createChatMessage({
            roomId: data.roomId,
            senderId: user.id,
            content: data.content,
            type: 'text',
            createdAt: new Date(),
            updatedAt: new Date(),
            isEdited: false,
          });

          const messageWithSender = {
            ...message,
            sender: await storage.getUser(user.id),
          };

          this.io.to(`room:${data.roomId}`).emit('message:new', messageWithSender);
        } catch (error) {
          console.error('Error handling message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log(`User ${user.id} disconnected`);
        await storage.updateUser({ 
          id: user.id, 
          isOnline: false,
          lastSeen: new Date()
        });
        this.io.emit('user:status', { 
          userId: user.id, 
          isOnline: false,
          timestamp: new Date()
        });
      });
    });
  }

  public close() {
    this.io.close();
  }
}