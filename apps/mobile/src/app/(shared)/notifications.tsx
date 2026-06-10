import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '../../theme';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { apiFetch, apiJson } from '@/services/apiClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSafeNotificationRoute } from '@/utils/safe-navigation';
import { debugLog } from '@/utils/logger';

type NotificationData = {
  screen?: string;
} & Record<string, unknown>;

type NotificationItem = {
  id: string;
  type: string;
  titleDe: string;
  titleEn?: string | null;
  bodyDe: string;
  bodyEn?: string | null;
  data?: NotificationData | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationFilter = 'all' | 'booking' | 'message' | 'system';

type NotificationListResponse = {
  data?: NotificationItem[];
  meta?: {
    hasNextPage?: boolean;
  };
};

type NotificationSection = {
  label: string;
  data: NotificationItem[];
};

type NotificationHeaderItem = {
  id: string;
  isHeader: true;
  label: string;
};

type NotificationRowItem = {
  id: string;
  isHeader: false;
  notification: NotificationItem;
};

type NotificationListItem =
  | NotificationHeaderItem
  | NotificationRowItem;

type NotificationIconConfig = {
  name: React.ComponentProps<typeof Feather>['name'];
  color: string;
  bg: string;
};

const FILTER_OPTIONS: ReadonlyArray<{
  key: NotificationFilter;
  labelKey:
    | 'notificationsAll'
    | 'notificationsBookings'
    | 'notificationsMessages'
    | 'notificationsSystem';
}> = [
  { key: 'all', labelKey: 'notificationsAll' },
  { key: 'booking', labelKey: 'notificationsBookings' },
  { key: 'message', labelKey: 'notificationsMessages' },
  { key: 'system', labelKey: 'notificationsSystem' },
] as const;

export default function NotificationsScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState('');

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

  const loadNotifications = useCallback(async (pageNum: number, refresh = false) => {
    try {
      if (refresh) setIsLoading(true);
      else setIsLoadingMore(true);
      setErrorVisible(false);
      setErrorStatus(undefined);

      const response = await apiJson<NotificationListResponse>(
        `/notifications?page=${pageNum}&limit=20`,
        { auth: true },
      );

      const newItems = Array.isArray(response.data) ? response.data : [];
      setNotifications(prev => (refresh ? newItems : [...prev, ...newItems]));
      setHasMore(response.meta?.hasNextPage ?? false);
      setPage(pageNum);
    } catch (error: any) {
      debugLog('Error loading notifications', error);
      setErrorStatus(error?.status ?? error?.response?.status ?? 500);
      setErrorMessage(error?.message);
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications(1, true);
    }, [loadNotifications]),
  );

  const markAsRead = async (id: string) => {
    const previous = notifications;
    try {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
      await apiFetch(`/notifications/${id}/read`, { auth: true, method: 'PATCH' });
    } catch (e: any) {
      debugLog('Error marking as read', e);
      setNotifications(previous);
      setErrorStatus(e?.status ?? e?.response?.status ?? 500);
      setErrorMessage(e?.message);
      setErrorVisible(true);
    }
  };

  const markAllAsRead = async () => {
    const previous = notifications;
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await apiFetch('/notifications/read-all', { auth: true, method: 'PATCH' });
    } catch (e: any) {
      debugLog('Error marking all as read', e);
      setNotifications(previous);
      setErrorStatus(e?.status ?? e?.response?.status ?? 500);
      setErrorMessage(e?.message);
      setErrorVisible(true);
    }
  };

  const handleNotificationPress = (notif: NotificationItem) => {
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

  const groupedData: NotificationSection[] = [];
  filteredNotifications.forEach(n => {
    const label = getDateLabel(n.createdAt);
    let group = groupedData.find(g => g.label === label);
    if (!group) {
      group = { label, data: [] };
      groupedData.push(group);
    }
    group.data.push(n);
  });

  const flattenedData: NotificationListItem[] = [];
  groupedData.forEach(group => {
    flattenedData.push({ isHeader: true, label: group.label, id: `header-${group.label}` });
    group.data.forEach((notification) =>
      flattenedData.push({
        id: notification.id,
        isHeader: false,
        notification,
      }),
    );
  });

  const getIconConfig = (type: string): NotificationIconConfig => {
    switch (type) {
      case 'new_booking':
        return { name: 'calendar', color: colors.background, bg: colors.coral };
      case 'booking_confirmed':
        return { name: 'check-circle', color: colors.background, bg: colors.successAlt };
      case 'booking_declined':
        return { name: 'x-circle', color: colors.background, bg: colors.error };
      case 'booking_cancelled_by_client':
      case 'booking_cancelled_by_provider':
        return { name: 'x-circle', color: colors.background, bg: colors.error };
      case 'booking_rescheduled':
        return { name: 'refresh-cw', color: colors.background, bg: colors.amber };
      case 'booking_started':
        return { name: 'play-circle', color: colors.background, bg: colors.successAlt };
      case 'booking_completed':
        return { name: 'star', color: colors.background, bg: colors.gold };
      case 'review_received':
        return { name: 'star', color: colors.background, bg: colors.gold };
      case 'message_received':
        return { name: 'message-circle', color: colors.background, bg: colors.coral };
      case 'provider_approved':
        return { name: 'check-circle', color: colors.background, bg: colors.successAlt };
      default:
        return { name: 'bell', color: colors.background, bg: colors.borderStrong };
    }
  };

  function renderItem({
    item,
  }: {
    item: NotificationListItem;
  }): React.ReactElement {
    if (item.isHeader === true) {
      return <Text style={styles.sectionHeader}>{item.label}</Text>;
    }

    const notif = item.notification;
    const iconConfig = getIconConfig(notif.type);
    const title = lang === 'en' ? (notif.titleEn || notif.titleDe) : notif.titleDe;
    const body = lang === 'en' ? (notif.bodyEn || notif.bodyDe) : notif.bodyDe;

    return (
      <TouchableOpacity
        style={[styles.notificationRow, !notif.isRead ? styles.notificationRowUnread : styles.notificationRowRead]}
        onPress={() => handleNotificationPress(notif)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${body}`}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
          <Feather name={iconConfig.name} size={20} color={iconConfig.color} />
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
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notificationsTitle')}</Text>
        <TouchableOpacity onPress={markAllAsRead} disabled={unreadCount === 0}>
          <Text style={[styles.readAllText, unreadCount === 0 && styles.readAllTextDisabled]}>{t('notificationsMarkAll')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bannerContainer}>
        <GermanErrorBanner
          visible={errorVisible}
          statusCode={errorStatus}
          message={errorMessage}
          actionLabel={t('appointmentsRetry')}
          onAction={() => {
            void loadNotifications(1, true);
          }}
        />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : flattenedData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="bell" size={64} color={colors.iconDisabled} style={{ marginBottom: spacing.md }} />
          <Text style={styles.emptyTitle}>{t('notificationsEmpty')}</Text>
          <Text style={styles.emptySub}>{t('notificationsEmptySub')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setActiveFilter(f.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {t(f.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={flattenedData}
            keyExtractor={(item) => item.id}
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
  safeContainer: { flex: 1, backgroundColor: colors.warmBackground },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
    backgroundColor: colors.warmBackground
  },
  backButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  readAllText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.primary },
  readAllTextDisabled: { color: colors.borderStrong },
  bannerContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  listContent: { paddingBottom: spacing.xl2 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: spacing.unit,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterPillActive: {
    borderColor: colors.coral,
    backgroundColor: colors.coralTint,
  },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs + spacing.unit, color: colors.textSecondary },
  filterTextActive: { color: colors.coral },

  sectionHeader: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.textMuted3,
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
    borderRadius: borderRadius.sm,
  },
  notificationRowRead: {
    backgroundColor: colors.background,
    borderWidth: spacing.unit,
    borderColor: colors.border,
  },
  notificationRowUnread: {
    backgroundColor: colors.coralTint,
    borderLeftWidth: spacing.xxs - spacing.unit,
    borderLeftColor: colors.coral,
    paddingLeft: spacing.md - (spacing.xxs - spacing.unit),
  },

  iconCircle: { width: layout.inputHeight, height: layout.inputHeight, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },

  contentCol: { flex: 1, paddingRight: spacing.sm, justifyContent: 'center' },
  title: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, marginBottom: spacing.xxs },
  titleUnread: { color: colors.textPrimary },
  titleRead: { color: colors.textMuted3 },

  bodyText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: spacing.l, marginBottom: spacing.xxs + spacing.xxxs },
  timeText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary },

  unreadDot: { width: spacing.xs, height: spacing.xs, borderRadius: borderRadius.xs + spacing.xxxs, backgroundColor: colors.coral },

  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
});
