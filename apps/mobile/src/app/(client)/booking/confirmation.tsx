import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { apiJson } from '@/services/apiClient';
import { GermanErrorBanner } from '@/components/GermanErrorBanner';
import { debugError } from '@/utils/logger';

const DEFAULT_AVATAR = require('../../../assets/avatar-placeholder.png');

type BookingConfirmationService = {
  id: string;
  name: string;
  durationMinutes?: number;
};

type BookingConfirmationProvider = {
  businessName?: string;
  userId?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    avatarUrl?: string;
  };
};

type BookingConfirmationPayload = {
  bookingNumber?: string;
  provider?: BookingConfirmationProvider;
  services?: BookingConfirmationService[];
  scheduledDate?: string;
  scheduledTime?: string;
  totalPrice?: number;
};

type ConversationCreateResponse = {
  id?: string;
  data?: {
    id?: string;
  };
};

export default function BookingConfirmation() {
  const router = useRouter();
  const { booking: bookingParam } = useLocalSearchParams();
  const { t, lang } = useLanguage();
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  let booking: BookingConfirmationPayload | null = null;
  try {
    booking = bookingParam
      ? (JSON.parse(String(bookingParam)) as BookingConfirmationPayload)
      : null;
  } catch (e) {
    debugError('Failed to parse booking confirmation data', e);
  }

  // Fallback safe values
  const bookingNumber = booking?.bookingNumber || 'HC-20260320-0000';
  const provider = booking?.provider || {};
  const user = provider?.user || {};
  const providerName = provider?.businessName || (user?.firstName ? `${user.firstName} ${user.lastName}` : t('providerGeneric'));
  const city = user?.city || t('countryDefault');
  const avatarSource = user?.avatarUrl
    ? { uri: user.avatarUrl }
    : DEFAULT_AVATAR;
  
  const services = booking?.services || [];
  const serviceNames = services.length > 0
    ? services.map((service) => service.name).join(', ')
    : t('bookedServices');
  
  // Compute approximate duration if available, else static fallback
  let durationInMins = 0;
  if (services.length > 0) {
    durationInMins = services.reduce(
      (acc, service) => acc + (service.durationMinutes || 0),
      0,
    );
  }
  const durationText = durationInMins > 0 ? `${Math.floor(durationInMins / 60)} ${t('appointmentsHours')} ${durationInMins % 60} ${t('appointmentsMinutes')}` : t('approxDuration');
  
  const dateStr = booking?.scheduledDate || new Date().toISOString().split('T')[0];
  const timeStr = booking?.scheduledTime || '12:00';
  const totalPrice = booking?.totalPrice || 0;

  const openChat = async () => {
    const recipientUserId = provider?.userId || provider?.user?.id;
    if (!recipientUserId) {
      setErrorMessage(t('errorUnknown'));
      setErrorVisible(true);
      return;
    }

    try {
      setErrorVisible(false);
      const data = await apiJson<ConversationCreateResponse>('/chat/conversations', {
        auth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: recipientUserId }),
      });
      const conversationId = data?.data?.id ?? data?.id;
      if (!conversationId) {
        setErrorMessage(t('errorUnknown'));
        setErrorVisible(true);
        return;
      }

      router.push(`/(shared)/chat/${conversationId}` as any);
    } catch {
      setErrorMessage(t('errorUnknown'));
      setErrorVisible(true);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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
          <Text style={styles.successTitle}>{t('bookingConfirmed')}</Text>
          <Text style={styles.bookingNumberText}>#{bookingNumber}</Text>
        </View>

        {/* Booking Summary Card */}
        <View style={styles.card}>
          <View style={styles.providerInfoRow}>
            <Image source={avatarSource} style={styles.avatar} />
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
            <Text style={styles.infoLabel}>{t('bookingServices')}</Text>
            <Text style={styles.infoValue}>{serviceNames}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('bookingSelectDate')}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoValue}>{formatDate(dateStr)}</Text>
              <Text style={styles.infoValue}>{timeStr}{t('timeSuffix')}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('appointmentsDuration')}</Text>
            <Text style={styles.infoValue}>{durationText}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.totalLabel}>{t('appointmentsTotalPrice')}</Text>
            <Text style={styles.totalValue}>€{formatAmount(totalPrice, lang)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('bookingPayment')}</Text>
            <Text style={styles.infoValue}>{t('bookingPaymentMethod')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('bookingNumber')}</Text>
            <Text style={styles.bookingNumberMono}>{bookingNumber}</Text>
          </View>
        </View>

        {/* Next Steps Section */}
        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>{t('bookingWhatsNext')}</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}><Text style={styles.stepNumber}>1</Text></View>
            <View style={styles.stepTexts}>
              <Text style={styles.stepMainText}>{t('bookingConfirmEmail')}</Text>
              <Text style={styles.stepSubText}>{t('bookingConfirmSoon')}</Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}><Text style={styles.stepNumber}>2</Text></View>
            <View style={styles.stepTexts}>
              <Text style={styles.stepMainText}>{t('bookingProviderConfirms')}</Text>
              <Text style={styles.stepSubText}>{t('bookingWithinHour')}</Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepCircle}><Text style={styles.stepNumber}>3</Text></View>
            <View style={styles.stepTexts}>
              <Text style={styles.stepMainText}>{t('bookingReminder')}</Text>
              <Text style={styles.stepSubText}>{t('bookingAutomatic')}</Text>
            </View>
          </View>
        </View>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} />
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.outlineButton}
          onPress={openChat}
        >
          <Text style={styles.outlineButtonText}>{t('bookingSendMessage')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.replace('/(client)/appointments/')}
        >
          <Text style={styles.primaryButtonText}>{t('done')}</Text>
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
    backgroundColor: colors.green,
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
