import { io, Socket } from 'socket.io-client';
import { ChatMessage, User } from "@shared/schema";

interface ChatEvents {
  message: (message: ChatMessage & { sender: User }) => void;
  error: (error: Error) => void;
  connected: () => void;
  disconnected: () => void;
  userStatus: (data: { userId: number; isOnline: boolean; timestamp?: Date }) => void;
}

type EventCallback = (data: any) => void;

class ChatClient {
  private socket: Socket | null = null;
  private events: Map<keyof ChatEvents, Set<EventCallback>> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    console.log('Connecting to Socket.IO server');

    this.socket = io({
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      this.emit('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.emit('error', error);
    });

    this.socket.on('message:new', (message) => {
      console.log('Received new message:', message);
      this.emit('message', message);
    });

    this.socket.on('user:status', (data) => {
      console.log('User status update:', data);
      this.emit('userStatus', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
      this.emit('error', new Error(error.message));
    });
  }

  public on<T extends keyof ChatEvents>(event: T, callback: ChatEvents[T]) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(callback as EventCallback);
  }

  public off<T extends keyof ChatEvents>(event: T, callback: ChatEvents[T]) {
    this.events.get(event)?.delete(callback as EventCallback);
  }

  private emit(event: keyof ChatEvents, data?: any) {
    this.events.get(event)?.forEach(callback => callback(data));
  }

  public sendMessage(roomId: number, content: string) {
    console.log('Sending message:', { roomId, content });

    if (!this.socket?.connected) {
      console.warn('Socket not connected, message not sent');
      return;
    }

    this.socket.emit('message:send', { roomId, content });
  }

  public close() {
    if (this.socket) {
      console.log('Closing Socket.IO connection');
      this.socket.close();
      this.socket = null;
    }
  }
}

export const chatClient = new ChatClient();