import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '../../theme';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { apiFetch, apiJson } from '@/services/apiClient';
import { mapHttpError } from '@/utils/error-messages';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugLog } from '@/utils/logger';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: string;
};

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

type NotificationFilter = 'all' | 'booking' | 'message' | 'system';

type NotificationListResponse = {
  data?: RawNotification[];
  meta?: {
    hasNextPage?: boolean;
  };
};

type NotificationSection = {
  label: string;
  data: Notification[];
};

type NotificationHeaderItem = {
  id: string;
  isHeader: true;
  label: string;
};

type NotificationRowItem = {
  id: string;
  isHeader: false;
  notification: Notification;
};

type NotificationListItem = NotificationHeaderItem | NotificationRowItem;

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

const getNotificationTarget = (notif: Notification): string | null => {
  const id = notif.referenceId;

  switch (notif.type) {
    case 'new_booking':
    case 'booking_rescheduled':
      return id ? `/(provider)/booking-request/${id}` : null;
    case 'booking_confirmed':
    case 'booking_declined':
    case 'booking_cancelled_by_provider':
    case 'booking_completed':
      return id ? `/(client)/appointments/${id}` : null;
    case 'booking_cancelled_by_client':
      return '/(provider)/calendar';
    case 'booking_reminder_24h':
    case 'booking_reminder_2h':
    case 'booking_started':
      return id ? `/(client)/appointments/${id}` : null;
    case 'message_received':
      return id ? `/(shared)/chat/${id}` : '/(shared)/chat';
    case 'review_received':
      return '/(provider)/reviews';
    case 'review_response':
      return '/(client)/profile/reviews';
    case 'provider_approved':
      return '/(provider)/';
    case 'provider_rejected':
      return '/(provider)/pending';
    default:
      return null;
  }
};

const getNotificationReferenceId = (raw: RawNotification): string | undefined => {
  if (typeof raw.referenceId === 'string' && raw.referenceId) {
    return raw.referenceId;
  }

  const data = raw.data;
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const candidates = [
    data.referenceId,
    data.bookingId,
    data.conversationId,
    data.reviewId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) {
      return candidate;
    }
  }

  return undefined;
};

