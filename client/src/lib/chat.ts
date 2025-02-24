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
      console.log('Attempting to connect to WebSocket:', wsUrl);

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        this.emit('disconnected');
        this.handleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', new Error('WebSocket connection error'));
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received WebSocket message:', message);
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
      const delay = this.reconnectTimeout * this.reconnectAttempts;
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('error', new Error('Unable to establish WebSocket connection'));
    }
  }

  private handleMessage(message: any) {
    console.log('Handling message type:', message.type);
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
        console.error('Server error:', message.data.message);
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
    console.log('Sending message:', { roomId, content, type, replyTo });
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
      const messageStr = JSON.stringify(message);
      console.log('Sending WebSocket message:', messageStr);
      this.socket.send(messageStr);
    } else {
      console.warn('WebSocket not ready, message not sent:', message);
    }
  }

  public close() {
    console.log('Closing WebSocket connection');
    this.socket?.close();
  }
}

// Create a singleton instance
export const chatClient = new ChatClient();