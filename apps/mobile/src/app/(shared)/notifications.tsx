import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { apiFetch, apiJson } from '@/services/apiClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSafeNotificationRoute } from '@/utils/safe-navigation';
import { debugLog } from '@/utils/logger';

interface Notification {
  id: string;
  type: string;
  titleDe: string;
  titleEn?: string | null;
  bodyDe: string;
  bodyEn?: string | null;
  data?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'booking' | 'message' | 'system'>('all');

  const BOOKING_TYPES = [
    'new_booking',
    'booking_confirmed',
    'booking_declined',
    'booking_cancelled_by_client',
    'booking_cancelled_by_provider',
    'booking_rescheduled',
    'booking_started',
    'booking_completed',
    'booking_reminder_24h',
    'booking_reminder_2h',
  ];
  const MESSAGE_TYPES = ['message_received'];
  const SYSTEM_TYPES = [
    'provider_approved',
    'provider_rejected',
    'review_received',
    'review_response',
    'new_favourite',
  ];

  useEffect(() => {
    loadNotifications(1, true);
  }, []);

  const loadNotifications = async (pageNum: number, refresh = false) => {
    try {
      if (refresh) setIsLoading(true);
      else setIsLoadingMore(true);

      const data: any = await apiJson(`/notifications?page=${pageNum}&limit=20`, { auth: true });

      const newItems = data.data || [];
      setNotifications(prev => (refresh ? newItems : [...prev, ...newItems]));
      setHasMore(data.meta?.hasNextPage || false);
      setPage(pageNum);
    } catch (error) {
      debugLog('Error loading notifications', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
      await apiFetch(`/notifications/${id}/read`, { auth: true, method: 'PATCH' });
    } catch (e) {
      debugLog('Error marking as read', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await apiFetch('/notifications/read-all', { auth: true, method: 'PATCH' });
    } catch (e) {
      debugLog('Error marking all as read', e);
    }
  };

  const handleNotificationPress = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }

    const safeRoute = getSafeNotificationRoute(notif.data?.screen);
    if (safeRoute) {
      router.push(safeRoute as any);
    }
  };

  const loadMore = () => {
    if (hasMore && !isLoadingMore) {
      loadNotifications(page + 1);
    }
  };