const normalizeNotification = (raw: RawNotification, lang: 'de' | 'en'): Notification => {
  const title =
    lang === 'en'
      ? raw.titleEn || raw.title || raw.titleDe || ''
      : raw.titleDe || raw.title || raw.titleEn || '';
  const body =
    lang === 'en'
      ? raw.bodyEn || raw.body || raw.bodyDe || ''
      : raw.bodyDe || raw.body || raw.bodyEn || '';

  return {
    id: raw.id,
    type: raw.type,
    title,
    body,
    isRead: raw.isRead,
    createdAt: raw.createdAt,
    referenceId: getNotificationReferenceId(raw),
  };
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [expandedNotif, setExpandedNotif] = useState<Notification | null>(null);
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

  const loadNotifications = useCallback(
    async (pageNum: number, refresh = false) => {
      try {
        if (refresh) setIsLoading(true);
        else setIsLoadingMore(true);

        setErrorVisible(false);
        setErrorStatus(undefined);

        const response = await apiJson<NotificationListResponse>(
          `/notifications?page=${pageNum}&limit=20`,
          { auth: true },
        );

        const newItems = Array.isArray(response.data)
          ? response.data.map((item) => normalizeNotification(item, lang))
          : [];
        setNotifications((prev) => (refresh ? newItems : [...prev, ...newItems]));
        setHasMore(response.meta?.hasNextPage ?? false);
        setPage(pageNum);
      } catch (error: any) {
        const status = error?.status ?? error?.response?.status ?? 500;
        debugLog('Error loading notifications', error);
        setErrorStatus(status);
        setErrorMessage(mapHttpError(status, undefined, lang));
        setErrorVisible(true);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [lang],
  );

  useFocusEffect(
    useCallback(() => {
      void loadNotifications(1, true);
    }, [loadNotifications]),
  );

  const markAsRead = async (id: string) => {
    const previous = notifications;

    try {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, isRead: true } : notification,
        ),
      );
      await apiFetch(`/notifications/${id}/read`, { auth: true, method: 'PATCH' });
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status ?? 500;
      debugLog('Error marking as read', error);
      setNotifications(previous);
      setErrorStatus(status);
      setErrorMessage(mapHttpError(status, undefined, lang));
      setErrorVisible(true);
    }
  };

  const markAllAsRead = async () => {
    const previous = notifications;

    try {
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      await apiFetch('/notifications/read-all', { auth: true, method: 'PATCH' });
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status ?? 500;
      debugLog('Error marking all as read', error);
      setNotifications(previous);
      setErrorStatus(status);
      setErrorMessage(mapHttpError(status, undefined, lang));
      setErrorVisible(true);
    }
  };

  const handleNotificationPress = async (notif: Notification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    const target = getNotificationTarget(notif);
    if (!target) {
      setExpandedNotif(notif);
      return;
    }

    router.push(target as any);
  };

  const loadMore = () => {
    if (hasMore && !isLoadingMore) {
      void loadNotifications(page + 1);
    }
  };

  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return t('notificationsYesterday');
    }

    const diffMs = Date.now() - date.getTime();
    if (diffMs > 0 && date.toDateString() === today.toDateString()) {
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 60) {
        return t('notificationsAgoMins').replace('{minutes}', String(diffMinutes));
      }

      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        return t('notificationsAgoHours').replace('{hours}', String(diffHours));
      }
    }

    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDateLabel = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return t('notificationsToday');
    if (date.toDateString() === yesterday.toDateString()) return t('notificationsYesterday');

    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'booking') return BOOKING_TYPES.includes(notification.type);
    if (activeFilter === 'message') return MESSAGE_TYPES.includes(notification.type);
    if (activeFilter === 'system') return SYSTEM_TYPES.includes(notification.type);
    return true;
  });

  const groupedData: NotificationSection[] = [];
  filteredNotifications.forEach((notification) => {
    const label = getDateLabel(notification.createdAt);
    let group = groupedData.find((entry) => entry.label === label);

    if (!group) {
      group = { label, data: [] };
      groupedData.push(group);
    }

    group.data.push(notification);
  });

  const flattenedData: NotificationListItem[] = [];
  groupedData.forEach((group) => {
    flattenedData.push({
      id: `header-${group.label}`,
      isHeader: true,
      label: group.label,
    });

    group.data.forEach((notification) => {
      flattenedData.push({
        id: notification.id,
        isHeader: false,
        notification,
      });
    });
  });

  const getIconConfig = (type: string): NotificationIconConfig => {
    switch (type) {
      case 'new_booking':
        return { name: 'calendar', color: colors.background, bg: colors.coral };
      case 'booking_confirmed':
        return { name: 'check-circle', color: colors.background, bg: colors.successAlt };
      case 'booking_declined':
      case 'booking_cancelled_by_client':
      case 'booking_cancelled_by_provider':
        return { name: 'x-circle', color: colors.background, bg: colors.error };
      case 'booking_rescheduled':
        return { name: 'refresh-cw', color: colors.background, bg: colors.amber };
      case 'booking_started':
        return { name: 'play-circle', color: colors.background, bg: colors.successAlt };
      case 'booking_completed':
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

  function renderItem(params: { item: NotificationListItem }): React.ReactElement {
    const { item } = params;
    if (item.isHeader === true) {
      return <Text style={styles.sectionHeader}>{item.label}</Text>;
    }

    const notif = item.notification;
    const iconConfig = getIconConfig(notif.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationRow,
          !notif.isRead ? styles.notificationRowUnread : styles.notificationRowRead,
        ]}
        onPress={() => {
          void handleNotificationPress(notif);
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${notif.title}. ${notif.body}`}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconConfig.bg }]}>
          <Feather name={iconConfig.name} size={20} color={iconConfig.color} />
        </View>

        <View style={styles.contentCol}>
          <Text style={[styles.title, !notif.isRead ? styles.titleUnread : styles.titleRead]}>
            {notif.title}
          </Text>
          <Text style={styles.bodyText} numberOfLines={2}>
            {notif.body}
          </Text>
          <Text style={styles.timeText}>{getRelativeTime(notif.createdAt)}</Text>
        </View>

        {!notif.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

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
          <Text style={[styles.readAllText, unreadCount === 0 && styles.readAllTextDisabled]}>
            {t('notificationsMarkAll')}
          </Text>
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
          <Feather
            name="bell"
            size={64}
            color={colors.iconDisabled}
            style={{ marginBottom: spacing.md }}
          />
          <Text style={styles.emptyTitle}>{t('notificationsEmpty')}</Text>
          <Text style={styles.emptySub}>{t('notificationsEmptySub')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((filterOption) => {
              const isActive = activeFilter === filterOption.key;
              return (
                <TouchableOpacity
                  key={filterOption.key}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setActiveFilter(filterOption.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {t(filterOption.labelKey)}
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
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator style={{ margin: spacing.md }} color={colors.coral} />
              ) : null
            }
          />
        </>
      )}

      <Modal
        visible={!!expandedNotif}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedNotif(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setExpandedNotif(null)}
          activeOpacity={1}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{expandedNotif?.title}</Text>
            <Text style={styles.modalBody}>{expandedNotif?.body}</Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setExpandedNotif(null)}
            >
              <Text style={styles.modalCloseText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.warmBackground,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
    backgroundColor: colors.warmBackground,
  },
  backButton: {
    width: layout.iconButton,
    height: layout.iconButton,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.primary,
  },
  readAllText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  readAllTextDisabled: {
    color: colors.borderStrong,
  },
  bannerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl2,
  },
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
  filterText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xs + spacing.unit,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.coral,
  },
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
  iconCircle: {
    width: layout.inputHeight,
    height: layout.inputHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contentCol: {
    flex: 1,
    paddingRight: spacing.sm,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    marginBottom: spacing.xxs,
  },
  titleUnread: {
    color: colors.textPrimary,
  },
  titleRead: {
    color: colors.textMuted3,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: spacing.l,
    marginBottom: spacing.xxs + spacing.xxxs,
  },
  timeText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  },
  unreadDot: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: borderRadius.xs + spacing.xxxs,
    backgroundColor: colors.coral,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  modalTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: spacing.xl - spacing.xxs,
    marginBottom: spacing.lg,
  },
  modalClose: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.xl - spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  modalCloseText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.background,
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
