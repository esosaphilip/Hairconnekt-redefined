import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { API } from '../../../utils/api';
import { bookingStatus } from '../../../utils/booking-status';
// BUG 26: local bundled placeholder instead of external URL
import avatarPlaceholder from '../../../assets/avatar-placeholder.png';

export default function AppointmentDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setErrorVisible(false);
      const token = await tokenStorage.getAccessToken();
      const response = await axios.get(`${API}/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBooking(response.data);
    } catch (err: any) {
      setErrorMessage(mapHttpError(err.response?.status));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const calculateDuration = () => {
    if (!booking?.services) return 0;
    return booking.services.reduce((acc: number, s: any) => acc + (s.durationMin || 0), 0);
  };

  const renderTimeline = () => {
    if (!booking) return null;
    
    const status = booking.status;
    const isPending = bookingStatus(status) === 'pending';
    const isConfirmed = bookingStatus(status) === 'confirmed' || bookingStatus(status) === 'in_progress' || bookingStatus(status) === 'completed';
    const isInProgress = bookingStatus(status) === 'in_progress' || bookingStatus(status) === 'completed';
    const isCompleted = bookingStatus(status) === 'completed';

    const renderNode = (reached: boolean, label: string, isLast: boolean) => (
      <View style={styles.timelineRow}>
        <View style={styles.timelineGraphic}>
          <View style={[styles.timelineCircle, reached ? styles.timelineCircleReached : styles.timelineCirclePending]}>
            <Feather name="check" size={14} color={reached ? colors.surface : colors.textTertiary} />
          </View>
          {!isLast && <View style={[styles.timelineLine, reached ? styles.timelineLineReached : styles.timelineLinePending]} />}
        </View>
        <Text style={[styles.timelineLabel, reached ? styles.timelineLabelReached : styles.timelineLabelPending]}>{label}</Text>
      </View>
    );

    return (
      <View style={styles.timelineContainer}>
        {renderNode(isConfirmed, isPending ? 'Ausstehend' : 'Bestätigt', false)}
        {renderNode(isInProgress, 'In Bearbeitung', false)}
        {renderNode(isCompleted, 'Abgeschlossen', true)}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Termindetails</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color={colors.coral} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Termindetails</Text>
          <View style={{ width: 40 }} />
        </View>
        <GermanErrorBanner visible={true} message={errorMessage || 'Termin konnte nicht geladen werden.'} />
        <TouchableOpacity style={styles.retryButton} onPress={fetchBookingDetails}>
          <Text style={styles.retryButtonText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const provider = booking.provider || {};
  const user = provider.user || {};
  const providerName = provider.businessName || (user.firstName ? `${user.firstName} ${user.lastName}` : 'Anbieter');
  const avatarUri = user.avatarUrl as string | undefined;
  const city = user.city as string | undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Termindetails</Text>
        <View style={{ width: 40 }} />
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Timeline Section */}
        {renderTimeline()}

        {/* Provider Logic Card */}
        <View style={styles.card}>
          <View style={styles.providerHeader}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.providerAvatar} />
            ) : (
              <Image source={avatarPlaceholder} style={styles.providerAvatar} />
            )}
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{providerName}</Text>
              {!!city && (
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={14} color={colors.textSecondary} />
                  <Text style={styles.locationText}>{city}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.providerActions}>
            <TouchableOpacity 
              style={styles.providerBtn} 
              onPress={() => router.push(`/(client)/chat/${provider.id}` as any)}
            >
              <Feather name="message-circle" size={18} color={colors.primary} />
              <Text style={styles.providerBtnText}>Nachricht</Text>
            </TouchableOpacity>
            <View style={styles.btnDivider} />
            <TouchableOpacity 
              style={styles.providerBtn}
              onPress={() => {
                if (provider.phone) {
                  Linking.openURL(`tel:${provider.phone}`);
                }
              }}
            >
              <Feather name="phone" size={18} color={colors.primary} />
              <Text style={styles.providerBtnText}>Anrufen</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Termininfo Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Termininfo</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service</Text>
            <Text style={styles.infoValue}>{booking.services?.map((s: any) => s.name).join(', ')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Datum & Zeit</Text>
            <View style={styles.dateValueRow}>
              <Feather name="calendar" size={14} color={colors.textPrimary} style={styles.mr} />
              <Text style={styles.infoValue}>{formatDate(booking.scheduledDate)}</Text>
              <Text style={styles.infoValueDecorator}> • </Text>
              <Feather name="clock" size={14} color={colors.textPrimary} style={styles.mr} />
              <Text style={styles.infoValue}>{booking.scheduledTime}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dauer</Text>
            <Text style={styles.infoValue}>{(() => { const mins = calculateDuration(); const h = Math.floor(mins / 60); const m = mins % 60; return h > 0 ? `${h} Std.${m > 0 ? ` ${m} Min.` : ''}` : `${m} Min.`; })()}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.totalLabel}>Gesamtpreis</Text>
            <Text style={styles.totalValue}>€{booking.totalPrice || 0},00</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Buchungsnummer</Text>
            <Text style={styles.bookingNumber}>{booking.bookingNumber || 'HC-N/A'}</Text>
          </View>
        </View>

      </ScrollView>

      {/* Conditional Footer Rendering */}
      {(bookingStatus(booking.status) === 'pending' ||
        bookingStatus(booking.status) === 'confirmed') && (
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => router.push(
              `/(client)/appointments/reschedule/${booking.id}` 
            )}
          >
            <Text style={styles.outlineBtnText}>Termin verschieben</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.textBtn}
            onPress={() => router.push(`/(client)/appointments/cancel/${booking.id}` as any)}
          >
            <Text style={styles.textBtnText}>Termin stornieren</Text>
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'COMPLETED' && (
        <View style={styles.footerContainer}>
          <TouchableOpacity 
            style={styles.primaryBtn}
            onPress={() => router.push(`/(client)/review/${booking.id}` as any)}
          >
            <Text style={styles.primaryBtnText}>Bewertung schreiben</Text>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryButton: { alignSelf: 'center', marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.coral, borderRadius: 8 },
  retryButtonText: { color: colors.surface, fontFamily: fonts.bodyBold },
  mr: { marginRight: 4 },
  
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 60,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  topBarTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  
  scrollContent: { paddingBottom: 100 },

  timelineContainer: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xl,
  },
  timelineRow: { flexDirection: 'row' },
  timelineGraphic: { alignItems: 'center', width: 24, marginRight: spacing.md },
  timelineCircle: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  timelineCircleReached: { backgroundColor: '#2E7D32' },
  timelineCirclePending: { backgroundColor: '#EEEEEE' },
  timelineLine: { width: 2, height: 40, position: 'absolute', top: 24 },
  timelineLineReached: { backgroundColor: '#2E7D32' },
  timelineLinePending: { backgroundColor: '#EEEEEE' },
  timelineLabel: { fontFamily: fonts.bodyBold, fontSize: 16, marginTop: 2, height: 64 },
  timelineLabelReached: { color: colors.textPrimary },
  timelineLabelPending: { color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.md,
    ...shadows.card,
    elevation: 4,
  },
  providerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  providerAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.gold, marginRight: spacing.md },
  providerInfo: { flex: 1 },
  providerName: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.primary, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary, marginLeft: 4 },
  
  providerActions: { flexDirection: 'row', backgroundColor: '#F9F9F9', borderRadius: 8, height: 48 },
  providerBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnDivider: { width: 1, backgroundColor: colors.border, height: '60%', alignSelf: 'center' },
  providerBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary, marginLeft: 8 },

  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.primary, marginBottom: spacing.lg },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  infoLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, maxWidth: '60%', textAlign: 'right' },
  dateValueRow: { flexDirection: 'row', alignItems: 'center' },
  infoValueDecorator: { color: colors.textTertiary, marginHorizontal: 4 },
  
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm, marginBottom: spacing.md },
  
  totalLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
  totalValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
  bookingNumber: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },

  footerContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  outlineBtn: {
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  outlineBtnText: { fontFamily: fonts.heading, fontSize: 18, color: colors.primary },
  textBtn: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#C62828' },
  primaryBtn: {
    height: 56,
    backgroundColor: colors.coral,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: { fontFamily: fonts.heading, fontSize: 18, color: colors.surface },
});
