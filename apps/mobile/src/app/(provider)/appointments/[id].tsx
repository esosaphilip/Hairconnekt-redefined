import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { tokenStorage } from '../../../utils/token-storage';
import { API } from '../../../utils/api';

export default function ProviderAppointmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBookingDetails();
    }
  }, [id]);

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
      console.log('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
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
      console.log(`Error updating booking status to ${action}:`, error);
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
        let msg = 'Buchung konnte nicht bestätigt werden.';
        try {
          const j: any = await response.json();
          msg = j?.message || msg;
        } catch {}
        Alert.alert('Fehler', msg);
        fetchBookingDetails();
      }
    } catch (error) {
      console.log('Error accepting booking:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const declineBooking = () => {
    Alert.alert(
      'Buchung ablehnen',
      'Möchtest du diese Buchung wirklich ablehnen?',
      [
        { text: 'Zurück', style: 'cancel' },
        {
          text: 'Ablehnen',
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
                let msg = 'Buchung konnte nicht abgelehnt werden.';
                try {
                  const j: any = await response.json();
                  msg = j?.message || msg;
                } catch {}
                Alert.alert('Fehler', msg);
                fetchBookingDetails();
              }
            } catch (error) {
              console.log('Error declining booking:', error);
            } finally {
              setIsDeclining(false);
            }
          },
        },
      ],
    );
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'PENDING': return 'Ausstehend';
      case 'CONFIRMED': return 'Bestätigt';
      case 'IN_PROGRESS': return 'Aktiv';
      case 'COMPLETED': return 'Abgeschlossen';
      case 'CANCELLED': return 'Storniert';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    // Provider view uses BLUE for status
    if (status === 'PENDING') return '#E65100';
    if (status === 'CONFIRMED' || status === 'IN_PROGRESS') return '#1976D2'; 
    if (status === 'COMPLETED') return colors.green;
    if (status === 'CANCELLED') return colors.error;
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
          <Text style={styles.headerTitle}>Termindetails</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ fontFamily: fonts.body, color: colors.textSecondary }}>Termin nicht gefunden</Text>
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
        <Text style={styles.headerTitle}>Termindetails</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Status & Booking Number */}
        <View style={styles.topInfo}>
          <View style={[styles.statusChip, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusChipText}>{getStatusText(booking.status)}</Text>
          </View>
          <Text style={styles.bookingNumber}>Buchungsnummer: {booking.bookingNumber || `HC-${booking.id.substring(0,4).toUpperCase()}`}</Text>
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
                {booking.client?.city || booking.client?.address?.city || 'Stadt unbekannt'}
              </Text>
            </View>
          </View>

          <View style={styles.clientActions}>
            <TouchableOpacity style={styles.greyButton} onPress={() => router.push('/(provider)/chat')}>
              <Text style={styles.greyButtonText}>Nachricht</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.greyButton} 
              onPress={() => booking.client?.phone ? Linking.openURL(`tel:${booking.client.phone}`) : null}
            >
              <Text style={styles.greyButtonText}>Anrufen</Text>
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
          <Text style={styles.cardTitle}>Termininfo</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service</Text>
            <Text style={styles.infoValue}>
              {booking.services?.map((s: any) => s.name).join(', ') || 'Service'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              <Feather name="calendar" size={14} color={colors.textSecondary} /> Datum
            </Text>
            <Text style={styles.infoValue}>
              {new Date(booking.scheduledDate).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              <Feather name="clock" size={14} color={colors.textSecondary} /> Zeit
            </Text>
            <Text style={styles.infoValue}>{booking.scheduledTime} Uhr</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service-Preis</Text>
            <Text style={styles.infoValue}>€{booking.totalPrice}</Text>
          </View>

          {(booking.platformFeeAmount > 0) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plattform-Gebühr ({booking.platformFeePercent}%)</Text>
              <Text style={styles.infoValue}>-€{booking.platformFeeAmount}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, styles.boldGreenText]}>
              <Feather name="briefcase" size={16} color={colors.green} /> Deine Auszahlung
            </Text>
            <Text style={[styles.infoValue, styles.boldGreenText]}>€{booking.providerPayout || booking.totalPrice}</Text>
          </View>

          <View style={styles.paymentMethodRow}>
            <View style={styles.orangeDot} />
            <Text style={styles.paymentMethodText}>Zahlung bei Abschluss</Text>
          </View>

        </View>

      </ScrollView>

      {/* Action Buttons Footer */}
      {booking.status === 'PENDING' && (
        <View style={styles.footer}>
          <PrimaryButton
            label="Buchung annehmen"
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
              <Text style={styles.declineButtonText}>Ablehnen</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'CONFIRMED' && (
        <View style={styles.footer}>
          <PrimaryButton 
            label="Termin starten" 
            onPress={() => updateBookingStatus('start')}
            variant="filled"
          />
        </View>
      )}
      
      {booking.status === 'IN_PROGRESS' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.green }]} 
            onPress={() => updateBookingStatus('complete')}
          >
            <Text style={styles.actionButtonText}>Termin abschließen</Text>
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
