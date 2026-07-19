import { useState, useCallback, useEffect } from 'react';
import { apiFetch, apiJson } from '@/services/apiClient';
import { debugLog } from '@/utils/logger';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: string;
}

type RawNotification = {
  id: string;
  type: string;
  title?: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: string;
  titleDe?: string;
  titleEn?: string;
  bodyDe?: string;
  bodyEn?: string;
  data?: Record<string, unknown>;
};

const getNotificationReferenceId = (raw: RawNotification): string | undefined => {
  if (typeof raw.referenceId === 'string' && raw.referenceId) {
    return raw.referenceId;
  }

  const data = raw.data;
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const candidates = [data.referenceId, data.bookingId, data.conversationId, data.reviewId];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) {
      return candidate;
    }
  }

  return undefined;
};

const normalizeNotification = (raw: RawNotification): Notification => ({
  id: raw.id,
  type: raw.type,
  title: raw.titleDe || raw.title || raw.titleEn || '',
  body: raw.bodyDe || raw.body || raw.bodyEn || '',
  isRead: raw.isRead,
  createdAt: raw.createdAt,
  referenceId: getNotificationReferenceId(raw),
});

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
      const notificationsArray = Array.isArray(notificationList)
        ? notificationList.map((item: RawNotification) => normalizeNotification(item))
        : [];
      
      if (page === 1) {
        setNotifications(notificationsArray);
      } else {
        setNotifications(prev => [...prev, ...notificationsArray]);
      }
      
      // Update unread count
      const unread = notificationsArray.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(prev => page === 1 ? unread : prev + unread);
    } catch (err) {
      debugLog('Error fetching notifications:', err);
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
      debugLog('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiFetch('/notifications/read-all', { auth: true, method: 'PATCH' });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      debugLog('Error marking all notifications as read:', err);
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
