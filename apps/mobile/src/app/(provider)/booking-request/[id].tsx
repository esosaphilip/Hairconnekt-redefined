import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows, borderRadius, layout } from '../../../theme';
import { bookingStatus, bookingStatusLabel } from '../../../utils/booking-status';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { debugError } from '@/utils/logger';
import { ApiError, apiJson } from '@/services/apiClient';
import { mapHttpError } from '@/utils/error-messages';

type BookingParticipant = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  totalBookings?: number;
};

type BookingServiceItem = {
  id: string;
  name: string;
};

type BookingAddress = {
  street?: string;
  houseNumber?: string;
  city?: string;
};

type BookingDetail = {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  totalMinutes?: number;
  totalPrice: number;
  isMobile?: boolean;
  clientNotes?: string;
  client: BookingParticipant;
  address?: BookingAddress;
  services?: BookingServiceItem[];
};

type BookingDetailResponse = BookingDetail | { data?: BookingDetail };
type ConversationResponse = { id?: string; data?: { id?: string } };

export default function BookingRequestScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { lang, t } = useLanguage();
  const bookingId = String(id ?? '');

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const extractBooking = (payload: BookingDetailResponse): BookingDetail | null =>
    'data' in payload ? payload.data ?? null : (payload as BookingDetail);

  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof ApiError) {
      const body = err.body;
      if (body && typeof body === 'object' && 'message' in body) {
        const message = (body as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
      return mapHttpError(err.status, fallback, lang);
    }
    return fallback;
  };

  const loadBooking = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const payload = await apiJson<BookingDetailResponse>(`/bookings/${bookingId}`, {
        auth: true,
      });
      setBooking(extractBooking(payload));
    } catch (err) {
      debugError('Provider booking request load failed', err);
      setError(getErrorMessage(err, t('errorUnknown')));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      await apiJson<unknown>(`/bookings/${bookingId}/accept`, {
        auth: true,
        method: 'PATCH',
      });
      router.replace(`/(provider)/appointments/${bookingId}`);
    } catch (err) {
      debugError('Provider booking accept failed', err);
      Alert.alert(t('error'), getErrorMessage(err, t('errorUnknown')));
      await loadBooking();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      t('bookingRequestDeclineTitle'),
      t('bookingRequestDeclineBody'),
      [
        { text: t('back'), style: 'cancel' },
        { 
          text: t('bookingRequestDecline'), 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeclining(true);
              await apiJson<unknown>(`/bookings/${bookingId}/decline`, {
                auth: true,
                method: 'PATCH',
              });
              router.replace('/(provider)/calendar');
            } catch (err) {
              debugError('Provider booking decline failed', err);
              Alert.alert(t('error'), getErrorMessage(err, t('errorUnknown')));
              await loadBooking();
            } finally {
              setIsDeclining(false);
            }
          }
        }
      ]
    );
  };

  const handleMessage = async () => {
    const recipientId = booking?.client?.id as string | undefined;
    if (!recipientId) return;
    try {
      const payload = await apiJson<ConversationResponse>('/chat/conversations', {
        auth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      const conversationId = payload.data?.id ?? payload.id;
      if (conversationId) {
        router.push(`/(shared)/chat/${conversationId}` as any);
      }
    } catch (err) {
      debugError('Provider booking request chat open failed', err);
      Alert.alert(t('error'), getErrorMessage(err, t('errorUnknown')));
    }
  };

  const handleCall = () => {
    if (booking?.client?.phone) {
      Linking.openURL(`tel:${booking.client.phone}`);
    } else {
      Alert.alert(t('phoneMissingTitle'), t('phoneMissingBody'));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || t('appointmentsNotFound')}</Text>
        <TouchableOpacity style={styles.backButtonCenter} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const d = new Date(booking.scheduledDate);
  const dateStr = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const getStatusBadge = () => {
    const s = bookingStatus(booking.status);
    const label = bookingStatusLabel(booking.status, lang);
    if (s === 'pending')
      return <View style={styles.badgePending}><Text style={styles.badgePendingText}>{label}</Text></View>;
    if (s === 'confirmed' || s === 'in_progress')
      return <View style={styles.badgeConfirmed}><Text style={styles.badgeConfirmedText}>{label}</Text></View>;
    if (s === 'completed')
      return <View style={styles.badgeConfirmed}><Text style={styles.badgeConfirmedText}>{label}</Text></View>;
    if (s === 'cancelled')
      return <View style={styles.badgeCancelled}><Text style={styles.badgeCancelledText}>{label}</Text></View>;
    return <View style={styles.badgeDefault}><Text style={styles.badgeDefaultText}>{label}</Text></View>;
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bookingRequestTitle')}</Text>
        {getStatusBadge()}
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {bookingStatus(booking.status) === 'pending' && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerTitle}>{t('bookingRequestAlert')}</Text>
            <Text style={styles.alertBannerSub}>{t('bookingRequestAlertSub')}</Text>
          </View>
        )}

        {/* CLIENT CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('bookingRequestClient')}</Text>
          
          <View style={styles.clientProfileRow}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>{booking.client.firstName[0]}{booking.client.lastName[0]}</Text>
            </View>
            <View style={styles.clientInfoCol}>
              <Text style={styles.clientName}>{booking.client.firstName} {booking.client.lastName[0]}.</Text>
              {booking.isMobile && booking.address && (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={fontSizes.sm} color={colors.textSecondary} />
                  <Text style={styles.locationText}>{booking.address.city}</Text>
                </View>
              )}
              <Text style={styles.bookingsCount}>{t('bookingRequestPrevious')}: {booking.client.totalBookings || 0}</Text>
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleMessage}>
              <Feather name="message-circle" size={fontSizes.lg} color={colors.primary} style={styles.actionBtnIcon} />
              <Text style={styles.actionBtnText}>{t('profileMessage')}</Text>
            </TouchableOpacity>
            <View style={{ width: spacing.md }} />
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <Feather name="phone" size={fontSizes.lg} color={colors.primary} style={styles.actionBtnIcon} />
              <Text style={styles.actionBtnText}>{t('appointmentsCall')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DETAILS CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('appointmentsDetail')}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('bookingServices')}</Text>
            <Text style={styles.detailValue}>{booking.services?.map((service) => service.name).join(', ')}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('appointmentsDate')}</Text>
            <View style={styles.detailValueRow}>
              <Feather name="calendar" size={fontSizes.sm} color={colors.textPrimary} style={{ marginRight: spacing.xxs }} />
              <Text style={styles.detailValue}>{dateStr} · </Text>
              <Feather name="clock" size={fontSizes.sm} color={colors.textPrimary} style={{ marginRight: spacing.xxs }} />
              <Text style={styles.detailValue}>{timeStr}{t('timeSuffix')}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('appointmentsDuration')}</Text>
            <Text style={styles.detailValue}>{booking.totalMinutes ? booking.totalMinutes / 60 : 0} {t('appointmentsHours')}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('bookingRequestLocation')}</Text>
            <Text style={styles.detailValue}>
              {booking.isMobile && booking.address 
                ? `${booking.address.street} ${booking.address.houseNumber}, ${booking.address.city}`
                : t('bookingRequestStudio')}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.totalLabel}>{t('appointmentsTotalPrice')}</Text>
            <Text style={styles.totalValue}>€{formatAmount(booking.totalPrice, lang)}</Text>
          </View>
        </View>

        {/* CLIENT NOTES */}
        {booking.clientNotes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>💬 {t('apptClientNote')}</Text>
            <Text style={styles.notesText}>{booking.clientNotes}</Text>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomActions}>
        {bookingStatus(booking.status) === 'pending' ? (
          <>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={isAccepting || isDeclining}>
              {isAccepting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.acceptBtnText}>{t('bookingRequestAccept')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} disabled={isAccepting || isDeclining}>
              {isDeclining ? <ActivityIndicator color={colors.error} /> : <Text style={styles.declineBtnText}>{t('bookingRequestDecline')}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.statusCard, bookingStatus(booking.status) === 'confirmed' ? styles.statusCardConfirmed : styles.statusCardCancelled]}>
            <Text style={[styles.statusCardText, bookingStatus(booking.status) === 'confirmed' ? styles.statusCardTextConfirmed : styles.statusCardTextCancelled]}>
              {bookingStatus(booking.status) === 'confirmed' ? t('bookingRequestConfirmed') : t('bookingRequestDeclined')}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.surfaceCard },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { fontFamily: fonts.body, color: colors.error, marginBottom: spacing.md },
  backButtonCenter: { padding: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.sm },
  backButtonText: { fontFamily: fonts.bodyBold },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  backButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.primary },
  
  badgePending: { backgroundColor: colors.orangeLight, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs },
  badgePendingText: { color: colors.orange, fontFamily: fonts.bodyBold, fontSize: fontSizes.xs },
  badgeConfirmed: { backgroundColor: colors.greenLight, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs },
  badgeConfirmedText: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: fontSizes.xs },
  badgeCancelled: { backgroundColor: colors.errorLightSolid, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs },
  badgeCancelledText: { color: colors.error, fontFamily: fonts.bodyBold, fontSize: fontSizes.xs },
  badgeDefault: { backgroundColor: colors.surface, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs },
  badgeDefaultText: { color: colors.textMuted2, fontFamily: fonts.bodyBold, fontSize: fontSizes.xs },

  scrollContent: { flex: 1 },
  scrollInner: { padding: spacing.lg, paddingBottom: spacing.xl2 },

  alertBanner: {
    backgroundColor: colors.orangeLight,
    borderLeftWidth: spacing.xxs,
    borderLeftColor: colors.warningBorder,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  alertBannerTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.orange, marginBottom: spacing.xxxs },
  alertBannerSub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
    borderWidth: spacing.unit,
    borderColor: colors.surfaceAlt,
  },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.primary, marginBottom: spacing.md },

  clientProfileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  clientAvatar: {
    width: layout.avatarMd,
    height: layout.avatarMd,
    borderRadius: layout.iconButton - spacing.xxxs,
    borderWidth: spacing.xxxs,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  clientAvatarText: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary },
  clientInfoCol: { flex: 1 },
  clientName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xxxs },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxxs },
  locationText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: spacing.xxs },
  bookingsCount: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  actionButtonsRow: { flexDirection: 'row' },
  actionBtn: {
    flex: 1,
    height: layout.iconButton,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnIcon: { marginRight: spacing.xxxs + spacing.xxs },
  actionBtnText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.primary },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  detailLabel: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, flex: 1 },
  detailValue: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary, flex: 2, textAlign: 'right' },
  detailValueRow: { flexDirection: 'row', alignItems: 'center', flex: 2, justifyContent: 'flex-end' },
  
  divider: { height: spacing.unit, backgroundColor: colors.border, marginVertical: spacing.md },
  
  totalLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  totalValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.primary },

  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  notesLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xxs },
  notesText: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: fontSizes.sm, color: colors.textMuted },

  bottomActions: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: spacing.unit,
    borderTopColor: colors.border,
  },
  acceptBtn: {
    backgroundColor: colors.coral,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg + borderRadius.xs + spacing.xxxs,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  acceptBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.background },
  declineBtn: {
    height: layout.inputHeight,
    borderRadius: borderRadius.lg,
    borderWidth: spacing.unit,
    borderColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.error },

  statusCard: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  statusCardConfirmed: { backgroundColor: colors.greenLight },
  statusCardCancelled: { backgroundColor: colors.errorLightSolid },
  statusCardText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm },
  statusCardTextConfirmed: { color: colors.green },
  statusCardTextCancelled: { color: colors.error },
});
