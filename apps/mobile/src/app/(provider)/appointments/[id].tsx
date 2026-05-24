import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { tokenStorage } from '../../../utils/token-storage';
import { API } from '../../../utils/api';
import { bookingStatus, bookingStatusLabel } from '../../../utils/booking-status';
import { formatAmount } from '../../../utils/format';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError } from '@/utils/logger';

export default function ProviderAppointmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      if (id) fetchBookingDetails();
    }, [id]),
  );

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API}/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setBooking(data);
      }
    } catch (error) {
      debugError('Provider appointment detail load failed', error);
    } finally {
      setLoading(false);
    }
  };

  const openChat = async () => {
    const recipientId = booking?.client?.id as string | undefined;
    if (!recipientId) return;
    try {
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API}/chat/conversations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      if (res.ok) {
        const data = await res.json();
        const conversationId = data.data?.id ?? data.id;
        router.push(('/(shared)/chat/' + conversationId) as any);
      }
    } catch {}
  };

  const updateBookingStatus = async (action: 'start' | 'complete') => {
    try {
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API}/bookings/${id}/${action}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchBookingDetails(); // Reload data
      }
    } catch (error) {
      debugError(`Provider booking status update failed action=${action}`, error);
    }
  };

  const acceptBooking = async () => {
    try {
      setIsAccepting(true);
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API}/bookings/${id}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        fetchBookingDetails();
      } else {
        let msg = t('providerBookingAcceptError');
        try {
          const j: any = await response.json();
          msg = j?.message || msg;
        } catch {}
        Alert.alert(t('error'), msg);
        fetchBookingDetails();
      }
    } catch (error) {
      debugError('Provider appointment accept failed', error);
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
              const token = await tokenStorage.getAccessToken();
              const response = await fetch(`${API}/bookings/${id}/decline`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
              });

              if (response.ok) {
                fetchBookingDetails();
              } else {
                let msg = t('providerBookingDeclineError');
                try {
                  const j: any = await response.json();
                  msg = j?.message || msg;
                } catch {}
                Alert.alert(t('error'), msg);
                fetchBookingDetails();
              }
            } catch (error) {
              debugError('Provider appointment decline failed', error);
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
    if (bookingStatus(status) === 'pending') return '#E65100';
    if (bookingStatus(status) === 'confirmed' || bookingStatus(status) === 'in_progress') return '#1976D2';
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
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('providerAppointmentDetailsTitle')}</Text>
          <View style={{ width: 24 }} />
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
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('providerAppointmentDetailsTitle')}</Text>
        <View style={{ width: 24 }} />
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
              {booking.services?.map((s: any) => s.name).join(', ') || 'Service'}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  scrollContainer: { padding: spacing.lg, paddingBottom: 100 },

  topInfo: { alignItems: 'center', marginBottom: spacing.xl },
  statusChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: spacing.sm },
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
  clientAvatarRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  clientAvatar: { width: 60, height: 60, borderRadius: 30 },
  clientInfo: { flex: 1 },
  clientName: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: 4 },
  clientCity: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  clientActions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  greyButton: { flex: 1, backgroundColor: colors.surface, paddingVertical: 12, borderRadius: borderRadius.sm, alignItems: 'center' },
  greyButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary },

  notesBox: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.sm, marginTop: spacing.md },
  notesText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  infoLabel: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
  
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  
  boldGreenText: { fontFamily: fonts.bodyBold, color: '#2E7D32' },
  
  paymentMethodRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  orangeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange, marginRight: 8 },
  paymentMethodText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.background },

  declineButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  declineButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.error,
  },
});
