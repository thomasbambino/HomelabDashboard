import { ChatMessage, ChatRoom, User } from "@shared/schema";

interface ChatEvents {
  message: (message: ChatMessage) => void;
  typing: (data: { userId: number; roomId: number }) => void;
  read: (data: { userId: number; roomId: number; timestamp: Date }) => void;
  userStatus: (data: { userId: number; isOnline: boolean; timestamp: Date }) => void;
  error: (error: Error) => void;
  connected: () => void;
  disconnected: () => void;
}

type EventCallback = (data: any) => void;

class ChatClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number = 1000;
  private events: Map<keyof ChatEvents, Set<EventCallback>> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.socket.onclose = () => {
        this.emit('disconnected');
        this.handleReconnect();
      };

      this.socket.onerror = (error) => {
        this.emit('error', new Error('WebSocket error'));
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectTimeout * this.reconnectAttempts);
    }
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'message':
        this.emit('message', message.data);
        break;
      case 'typing':
        this.emit('typing', message.data);
        break;
      case 'read':
        this.emit('read', message.data);
        break;
      case 'user_status':
        this.emit('userStatus', message.data);
        break;
      case 'error':
        this.emit('error', new Error(message.data.message));
        break;
    }
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

  public sendMessage(roomId: number, content: string, type: 'text' | 'image' | 'file' = 'text', replyTo?: number) {
    this.send({
      type: 'send_message',
      data: { roomId, content, type, replyTo }
    });
  }

  public sendTypingIndicator(roomId: number) {
    this.send({
      type: 'typing',
      data: { roomId }
    });
  }

  public sendReadReceipt(roomId: number) {
    this.send({
      type: 'read',
      data: { roomId }
    });
  }

  private send(message: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  public close() {
    this.socket?.close();
  }
}

// Create a singleton instance
export const chatClient = new ChatClient();
