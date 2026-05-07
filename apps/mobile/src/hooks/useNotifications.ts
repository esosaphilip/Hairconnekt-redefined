import { useState, useCallback, useEffect } from 'react';
import { apiFetch, apiJson } from '@/services/apiClient';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await apiJson<any>(`/notifications?page=${page}&limit=${limit}`, { auth: true });
      const notificationList = data.data || data || [];
      const notificationsArray = Array.isArray(notificationList) ? notificationList : [];
      
      if (page === 1) {
        setNotifications(notificationsArray);
      } else {
        setNotifications(prev => [...prev, ...notificationsArray]);
      }
      
      // Update unread count
      const unread = notificationsArray.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(prev => page === 1 ? unread : prev + unread);
    } catch (err) {
      console.log('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiFetch(`/notifications/${notificationId}/read`, { auth: true, method: 'PATCH' });

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.log('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiFetch('/notifications/read-all', { auth: true, method: 'PATCH' });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.log('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};
