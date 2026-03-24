import { API_CONFIG } from '@/constants/api';
import apiClient from '@/services/api-client';
import { ChatMessage } from '@/types/chat';

export async function fetchChatHistory(eventId: string | number): Promise<ChatMessage[]> {
  return apiClient.get<ChatMessage[]>(`/events/${eventId}/chat/`);
}

type MessageHandler = (msg: ChatMessage) => void;
type StatusHandler = (connected: boolean) => void;

export class ChatSocket {
  private ws: WebSocket | null = null;
  private eventId: string | number;
  private onMessage: MessageHandler;
  private onStatusChange: StatusHandler;
  private shouldReconnect = true;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    eventId: string | number,
    onMessage: MessageHandler,
    onStatusChange: StatusHandler
  ) {
    this.eventId = eventId;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
  }

  connect() {
    const url = API_CONFIG.endpoints.chatWs(this.eventId);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.onStatusChange(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data: ChatMessage = JSON.parse(event.data);
        this.onMessage(data);
      } catch {
        console.warn('[ChatSocket] Invalid message received:', event.data);
      }
    };

    this.ws.onclose = () => {
      this.onStatusChange(false);
      if (this.shouldReconnect) {
        this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = (error) => {
      console.warn('[ChatSocket] WebSocket error:', error);
    };
  }

  send(userId: number, text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message: text, user_id: userId }));
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
