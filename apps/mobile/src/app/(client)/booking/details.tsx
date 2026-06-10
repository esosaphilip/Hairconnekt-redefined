import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { ApiError, apiJson } from '@/services/apiClient';

type ProviderProfile = {
  businessName?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type ProviderService = {
  id: string;
  name: string;
};

type ProviderResponse = ProviderProfile | { data?: ProviderProfile | null };
type ProviderServicesResponse = ProviderService[] | { data?: ProviderService[] | null };

type BookingResult = {
  id: string;
  bookingNumber?: string;
};

type BookingCreateResponse =
  | BookingResult
  | {
      booking?: BookingResult | null;
      data?: BookingResult | { booking?: BookingResult | null } | null;
    };

const normalizeParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? '' : value ?? '';

const isProviderProfile = (value: unknown): value is ProviderProfile =>
  typeof value === 'object' && value !== null;

const isBookingResult = (value: unknown): value is BookingResult =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string';

const extractProvider = (payload: ProviderResponse): ProviderProfile | null => {
  if ('data' in payload) {
    return isProviderProfile(payload.data) ? payload.data : null;
  }
  return isProviderProfile(payload) ? payload : null;
};

const extractServices = (payload: ProviderServicesResponse): ProviderService[] =>
  Array.isArray(payload) ? payload : payload.data ?? [];

const extractBookingResult = (
  payload: BookingCreateResponse,
): BookingResult | null => {
  if ('booking' in payload && payload.booking) {
    return payload.booking;
  }
  if ('data' in payload) {
    const data = payload.data;
    if (!data) {
      return null;
    }
    if ('booking' in data && data.booking) {
      return data.booking;
    }
    return isBookingResult(data) ? data : null;
  }
  return isBookingResult(payload) ? payload : null;
};

export default function BookingDetails() {
  const router = useRouter();
  const { providerId, selectedServiceIds, totalPrice, date, time } = useLocalSearchParams();
  const { t, lang } = useLanguage();

  const providerIdValue = normalizeParam(providerId);
  const selectedServiceIdsValue = normalizeParam(selectedServiceIds);
  const dateValue = normalizeParam(date);
  const timeValue = normalizeParam(time);
  const totalPriceValue = normalizeParam(totalPrice);
  
  const [ids, setIds] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [clientNotes, setClientNotes] = useState('');
  
  const [providerName, setProviderName] = useState('');
  const [serviceNames, setServiceNames] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (selectedServiceIdsValue) {
      const parsed = selectedServiceIdsValue
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      setIds(parsed);
    }
    
    // Fetch names for UI gracefully
    const fetchNames = async () => {
      try {
        const [providerPayload, servicesPayload] = await Promise.all([
          apiJson<ProviderResponse>(`/providers/${providerIdValue}`, {
            auth: true,
            retryCount: 1,
          }),
          apiJson<ProviderServicesResponse>(
            `/providers/${providerIdValue}/services`,
            {
              auth: true,
              retryCount: 1,
            },
          ),
        ]);

        const provData = extractProvider(providerPayload);
        const servData = extractServices(servicesPayload);
        
        if (provData?.businessName) {
          setProviderName(provData.businessName);
        } else if (provData?.user) {
          const firstName = provData.user.firstName ?? '';
          const lastName = provData.user.lastName ?? '';
          const fullName = `${firstName} ${lastName}`.trim();
          setProviderName(fullName || t('providerGeneric'));
        } else {
          setProviderName(t('providerGeneric'));
        }
        
        const activeIds = typeof selectedServiceIdsValue === 'string'
          ? selectedServiceIdsValue.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const matchedServices = servData.filter((service) =>
          activeIds.includes(service.id),
        );
        if (matchedServices.length > 0) {
          setServiceNames(matchedServices.map((service) => service.name).join(', '));
        } else {
          setServiceNames(t('selectedServicesGeneric'));
        }
      } catch (err) {
        setProviderName(t('providerGeneric'));
        setServiceNames(t('selectedServicesGeneric'));
      }
    };
    
    fetchNames();
  }, [providerIdValue, selectedServiceIdsValue]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleBookNow = async () => {
    Keyboard.dismiss();
    try {
      setIsLoading(true);
      setErrorVisible(false);

      const bookingData = {
        providerId: providerIdValue,
        serviceIds: ids,
        scheduledDate: dateValue,
        scheduledTime: timeValue,
        isMobile,
        clientNotes
      };

      const payload = await apiJson<BookingCreateResponse>('/bookings', {
        auth: true,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const bookingResult = extractBookingResult(payload);
      if (!bookingResult) {
        throw new ApiError('Booking response invalid', 500, payload);
      }
      
      router.replace({ 
        pathname: '/(client)/booking/confirmation', 
        params: { booking: JSON.stringify(bookingResult) }
      });
      
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 409) {
        setErrorMessage(t('bookingSlotTaken'));
      } else if (status === 400) {
        const backendMessage =
          error instanceof ApiError &&
          error.body &&
          typeof error.body === 'object' &&
          'message' in error.body
            ? (error.body as { message?: string | string[] }).message
            : undefined;
        setErrorMessage(
          Array.isArray(backendMessage)
            ? backendMessage[0]
            : backendMessage ??
                t('bookingInvalidSlot')
        );
      } else {
        setErrorMessage(mapHttpError(status, undefined, lang));
      }
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('bookingDetails')}</Text>
          <Text style={styles.headerSubtitle}>{t('bookingStep')} 3 {t('bookingOf')} 4</Text>
        </View>
      </View>
      
      {/* 4 Segment Step Indicator */}
      <View style={styles.stepContainer}>
        <View style={[styles.stepBar, styles.stepActive]} />
        <View style={[styles.stepBar, styles.stepActive]} />
        <View style={[styles.stepBar, styles.stepActive]} />
        <View style={styles.stepBar} />
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardProviderTitle}>{providerName || t('loading')}</Text>
            <Text style={styles.cardServicesText}>{serviceNames || t('loading')}</Text>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Feather name="calendar" size={18} color={colors.textSecondary} />
              <Text style={styles.summaryText}>{formatDate(dateValue)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Feather name="clock" size={18} color={colors.textSecondary} />
              <Text style={styles.summaryText}>
                {timeValue}
                {t('timeSuffix')}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={[styles.summaryRow, { justifyContent: 'space-between', marginTop: spacing.none }]}>
              <Text style={styles.totalLabel}>{t('bookingTotal')}</Text>
              <Text style={styles.totalValue}>€{formatAmount(totalPriceValue, lang)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>{t('bookingMobileService')}</Text>
                <Text style={styles.toggleSubtitle}>{t('bookingMobileSub')}</Text>
              </View>
              <Switch
                value={isMobile}
                onValueChange={setIsMobile}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>

          <View style={styles.notesContainer}>
            <Text style={styles.inputLabel}>{t('bookingNotes')}</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder={t('bookingNotesPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={clientNotes}
              onChangeText={setClientNotes}
              maxLength={500}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={styles.charCounter}>{clientNotes.length}/500</Text>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Feather name="lock" size={18} color={colors.textPrimary} style={{ marginRight: spacing.sm }} />
              <Text style={styles.cardProviderTitle}>{t('bookingPayment')}</Text>
            </View>
            <Text style={styles.paymentText}>{t('bookingPaymentMethod')}</Text>
            <Text style={styles.toggleSubtitle}>{t('bookingPaymentSub')}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleBookNow} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('bookingBookNow')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backButton: { marginRight: spacing.md },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.textPrimary },
  headerSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  
  stepContainer: { flexDirection: 'row', gap: spacing.xxs + spacing.xxxs, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  stepBar: { flex: 1, height: spacing.xxs, backgroundColor: colors.border, borderRadius: borderRadius.xs },
  stepActive: { backgroundColor: colors.coral },
  
  keyboardContainer: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
    elevation: 3,
  },
  cardProviderTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xs },
  cardServicesText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.sm },
  divider: { height: spacing.unit, backgroundColor: colors.border, marginVertical: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.s },
  summaryText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  totalLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  totalValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.primary },
  
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleTitle: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  toggleSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xxxs },
  
  notesContainer: { marginBottom: spacing.lg },
  inputLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.sm },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: spacing.unit,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    height: layout.textAreaHeight,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  charCounter: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xs },
  
  paymentText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  
  footer: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: spacing.unit, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg },
  primaryButton: {
    backgroundColor: colors.coral,
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
});
