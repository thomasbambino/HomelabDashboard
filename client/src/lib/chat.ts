import { ChatMessage, ChatRoom, User } from "@shared/schema";

interface ChatEvents {
  message: (message: ChatMessage) => void;
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
  private userId: number | null = null;

  constructor() {
    // Delay connection until setUserId is called
  }

  public setUserId(userId: number) {
    console.log('Setting user ID:', userId);
    this.userId = userId;
    this.connect();
  }

  private connect() {
    if (!this.userId) {
      console.error('No userId set, cannot connect');
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat?userId=${this.userId}`;
    console.log('Connecting to WebSocket:', wsUrl);

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
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
        console.log('Received message:', message);

        if (message.type === 'message') {
          this.emit('message', message.data);
        } else if (message.type === 'error') {
          this.emit('error', new Error(message.data.message));
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectTimeout * this.reconnectAttempts;
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
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

  public sendMessage(roomId: number, content: string) {
    console.log('Sending message:', { roomId, content });

    // Send via HTTP POST
    fetch(`/api/chat/messages/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      console.log('Message sent successfully:', data);
    })
    .catch(error => {
      console.error('Error sending message:', error);
      this.emit('error', error);
    });
  }

  public close() {
    if (this.socket) {
      console.log('Closing WebSocket connection');
      this.socket.close();
      this.socket = null;
    }
  }
}

export const chatClient = new ChatClient();