import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows } from '../../theme';
import { tokenStorage } from '../../utils/token-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

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

      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API_URL}/notifications?page=${pageNum}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => ({ ok: false, json: () => ({}) }));

      if (!res.ok) {
        throw new Error('Failed to load notifications');
      }
      const data: any = await res.json();

      const newItems = data.data || [];
      setNotifications(prev => refresh ? newItems : [...prev, ...newItems]);
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
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      const token = await tokenStorage.getAccessToken();
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.log('Error marking as read', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      const token = await tokenStorage.getAccessToken();
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.log('Error marking all as read', e);
    }
  };

  const handleNotificationPress = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }

    if (notif.type.startsWith('booking')) {
      // Could route to specific appointment if we know the user type, 
      // but without knowing if this is client or provider, we can route safely to a general appointments view or just back.
      // For now, no strict navigation action to avoid 404s, or just log.
      console.log('Navigate to appointment', notif.referenceId);
    } else if (notif.type === 'review_received') {
      console.log('Navigate to reviews');
    } else if (notif.type === 'message_received') {
      console.log('Navigate to chat', notif.referenceId);
    }
  };

  const loadMore = () => {
    if (hasMore && !isLoadingMore) {
      loadNotifications(page + 1);
    }
  };

  const getRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
  };

  const getDateLabel = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Heute';
    if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Group notifications by date label
  const groupedData: { label: string, data: Notification[] }[] = [];
  notifications.forEach(n => {
    const label = getDateLabel(n.createdAt);
    let group = groupedData.find(g => g.label === label);
    if (!group) {
      group = { label, data: [] };
      groupedData.push(group);
    }
    group.data.push(n);
  });

  // Flatten for FlatList rendering with custom headers
  const flattenedData: any[] = [];
  groupedData.forEach(group => {
    flattenedData.push({ isHeader: true, label: group.label, id: `header-${group.label}` });
    group.data.forEach(n => flattenedData.push(n));
  });

  const getIconConfig = (type: string) => {
    switch (type) {
      case 'booking_confirmed': return { name: 'calendar', color: '#4CAF50', bg: '#E8F5E9' };
      case 'new_booking': return { name: 'clock', color: colors.coral, bg: '#FFF0ED' };
      case 'review_received': return { name: 'star', color: colors.gold, bg: '#FFF9E6' };
      case 'message_received': return { name: 'message-square', color: colors.teal, bg: '#E0F2F1' };
      case 'booking_cancelled': return { name: 'x', color: colors.error, bg: '#FFEBEE' };
      default: return { name: 'bell', color: colors.primary, bg: '#F5F5F5' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      return (
        <Text style={styles.sectionHeader}>{item.label}</Text>
      );
    }

    const notif = item as Notification;
    const iconConfig = getIconConfig(notif.type);

    return (
      <TouchableOpacity 
        style={[styles.notificationRow, !notif.isRead && styles.notificationRowUnread]} 
        onPress={() => handleNotificationPress(notif)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
          <Feather name={iconConfig.name as any} size={20} color={iconConfig.color} />
        </View>

        <View style={styles.contentCol}>
          <Text style={[styles.title, !notif.isRead ? styles.titleUnread : styles.titleRead]}>
            {notif.title}
          </Text>
          <Text style={styles.bodyText} numberOfLines={2}>{notif.body}</Text>
          <Text style={styles.timeText}>{getRelativeTime(notif.createdAt)}</Text>
        </View>

        {!notif.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Benachrichtigungen</Text>
        <TouchableOpacity onPress={markAllAsRead} disabled={!hasUnread || notifications.length === 0}>
          <Text style={[styles.readAllText, (!hasUnread || notifications.length === 0) && styles.readAllTextDisabled]}>
            Alle als gelesen markieren
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : flattenedData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="bell" size={64} color={colors.borderStrong} style={{ marginBottom: spacing.md }} />
          <Text style={styles.emptyTitle}>Keine Benachrichtigungen</Text>
          <Text style={styles.emptySub}>Hier siehst du Updates zu deinen Buchungen und Nachrichten</Text>
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
  safeContainer: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  readAllText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal },
  readAllTextDisabled: { color: colors.textTertiary },

  listContent: { paddingBottom: 40 },

  sectionHeader: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: '#AAAAAA',
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  notificationRowUnread: {
    backgroundColor: '#FFF0ED',
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    paddingLeft: spacing.md - 3,
    borderColor: '#FFF0ED',
  },
  
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  
  contentCol: { flex: 1, paddingRight: spacing.sm },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, marginBottom: 2 },
  titleUnread: { color: '#1A1A1A' },
  titleRead: { color: '#6B6B6B' },
  
  bodyText: { fontFamily: fonts.body, fontSize: 14, color: '#555555', lineHeight: 20, marginBottom: 4 },
  timeText: { fontFamily: fonts.body, fontSize: 12, color: '#AAAAAA' },

  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral, marginTop: 6 },

  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
});