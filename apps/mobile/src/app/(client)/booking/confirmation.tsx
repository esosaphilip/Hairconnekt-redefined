import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';

export default function BookingConfirmation() {
  const router = useRouter();
  const { booking: bookingParam } = useLocalSearchParams();
  
  let booking: any = null;
  try {
    booking = bookingParam ? JSON.parse(bookingParam as string) : null;
  } catch (e) {
    console.error('Failed to parse booking data', e);
  }

  // Fallback safe values
  const bookingNumber = booking?.bookingNumber || 'HC-20260320-0000';
  const provider = booking?.provider || {};
  const user = provider?.user || {};
  const providerName = provider?.businessName || (user?.firstName ? `${user.firstName} ${user.lastName}` : 'Anbieter');
  const city = user?.city || 'Düsseldorf';
  const avatarUrl = user?.avatarUrl || 'https://via.placeholder.com/150';
  
  const services = booking?.services || [];
  const serviceNames = services.length > 0 ? services.map((s: any) => s.name).join(', ') : 'Gebuchte Services';
  
  // Compute approximate duration if available, else static fallback
  let durationInMins = 0;
  if (services.length > 0) {
    durationInMins = services.reduce((acc: number, s: any) => acc + (s.durationMinutes || 0), 0);
  }
  const durationText = durationInMins > 0 ? `${Math.floor(durationInMins / 60)} Std ${durationInMins % 60} Min` : 'Ca. 2-3 Stunden';
  
  const dateStr = booking?.scheduledDate || new Date().toISOString().split('T')[0];
  const timeStr = booking?.scheduledTime || '12:00';
  const totalPrice = booking?.totalPrice || 0;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Success Header */}
        <View style={styles.header}>
          <View style={styles.successCircle}>
            <Feather name="check" size={40} color={colors.surface} />
          </View>
          <Text style={styles.successTitle}>Termin bestätigt! 🎉</Text>
          <Text style={styles.bookingNumberText}>#{bookingNumber}</Text>
        </View>

        {/* Booking Summary Card */}
        <View style={styles.card}>
          <View style={styles.providerInfoRow}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View>
              <Text style={styles.providerNameText}>{providerName}</Text>
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={14} color={colors.textSecondary} />
                <Text style={styles.locationText}>{city}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service</Text>
            <Text style={styles.infoValue}>{serviceNames}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Datum & Zeit</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoValue}>{formatDate(dateStr)}</Text>
              <Text style={styles.infoValue}>{timeStr} Uhr</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dauer</Text>
            <Text style={styles.infoValue}>{durationText}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.totalLabel}>Gesamtpreis</Text>
            <Text style={styles.totalValue}>€{totalPrice},00</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Zahlungsart</Text>
            <Text style={styles.infoValue}>Vor Ort bar zahlen</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Buchungsnummer</Text>
            <Text style={styles.bookingNumberMono}>{bookingNumber}</Text>
          </View>
        </View>

        {/* Next Steps Section */}
        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>WAS KOMMT ALS NÄCHSTES?</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}><Text style={styles.stepNumber}>1</Text></View>
            <View style={styles.stepTexts}>
              <Text style={styles.stepMainText}>Bestätigung per E-Mail</Text>
              <Text style={styles.stepSubText}>Sofort</Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}><Text style={styles.stepNumber}>2</Text></View>
            <View style={styles.stepTexts}>
              <Text style={styles.stepMainText}>Anbieter bestätigt deinen Termin</Text>
              <Text style={styles.stepSubText}>Innerhalb von 1 Stunde</Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}><Text style={styles.stepNumber}>3</Text></View>
            <View style={styles.stepTexts}>
              <Text style={styles.stepMainText}>Erinnerung 24h vor dem Termin</Text>
              <Text style={styles.stepSubText}>Automatisch</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.outlineButton}
          onPress={() => {
            const pid = provider?.id || 'unknown';
            router.push({ pathname: '/(client)/chat/[id]' as any, params: { id: pid }});
          }}
        >
          <Text style={styles.outlineButtonText}>Nachricht senden</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.replace('/(client)/appointments/')}
        >
          <Text style={styles.primaryButtonText}>Fertig</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: 150 },
  
  header: { alignItems: 'center', marginBottom: spacing.xl },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  successTitle: { fontFamily: fonts.heading, fontSize: 28, color: colors.primary, textAlign: 'center', marginBottom: spacing.xs },
  bookingNumberText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
  
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.card,
    elevation: 4,
  },
  providerInfoRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.gold, marginRight: spacing.md },
  providerNameText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  infoLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textSecondary, flex: 1 },
  infoValue: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary, flex: 1, textAlign: 'right' },
  
  totalLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  totalValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.primary },
  
  bookingNumberMono: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right', letterSpacing: 0.5 },
  
  nextStepsContainer: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.card, elevation: 2 },
  nextStepsTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.lg },
  
  stepItem: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  stepNumber: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
  stepTexts: { flex: 1 },
  stepMainText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  stepSubText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: spacing.md,
  },
  outlineButton: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
});
