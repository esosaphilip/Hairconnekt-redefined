import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { bookingStatus, bookingStatusLabel } from '../../../utils/booking-status';
import { formatAmount } from '../../../utils/format';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError } from '@/utils/logger';
import { ApiError, apiJson } from '@/services/apiClient';
import { mapHttpError } from '@/utils/error-messages';

type BookingClient = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  city?: string;
  address?: {
    city?: string;
  };
};

type BookingServiceItem = {
  id: string;
  name: string;
};

type ProviderAppointment = {
  id: string;
  status: string;
  bookingNumber?: string;
  scheduledDate: string;
  scheduledTime: string;
  totalPrice: number;
  platformFeeAmount?: number;
  platformFeePercent?: number;
  providerPayout?: number;
  clientNotes?: string;
  client?: BookingClient;
  services?: BookingServiceItem[];
};

type ProviderAppointmentResponse = ProviderAppointment | { data?: ProviderAppointment };
type ConversationResponse = { id?: string; data?: { id?: string } };

export default function ProviderAppointmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  const bookingId = String(id ?? '');
  
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<ProviderAppointment | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (bookingId) fetchBookingDetails();
    }, [bookingId]),
  );

  const extractBooking = (
    payload: ProviderAppointmentResponse,
  ): ProviderAppointment | null =>
    'data' in payload ? payload.data ?? null : (payload as ProviderAppointment);

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof ApiError) {
      const body = error.body;
      if (body && typeof body === 'object' && 'message' in body) {
        const message = (body as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
      return mapHttpError(error.status, fallback, lang);
    }
    return fallback;
  };

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const payload = await apiJson<ProviderAppointmentResponse>(`/bookings/${bookingId}`, {
        auth: true,
      });
      setBooking(extractBooking(payload));
    } catch (error) {
      debugError('Provider appointment detail load failed', error);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async () => {
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
        router.push(('/(shared)/chat/' + conversationId) as any);
      }
    } catch (error) {
      debugError('Provider appointment chat open failed', error);
      Alert.alert(t('error'), getErrorMessage(error, t('errorUnknown')));
    }
  };

  const updateBookingStatus = async (action: 'start' | 'complete') => {
    try {
      await apiJson<unknown>(`/bookings/${bookingId}/${action}`, {
        auth: true,
        method: 'PATCH',
      });
      fetchBookingDetails();
    } catch (error) {
      debugError(`Provider booking status update failed action=${action}`, error);
      Alert.alert(t('error'), getErrorMessage(error, t('errorUnknown')));
    }
  };

  const acceptBooking = async () => {
    try {
      setIsAccepting(true);
      await apiJson<unknown>(`/bookings/${bookingId}/accept`, {
        auth: true,
        method: 'PATCH',
      });
      fetchBookingDetails();
    } catch (error) {
      debugError('Provider appointment accept failed', error);
      Alert.alert(t('error'), getErrorMessage(error, t('providerBookingAcceptError')));
      fetchBookingDetails();
    } finally {
      setIsAccepting(false);
    }
  };

  const declineBooking = () => {
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
              fetchBookingDetails();
            } catch (error) {
              debugError('Provider appointment decline failed', error);
              Alert.alert(t('error'), getErrorMessage(error, t('providerBookingDeclineError')));
              fetchBookingDetails();
            } finally {
              setIsDeclining(false);
            }
          },
        },
      ],
    );
  };

  const getStatusText = (status: string) => {
    const s = bookingStatus(status);
    return bookingStatusLabel(s, lang);
  };

  const getStatusColor = (status: string) => {
    // Provider view uses BLUE for status
    if (bookingStatus(status) === 'pending') return colors.orange;
    if (bookingStatus(status) === 'confirmed' || bookingStatus(status) === 'in_progress') return colors.blue;
    if (bookingStatus(status) === 'completed') return colors.green;
    if (bookingStatus(status) === 'cancelled') return colors.error;
    return colors.textSecondary;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <Feather name="arrow-left" size={fontSizes.xxl} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('providerAppointmentDetailsTitle')}</Text>
          <View style={{ width: layout.iconButton }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ fontFamily: fonts.body, color: colors.textSecondary }}>{t('providerAppointmentNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('providerAppointmentDetailsTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Status & Booking Number */}
        <View style={styles.topInfo}>
          <View style={[styles.statusChip, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusChipText}>{getStatusText(booking.status)}</Text>
          </View>
          <Text style={styles.bookingNumber}>
            {t('providerBookingNumberLabel')}: {booking.bookingNumber || ('HC-' + booking.id.substring(0, 4).toUpperCase())}
          </Text>
        </View>

        {/* Client Card */}
        <View style={styles.card}>
          <View style={styles.clientHeader}>
            <View style={styles.clientAvatarRing}>
              {booking.client?.avatarUrl ? (
                <Image source={{ uri: booking.client.avatarUrl }} style={styles.clientAvatar} />
              ) : (
                <Feather name="user" size={32} color={colors.gold} />
              )}
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {booking.client?.firstName} {booking.client?.lastName}
              </Text>
              <Text style={styles.clientCity}>
                {booking.client?.city || booking.client?.address?.city || t('providerUnknownCity')}
              </Text>
            </View>
          </View>

          <View style={styles.clientActions}>
            <TouchableOpacity style={styles.greyButton} onPress={openChat}>
              <Text style={styles.greyButtonText}>{t('message')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.greyButton} 
              onPress={() => (booking.client?.phone ? Linking.openURL('tel:' + booking.client.phone) : null)}
            >
              <Text style={styles.greyButtonText}>{t('call')}</Text>
            </TouchableOpacity>
          </View>

          {booking.clientNotes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>"{booking.clientNotes}"</Text>
            </View>
          )}
        </View>

        {/* Appointment Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('appointmentsInfo')}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('service')}</Text>
            <Text style={styles.infoValue}>
              {booking.services?.map((service) => service.name).join(', ') || 'Service'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              <Feather name="calendar" size={14} color={colors.textSecondary} /> {t('date')}
            </Text>
            <Text style={styles.infoValue}>
              {new Date(booking.scheduledDate).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              <Feather name="clock" size={14} color={colors.textSecondary} /> {t('time')}
            </Text>
            <Text style={styles.infoValue}>
              {booking.scheduledTime}
              {lang === 'de' ? ' ' + t('timeSuffix') : ''}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('bookingServicePrice')}</Text>
            <Text style={styles.infoValue}>€{formatAmount(booking.totalPrice, lang)}</Text>
          </View>

          {(booking.platformFeeAmount > 0) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t('bookingPlatformFee')} ({booking.platformFeePercent}%)
              </Text>
              <Text style={styles.infoValue}>-€{formatAmount(booking.platformFeeAmount, lang)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, styles.boldGreenText]}>
              <Feather name="briefcase" size={16} color={colors.green} /> {t('providerPayout')}
            </Text>
            <Text style={[styles.infoValue, styles.boldGreenText]}>€{formatAmount(booking.providerPayout ?? booking.totalPrice, lang)}</Text>
          </View>

          <View style={styles.paymentMethodRow}>
            <View style={styles.orangeDot} />
            <Text style={styles.paymentMethodText}>{t('providerPaymentOnCompletion')}</Text>
          </View>

        </View>

      </ScrollView>

      {/* Action Buttons Footer */}
      {bookingStatus(booking.status) === 'pending' && (
        <View style={styles.footer}>
          <PrimaryButton
            label={t('providerBookingAccept')}
            onPress={acceptBooking}
            loading={isAccepting}
            disabled={isDeclining}
            variant="filled"
          />
          <View style={{ height: spacing.sm }} />
          <TouchableOpacity
            style={styles.declineButton}
            onPress={declineBooking}
            disabled={isAccepting || isDeclining}
          >
            {isDeclining ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.declineButtonText}>{t('bookingRequestDecline')}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {bookingStatus(booking.status) === 'confirmed' && (
        <View style={styles.footer}>
          <PrimaryButton 
            label={t('providerStartAppointment')} 
            onPress={() => updateBookingStatus('start')}
            variant="filled"
          />
        </View>
      )}
      
      {bookingStatus(booking.status) === 'in_progress' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.green }]} 
            onPress={() => updateBookingStatus('complete')}
          >
            <Text style={styles.actionButtonText}>{t('apptComplete')}</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  scrollContainer: { padding: spacing.lg, paddingBottom: spacing.xxxxxl },

  topInfo: { alignItems: 'center', marginBottom: spacing.xl },
  statusChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xxs + spacing.xxxs, borderRadius: borderRadius.pill, marginBottom: spacing.sm },
  statusChipText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.background },
  bookingNumber: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  cardTitle: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.md },

  clientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  clientAvatarRing: { width: layout.avatarMd, height: layout.avatarMd, borderRadius: layout.iconButton - spacing.xxxs, borderWidth: spacing.xxxs, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  clientAvatar: { width: layout.headerHeight, height: layout.headerHeight, borderRadius: layout.iconButton - spacing.unit, },
  clientInfo: { flex: 1 },
  clientName: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xxs },
  clientCity: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  clientActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  greyButton: { flex: 1, backgroundColor: colors.surface, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, alignItems: 'center' },
  greyButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary },

  notesBox: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.sm, marginTop: spacing.md },
  notesText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  infoLabel: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
  
  divider: { height: spacing.unit, backgroundColor: colors.border, marginVertical: spacing.md },
  
  boldGreenText: { fontFamily: fonts.bodyBold, color: colors.green },
  
  paymentMethodRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  orangeDot: { width: spacing.xs, height: spacing.xs, borderRadius: borderRadius.sm - spacing.xxs, backgroundColor: colors.orange, marginRight: spacing.xs },
  paymentMethodText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: spacing.unit, borderTopColor: colors.border },
  actionButton: { height: layout.buttonHeight, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.background },

  declineButton: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: spacing.unit,
    borderColor: colors.error,
  },
  declineButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.error,
  },
});
