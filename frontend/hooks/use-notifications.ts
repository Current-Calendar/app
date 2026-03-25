import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/services/api-client';
import { useAuth } from './use-auth';

export type NotificationType = 
  | 'NEW_FOLLOWER' 
  | 'CALENDAR_FOLLOW' 
  | 'EVENT_SAVED' 
  | 'EVENT_LIKED' 
  | 'CALENDAR_INVITE'
  | 'EVENT_INVITE' 
  | 'EVENT_COMMENT';
  

export type Notification = {
  id: number;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
  related_calendar?: number | null;
  related_calendar_name?: string | null;
  related_event?: number | null;
  related_event_title?: string | null;
  sender?: number | null;
  sender_username?: string | null;
  sender_photo?: string | null;
};

interface UseNotificationsOptions {
  autoFetch?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoFetch = true } = options;
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Notification[]>('/notifications/');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (autoFetch && isAuthenticated) {
      void fetchNotifications();
    }
  }, [autoFetch, isAuthenticated, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      await apiClient.patch('/notifications/read-all/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
      setError(err as Error);
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id: number) => {
    if (!isAuthenticated) return;

    try {
      await apiClient.patch(`/notifications/${id}/read/`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err as Error);
    }
  }, [isAuthenticated]);

  const handleInvite = useCallback(async (id: number, action: 'accept' | 'decline') => {
    if (!isAuthenticated) return;
    try {
      const inviteStatus = action === 'accept' ? 'ACCEPT' : 'DECLINE';
      await apiClient.post(`/notifications/${id}/`, { status: inviteStatus });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error handling invite:', err);
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAllAsRead,
    markAsRead,
    handleInvite,
    refetch: fetchNotifications,
  };
}