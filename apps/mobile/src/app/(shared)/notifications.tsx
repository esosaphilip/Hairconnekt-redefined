import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { apiFetch, apiJson } from '@/services/apiClient';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
      console.log('Error loading notifications', error);
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
      console.log('Error marking as read', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await apiFetch('/notifications/read-all', { auth: true, method: 'PATCH' });
    } catch (e) {
      console.log('Error marking all as read', e);
    }
  };

  const handleNotificationPress = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }

    if (notif.type.includes('booking')) {
      router.push(`/(client)/appointments/${notif.referenceId}` as any);
    } else if (notif.type === 'review_received') {
      router.push('/(client)/profile/reviews' as any);
    } else if (notif.type === 'message_received') {
      router.push(`/(client)/chat/${notif.referenceId}` as any);
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
    
    if (d.toDateString() === yesterday.toDateString()) return 'Gestern';

    const diffMs = Date.now() - d.getTime();
    if (diffMs > 0 && d.toDateString() === today.toDateString()) {
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `vor ${diffMins} Min.`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `vor ${diffHours} Std.`;
    }

    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDateLabel = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Heute';
    if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const groupedData: { label: string; data: Notification[] }[] = [];
  notifications.forEach(n => {
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
      case 'booking_confirmed':
        return { name: 'calendar', color: '#FFFFFF', bg: '#4CAF50' };
      case 'booking_cancelled':
        return { name: 'x', color: '#FFFFFF', bg: colors.error };
      case 'new_booking':
        return { name: 'clock', color: '#FFFFFF', bg: colors.coral };
      case 'review_received':
        return { name: 'star', color: '#FFFFFF', bg: colors.gold };
      case 'message_received':
        return { name: 'message-square', color: '#FFFFFF', bg: colors.teal };
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
          <Text style={[styles.title, !notif.isRead ? styles.titleUnread : styles.titleRead]}>{notif.title}</Text>
          <Text style={styles.bodyText} numberOfLines={2}>
            {notif.body}
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
        <Text style={styles.headerTitle}>Benachrichtigungen</Text>
        <TouchableOpacity onPress={markAllAsRead} disabled={unreadCount === 0}>
          <Text style={[styles.readAllText, unreadCount === 0 && styles.readAllTextDisabled]}>Alle lesen</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : flattenedData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="bell" size={64} color="#DDD" style={{ marginBottom: spacing.md }} />
          <Text style={styles.emptyTitle}>Keine Benachrichtigungen</Text>
          <Text style={styles.emptySub}>Hier siehst du Updates zu deinen Buchungen</Text>
        </View>
      ) : (
        <FlatList
          data={flattenedData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={{ margin: spacing.md }} color={colors.coral} /> : null}
        />
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
