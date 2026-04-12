import React, { createContext, useContext } from 'react';
import { useNotifications } from '@/hooks/use-notifications';

type NotificationsContextType = ReturnType<typeof useNotifications>;

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const value = useNotifications({ autoFetch: true });
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext must be used inside NotificationsProvider');
  return ctx;
}