  const getRelativeTime = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === yesterday.toDateString()) return t('notificationsYesterday');

    const diffMs = Date.now() - d.getTime();
    if (diffMs > 0 && d.toDateString() === today.toDateString()) {
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return t('notificationsAgoMins').replace('{minutes}', String(diffMins));
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return t('notificationsAgoHours').replace('{hours}', String(diffHours));
    }

    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDateLabel = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return t('notificationsToday');
    if (d.toDateString() === yesterday.toDateString()) return t('notificationsYesterday');
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'booking') return BOOKING_TYPES.includes(n.type);
    if (activeFilter === 'message') return MESSAGE_TYPES.includes(n.type);
    if (activeFilter === 'system') return SYSTEM_TYPES.includes(n.type);
    return true;
  });

  const groupedData: { label: string; data: Notification[] }[] = [];
  filteredNotifications.forEach(n => {
    const label = getDateLabel(n.createdAt);
    let group = groupedData.find(g => g.label === label);
    if (!group) {
      group = { label, data: [] };
      groupedData.push(group);
    }
    group.data.push(n);
  });

  const flattenedData: any[] = [];
  groupedData.forEach(group => {
    flattenedData.push({ isHeader: true, label: group.label, id: `header-${group.label}` });
    group.data.forEach(n => flattenedData.push(n));
  });

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'new_booking':
        return { name: 'calendar', color: '#FFFFFF', bg: colors.coral };
      case 'booking_confirmed':
        return { name: 'check-circle', color: '#FFFFFF', bg: '#4CAF50' };
      case 'booking_declined':
        return { name: 'x-circle', color: '#FFFFFF', bg: colors.error };
      case 'booking_cancelled_by_client':
      case 'booking_cancelled_by_provider':
        return { name: 'x-circle', color: '#FFFFFF', bg: colors.error };
      case 'booking_rescheduled':
        return { name: 'refresh-cw', color: '#FFFFFF', bg: '#F5A623' };
      case 'booking_started':
        return { name: 'play-circle', color: '#FFFFFF', bg: '#4CAF50' };
      case 'booking_completed':
        return { name: 'star', color: '#FFFFFF', bg: colors.gold };
      case 'review_received':
        return { name: 'star', color: '#FFFFFF', bg: colors.gold };
      case 'message_received':
        return { name: 'message-circle', color: '#FFFFFF', bg: colors.coral };
      case 'provider_approved':
        return { name: 'check-circle', color: '#FFFFFF', bg: '#4CAF50' };
      default:
        return { name: 'bell', color: '#FFFFFF', bg: colors.borderStrong };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      return <Text style={styles.sectionHeader}>{item.label}</Text>;
    }

    const notif = item as Notification;
    const iconConfig = getIconConfig(notif.type);
    const title = lang === 'en' ? (notif.titleEn || notif.titleDe) : notif.titleDe;
    const body = lang === 'en' ? (notif.bodyEn || notif.bodyDe) : notif.bodyDe;

    return (
      <TouchableOpacity
        style={[styles.notificationRow, !notif.isRead ? styles.notificationRowUnread : styles.notificationRowRead]}
        onPress={() => handleNotificationPress(notif)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
          <Feather name={iconConfig.name as any} size={20} color={iconConfig.color} />
        </View>

        <View style={styles.contentCol}>
          <Text style={[styles.title, !notif.isRead ? styles.titleUnread : styles.titleRead]}>{title}</Text>
          <Text style={styles.bodyText} numberOfLines={2}>
            {body}
          </Text>
          <Text style={styles.timeText}>{getRelativeTime(notif.createdAt)}</Text>
        </View>

        {!notif.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notificationsTitle')}</Text>
        <TouchableOpacity onPress={markAllAsRead} disabled={unreadCount === 0}>
          <Text style={[styles.readAllText, unreadCount === 0 && styles.readAllTextDisabled]}>{t('notificationsMarkAll')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : flattenedData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="bell" size={64} color="#DDD" style={{ marginBottom: spacing.md }} />
          <Text style={styles.emptyTitle}>{t('notificationsEmpty')}</Text>
          <Text style={styles.emptySub}>{t('notificationsEmptySub')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: t('notificationsAll') },
              { key: 'booking', label: t('notificationsBookings') },
              { key: 'message', label: t('notificationsMessages') },
              { key: 'system', label: t('notificationsSystem') },
            ].map((f) => {
              const isActive = activeFilter === (f.key as any);
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setActiveFilter(f.key as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={flattenedData}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isLoadingMore ? <ActivityIndicator style={{ margin: spacing.md }} color={colors.coral} /> : null}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#FAF9F7' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FAF9F7'
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  readAllText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  readAllTextDisabled: { color: colors.borderStrong },

  listContent: { paddingBottom: 40 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    borderColor: colors.coral,
    backgroundColor: '#FFF5F4',
  },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary },
  filterTextActive: { color: colors.coral },

  sectionHeader: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#888888',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  notificationRowRead: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationRowUnread: {
    backgroundColor: '#FFF5F4',
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    paddingLeft: spacing.md - 3,
  },

  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },

  contentCol: { flex: 1, paddingRight: spacing.sm, justifyContent: 'center' },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, marginBottom: 4 },
  titleUnread: { color: '#1A1A1A' },
  titleRead: { color: '#888888' },

  bodyText: { fontFamily: fonts.body, fontSize: 14, color: '#555555', lineHeight: 20, marginBottom: 6 },
  timeText: { fontFamily: fonts.body, fontSize: 12, color: '#AAAAAA' },

  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral },

  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
