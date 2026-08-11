import { EventEmitter } from './events';
import type { WebSocketEvent, ConnectionStatus } from '@/types/websocket';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private accessToken: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectIntervalMultiplier = 1.5;

  private messageEmitter = new EventEmitter<WebSocketEvent>();
  private connectionEmitter = new EventEmitter<ConnectionStatus>();

  constructor(baseUrl: string) {
    this.url = baseUrl.replace(/^http/, 'ws');
  }

  connect(accessToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.accessToken = accessToken;
        const wsUrl = `${this.url}/ws?token=${encodeURIComponent(accessToken)}`;
        
        this.ws = new WebSocket(wsUrl);
        this.connectionEmitter.emit('connecting');

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.connectionEmitter.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketEvent;
            this.messageEmitter.emit(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.connectionEmitter.emit('disconnected');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.handleDisconnect();
        };
      } catch (error) {
        this.connectionEmitter.emit('disconnected');
        reject(error);
      }
    });
  }

  private handleDisconnect() {
    this.connectionEmitter.emit('disconnected');

    // Auto-reconnect with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.accessToken) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(this.reconnectIntervalMultiplier, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );

      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connectionEmitter.emit('reconnecting');

      this.reconnectTimeout = setTimeout(() => {
        this.connect(this.accessToken!).catch((error) => {
          console.error('Reconnect failed:', error);
        });
      }, delay);
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.accessToken = null;
    this.reconnectAttempts = 0;
    this.connectionEmitter.emit('disconnected');
  }

  send(event: WebSocketEvent) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify(event));
  }

  onMessage(listener: (event: WebSocketEvent) => void) {
    return this.messageEmitter.on(listener);
  }

  onConnectionChange(listener: (status: ConnectionStatus) => void) {
    return this.connectionEmitter.on(listener);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}
