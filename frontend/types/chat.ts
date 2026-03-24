export interface ChatMessage {
  id: number;
  event: number;
  sender: number;
  sender_username: string;
  sender_photo?: string;
  text: string;
  timestamp: string;
}
