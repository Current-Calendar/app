import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '@/types/chat';
import { ChatSocket, fetchChatHistory } from '@/services/chatService';
import { useAuth } from '@/hooks/use-auth';

export function useChat(eventId: string | number) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<ChatSocket | null>(null);

  // Load history once on mount
  useEffect(() => {
    let cancelled = false;

    fetchChatHistory(eventId)
      .then((history) => {
        if (!cancelled) setMessages(history);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Could not load chat history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // WebSocket connection
  useEffect(() => {
    const socket = new ChatSocket(
      eventId,
      (msg) => setMessages((prev) => [...prev, msg]),
      (status) => setConnected(status)
    );

    socket.connect();
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eventId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!user || !text.trim()) return;
      socketRef.current?.send(user.id, text.trim());
    },
    [user]
  );

  return { messages, connected, loading, error, sendMessage };
}
