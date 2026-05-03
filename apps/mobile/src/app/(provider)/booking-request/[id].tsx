import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';
import { API } from '../../../utils/api';
import { bookingStatus, bookingStatusLabel } from '../../../utils/booking-status';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';

export default function BookingRequestScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { lang, t } = useLanguage();

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API}/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        setError(t('errorUnknown'));
        return;
      }

      const data: any = await res.json();
      setBooking(data.data ?? data);
    } catch (err) {
      console.log('Error loading booking:', err);
      setError(t('errorUnknown'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API}/bookings/${id}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        router.replace(`/(provider)/appointments/${id}`);
      } else {
        let msg = t('errorUnknown');
        try {
          const j: any = await res.json();
          msg = j?.message || msg;
        } catch {}
        Alert.alert(t('error'), msg);
        await loadBooking();
      }
    } catch (err) {
      console.log('Accept error:', err);
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
              const token = await tokenStorage.getAccessToken();
              const res = await fetch(`${API}/bookings/${id}/decline`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (res.ok) {
                router.replace('/(provider)/calendar');
              } else {
                let msg = t('errorUnknown');
                try {
                  const j: any = await res.json();
                  msg = j?.message || msg;
                } catch {}
                Alert.alert(t('error'), msg);
                await loadBooking();
              }
            } catch (err) {
              console.log('Decline error:', err);
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
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API}/chat/conversations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      if (res.ok) {
        const data = await res.json();
        const conversationId = data.data?.id ?? data.id;
        router.push(`/(shared)/chat/${conversationId}` as any);
      }
    } catch {}
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
    const label = bookingStatusLabel(booking.status);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
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
                  <Feather name="map-pin" size={14} color={colors.textSecondary} />
                  <Text style={styles.locationText}>{booking.address.city}</Text>
                </View>
              )}
              <Text style={styles.bookingsCount}>{t('bookingRequestPrevious')}: {booking.client.totalBookings || 0}</Text>
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleMessage}>
              <Feather name="message-circle" size={18} color={colors.primary} style={styles.actionBtnIcon} />
              <Text style={styles.actionBtnText}>{t('profileMessage')}</Text>
            </TouchableOpacity>
            <View style={{ width: spacing.md }} />
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <Feather name="phone" size={18} color={colors.primary} style={styles.actionBtnIcon} />
              <Text style={styles.actionBtnText}>{t('appointmentsCall')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DETAILS CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('appointmentsDetail')}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('bookingServices')}</Text>
            <Text style={styles.detailValue}>{booking.services?.map((s: any) => s.name).join(', ')}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('appointmentsDate')}</Text>
            <View style={styles.detailValueRow}>
              <Feather name="calendar" size={14} color={colors.textPrimary} style={{ marginRight: 4 }} />
              <Text style={styles.detailValue}>{dateStr} · </Text>
              <Feather name="clock" size={14} color={colors.textPrimary} style={{ marginRight: 4 }} />
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
  safeContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { fontFamily: fonts.body, color: colors.error, marginBottom: spacing.md },
  backButtonCenter: { padding: spacing.md, backgroundColor: '#F5F5F5', borderRadius: 8 },
  backButtonText: { fontFamily: fonts.bodyBold },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: fonts.heading, fontSize: 18, color: colors.primary },
  
  badgePending: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgePendingText: { color: '#E65100', fontFamily: fonts.bodyBold, fontSize: 12 },
  badgeConfirmed: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeConfirmedText: { color: '#2E7D32', fontFamily: fonts.bodyBold, fontSize: 12 },
  badgeCancelled: { backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeCancelledText: { color: '#C62828', fontFamily: fonts.bodyBold, fontSize: 12 },
  badgeDefault: { backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeDefaultText: { color: '#666', fontFamily: fonts.bodyBold, fontSize: 12 },

  scrollContent: { flex: 1 },
  scrollInner: { padding: spacing.lg, paddingBottom: 40 },

  alertBanner: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  alertBannerTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#E65100', marginBottom: 2 },
  alertBannerSub: { fontFamily: fonts.body, fontSize: 14, color: '#6B6B6B' },

  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.primary, marginBottom: spacing.md },

  clientProfileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  clientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  clientAvatarText: { fontFamily: fonts.heading, fontSize: 24, color: colors.primary },
  clientInfoCol: { flex: 1 },
  clientName: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  locationText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginLeft: 4 },
  bookingsCount: { fontFamily: fonts.body, fontSize: 14, color: '#6B6B6B' },

  actionButtonsRow: { flexDirection: 'row' },
  actionBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnIcon: { marginRight: 6 },
  actionBtnText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  detailLabel: { fontFamily: fonts.body, fontSize: 14, color: '#6B6B6B', flex: 1 },
  detailValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary, flex: 2, textAlign: 'right' },
  detailValueRow: { flexDirection: 'row', alignItems: 'center', flex: 2, justifyContent: 'flex-end' },
  
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  
  totalLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  totalValue: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.primary },

  notesCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  notesLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#6B6B6B', marginBottom: 4 },
  notesText: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 14, color: '#555' },

  bottomActions: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  acceptBtn: {
    backgroundColor: colors.coral,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  acceptBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.background },
  declineBtn: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.error },

  statusCard: {
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusCardConfirmed: { backgroundColor: '#E8F5E9' },
  statusCardCancelled: { backgroundColor: '#FFEBEE' },
  statusCardText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  statusCardTextConfirmed: { color: '#2E7D32' },
  statusCardTextCancelled: { color: '#C62828' },
});
