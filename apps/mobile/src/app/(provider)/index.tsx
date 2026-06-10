import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { tokenStorage } from '../../utils/token-storage';
import { bookingStatus, bookingStatusLabel } from '../../utils/booking-status';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { apiFetch, apiJson } from '@/services/apiClient';
import { debugError } from '@/utils/logger';

export default function ProviderDashboardScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    nextAppointmentTime: '--:--',
    weeklyNewBookings: 0,
    avgRating: 0.0,
  });
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    let active = true;

    const guard = async (): Promise<boolean> => {
      const token = await tokenStorage.getAccessToken();
      const role = await tokenStorage.getUserRole();
      if (!token || role !== 'provider') {
        router.replace('/(auth)/login?role=provider');
        return false;
      }
      try {
        const providerData = await apiJson<any>('/providers/me', { auth: true });
        if (providerData.status?.toLowerCase() !== 'approved') {
          router.replace('/(provider)/pending');
          return false;
        }
        return true;
      } catch (err: any) {
        if (err?.status === 404) {
          router.replace('/(provider)/register/type');
          return false;
        }
        router.replace('/(auth)/login?role=provider');
        return false;
      }
    };

    (async () => {
      const shouldContinue = await guard();
      if (!active || !shouldContinue) return;
      await loadData();
    })();

    return () => { active = false; };
  }, []);

  const refreshUnreadNotifications = async () => {
    try {
      const res: any = await apiJson('/notifications?page=1&limit=20', { auth: true });
      const list = Array.isArray(res?.data) ? res.data : [];
      setUnreadNotificationsCount(list.filter((n: any) => n && n.isRead === false).length);
    } catch {
      setUnreadNotificationsCount(0);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshUnreadNotifications();
    }, []),
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats and bookings in parallel
      const [providerRes, statsRes, bookingsRes] = await Promise.all([
        apiJson<any>('/providers/me', { auth: true }).catch(() => null),
        apiJson<any>('/providers/me/stats', { auth: true }).catch(() => null),
        apiJson<any>('/bookings?today=true', { auth: true }).catch(() => null),
      ]);

      if (providerRes) {
        const providerData = providerRes.data ?? providerRes;
        setProvider(providerData);
        setIsOnline(providerData?.isOnline ?? false);
      }

      if (statsRes) {
        const statsData = statsRes.data ?? statsRes;
        setStats(statsData);
      }

      if (bookingsRes) {
        const bookingsData = bookingsRes.data ?? bookingsRes;
        setTodayBookings(bookingsData.data || bookingsData || []);
      }
    } catch (error) {
      debugError('Provider dashboard load failed', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus); // Optimistic update
    setIsTogglingOnline(true);
    
    try {
      const response = await apiFetch('/providers/me/availability', {
        auth: true,
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isOnline: newStatus })
      });

      if (!response.ok) {
        throw new Error();
      }
    } catch (error) {
      setIsOnline(!newStatus); // Revert on error
      debugError('Provider availability update failed', error);
    } finally {
      setIsTogglingOnline(false);
    }
  };

  const startBooking = async (id: string) => {
    try {
      const response = await apiFetch(`/bookings/${id}/start`, {
        auth: true,
        method: 'PATCH',
      });
      
      if (response.ok) {
        loadData(); // Reload to get updated status
      }
    } catch (error) {
      debugError('Provider booking start failed', error);
    }
  };

  const getTodayDateString = () => {
    const today = new Date();
    return today.toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{t('dashboardWelcome')}, {provider?.businessName || provider?.firstName || t('providerGeneric')}!</Text>
          <Text style={styles.date}>{getTodayDateString()}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.push('/(shared)/notifications')}
            hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={
              unreadNotificationsCount > 0
                ? `${t('notificationsTitle')} (${unreadNotificationsCount})`
                : t('notificationsTitle')
            }
          >
            <Feather name="bell" size={22} color={colors.textPrimary} />
            {unreadNotificationsCount > 0 && <View style={styles.badge} />}
          </Pressable>
          <Pressable
            onPress={() => router.push('/(shared)/settings')}
            hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('settingsTitle')}
          >
            <Feather name="settings" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Availability Toggle */}
        <View style={[styles.availabilityCard, isOnline ? styles.availabilityOnline : styles.availabilityOffline]}>
          <View style={styles.availabilityInfo}>
            <Text style={[styles.availabilityTitle, { color: isOnline ? colors.green : colors.error }]}>
              {isOnline ? t('dashboardAvailable') : t('dashboardUnavailable')}
            </Text>
            <Text style={styles.availabilitySub}>
              {isOnline ? t('dashboardAvailableSub') : t('dashboardUnavailableSub')}
            </Text>
          </View>
          <Switch
            trackColor={{ false: colors.borderStrong, true: colors.green }}
            thumbColor={colors.background}
            ios_backgroundColor={colors.borderStrong}
            onValueChange={toggleAvailability}
            value={isOnline}
            disabled={isTogglingOnline}
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(provider)/calendar')}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.coralLight }]}>
              <Feather name="calendar" size={20} color={colors.coral} />
            </View>
            <Text style={styles.statValue}>{stats?.todayAppointments ?? 0}</Text>
            <Text style={styles.statLabel}>{t('dashboardTodayAppts')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(provider)/reviews')}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.warningBg }]}>
              <Feather name="star" size={20} color={colors.gold} />
            </View>
            <View style={styles.ratingContainer}>
              <Text style={styles.statValue}>{stats?.avgRating ? `${stats.avgRating}` : '—'}</Text>
              <Feather name="star" size={16} color={colors.gold} style={{ marginLeft: spacing.xxs, marginTop: spacing.xxs }} />
            </View>
            <Text style={styles.statLabel}>{t('dashboardRating')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => {}}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.tealLight }]}>
              <Feather name="trending-up" size={20} color={colors.teal} />
            </View>
            <Text style={[styles.statValue, { color: colors.teal }]}>{stats?.weeklyNewBookings ? `+${stats.weeklyNewBookings}` : '+0'}</Text>
            <Text style={styles.statLabel}>{t('dashboardThisWeek')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(provider)/calendar')}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Feather name="clock" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { fontSize: fontSizes.xl }]}>{stats?.nextAppointmentTime ?? '—'}</Text>
            <Text style={styles.statLabel}>{t('dashboardNextAppt')}</Text>
          </TouchableOpacity>
        </View>

        {/* Schedule Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboardTodaySchedule')}</Text>
          <TouchableOpacity onPress={() => router.push('/(provider)/calendar')}>
            <Text style={styles.linkText}>{t('dashboardOpenCalendar')}</Text>
          </TouchableOpacity>
        </View>

        {todayBookings.length > 0 ? (
          todayBookings.map((booking) => (
            <TouchableOpacity 
              key={booking.id} 
              style={styles.bookingCard}
              onPress={() =>
                router.push(
                  booking.status === 'PENDING'
                    ? `/(provider)/booking-request/${booking.id}`
                    : `/(provider)/appointments/${booking.id}`,
                )
              }
            >
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingTime}>
                  {booking.scheduledTime || '—'}
                </Text>
                <View style={[
                  styles.statusBadge, 
                  bookingStatus(booking.status) === 'confirmed' ? { backgroundColor: colors.greenLight } : 
                  bookingStatus(booking.status) === 'in_progress' ? { backgroundColor: colors.orangeLight } : {}
                ]}>
                  <Text style={[
                    styles.statusText,
                    bookingStatus(booking.status) === 'confirmed' ? { color: colors.green } : 
                    bookingStatus(booking.status) === 'in_progress' ? { color: colors.orange } : {}
                  ]}>
                    {bookingStatusLabel(booking.status, lang)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.clientName}>{booking.client?.firstName} {booking.client?.lastName}</Text>
              <Text style={styles.serviceName}>
                {booking.services?.[0]?.name || 'Service'} {booking.totalPrice ? `· €${formatAmount(booking.totalPrice, lang)}` : ''}
              </Text>
              
              <View style={styles.bookingActions}>
                {bookingStatus(booking.status) === 'confirmed' && (
                  <View style={styles.actionBtnContainer}>
                    <PrimaryButton 
                      label={t('dashboardStart')} 
                      onPress={() => startBooking(booking.id)}
                      variant="filled"
                    />
                  </View>
                )}
                <View style={[styles.actionBtnContainer, bookingStatus(booking.status) === 'confirmed' && { marginLeft: spacing.sm }]}>
                  <PrimaryButton 
                    label={t('profileMessage')} 
                    onPress={() => router.push('/(provider)/chat')}
                    variant="outline"
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptySlotCard}>
            <Text style={styles.emptySlotText}>{t('dashboardNoAppts')}</Text>
          </View>
        )}

        {/* Quick Links */}
        <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>{t('dashboardQuickAccess')}</Text>
        </View>

        <View style={styles.quickLinksRow}>
          <TouchableOpacity style={styles.quickLinkCard} onPress={() => router.push('/(provider)/services')}>
            <View style={[styles.quickLinkIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.quickLinkEmoji}>💼</Text>
            </View>
            <Text style={styles.quickLinkLabel}>{t('profileTabServices')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickLinkCard} onPress={() => router.push('/(provider)/calendar')}>
            <View style={[styles.quickLinkIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.quickLinkEmoji}>📅</Text>
            </View>
            <Text style={styles.quickLinkLabel}>{t('tabCalendar')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1 },
  greeting: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary, marginBottom: spacing.xxxs },
  date: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  headerRight: { flexDirection: 'row', gap: spacing.sm },
  iconButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badge: { position: 'absolute', top: spacing.xs, right: spacing.xs, width: spacing.xs, height: spacing.xs, borderRadius: borderRadius.xs + spacing.xxxs, backgroundColor: colors.coral },

  scrollContainer: { padding: spacing.lg, paddingBottom: spacing.xxxxxl },

  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: spacing.xxs,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  availabilityOnline: { backgroundColor: colors.greenLight, borderLeftColor: colors.green },
  availabilityOffline: { backgroundColor: colors.errorLightSolid, borderLeftColor: colors.error },
  availabilityInfo: { flex: 1, paddingRight: spacing.md },
  availabilityTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, marginBottom: spacing.xxxs },
  availabilitySub: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  statIconContainer: {
    width: layout.iconButton,
    height: layout.iconButton,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing.xxs },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.textPrimary },
  linkText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.teal },

  bookingCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: spacing.xxs,
    borderLeftColor: colors.green,
    ...shadows.card,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  bookingTime: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  statusBadge: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: borderRadius.sm },
  statusText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xxs },
  clientName: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xxxs },
  serviceName: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
  
  bookingActions: { flexDirection: 'row' },
  actionBtnContainer: { flex: 1, height: layout.iconButton }, // Using container to restrict button height if needed

  emptySlotCard: {
    borderWidth: spacing.unit,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textTertiary },

  quickLinksRow: { flexDirection: 'row', gap: spacing.md },
  quickLinkCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.card,
  },
  quickLinkIcon: {
    width: layout.inputHeight,
    height: layout.inputHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickLinkEmoji: { fontSize: fontSizes.xxl },
  quickLinkLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
});
