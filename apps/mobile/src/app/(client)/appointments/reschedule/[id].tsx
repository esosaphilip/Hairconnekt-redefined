import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../../theme';
import { GermanErrorBanner } from '../../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../../utils/error-messages';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiJson } from '@/services/apiClient';

type BookingProviderInfo = {
  id: string;
  businessName?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type BookingServiceInfo = {
  id?: string;
  name: string;
};

type RescheduleBooking = {
  id: string;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  provider?: BookingProviderInfo | null;
  services?: BookingServiceInfo[] | null;
};

type BookingDetailResponse = RescheduleBooking | { data?: RescheduleBooking | null };

type AvailableSlot = {
  time?: string | null;
  startTime?: string | null;
  available?: boolean | null;
  isAvailable?: boolean | null;
};

type SlotsResponse =
  | {
      slots?: AvailableSlot[] | null;
      data?: AvailableSlot[] | null;
    }
  | {
      data?: {
        slots?: AvailableSlot[] | null;
      } | null;
    };

export default function RescheduleAppointment() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  const timeSuffix = lang === 'de' ? ' Uhr' : '';

  // Booking Data
  const [booking, setBooking] = useState<RescheduleBooking | null>(null);
  const [isBookingLoading, setIsBookingLoading] = useState(true);

  // Form State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  
  // Slots Data
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  
  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calendar Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long' }).format(currentMonth);
  const daysCount = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  
  const dayNames = [
    t('availabilityDayMon'),
    t('availabilityDayTue'),
    t('availabilityDayWed'),
    t('availabilityDayThu'),
    t('availabilityDayFri'),
    t('availabilityDaySat'),
    t('availabilityDaySun'),
  ];

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const extractBooking = (
    payload: BookingDetailResponse,
  ): RescheduleBooking | null => {
    const withData = payload as { data?: RescheduleBooking | null };
    return withData.data ?? (payload as RescheduleBooking);
  };

  const extractSlots = (payload: SlotsResponse): AvailableSlot[] => {
    const direct = payload as { slots?: AvailableSlot[] | null; data?: unknown };
    if (Array.isArray(direct.slots)) return direct.slots;
    if (Array.isArray(direct.data)) return direct.data as AvailableSlot[];
    const nested = direct.data as { slots?: AvailableSlot[] | null } | null | undefined;
    if (nested && Array.isArray(nested.slots)) {
      return nested.slots;
    }
    return [];
  };

  // Fetch Booking Details
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!id) return;
        setIsBookingLoading(true);
        const response = await apiJson<BookingDetailResponse>(`/bookings/${id}`, {
          auth: true,
        });
        setBooking(extractBooking(response));
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;
        setErrorMessage(mapHttpError(status, undefined, lang));
        setErrorVisible(true);
      } finally {
        setIsBookingLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  // Fetch Slots when Date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !booking?.provider?.id) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const requested = new Date(selectedDate);
      requested.setHours(0, 0, 0, 0);
      if (requested < today) {
        setSlots([]);
        setIsSlotsLoading(false);
        return;
      }
      try {
        setIsSlotsLoading(true);
        setErrorVisible(false);
        setSelectedTime('');
        const response = await apiJson<SlotsResponse>(
          `/providers/${booking.provider.id}/slots?date=${selectedDate}`,
          {
            auth: true,
          },
        );
        const slotArray = extractSlots(response);
        setSlots(
          slotArray.filter((slot) => Boolean(slot.available || slot.isAvailable)),
        );
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;
        setErrorMessage(mapHttpError(status, undefined, lang));
        setErrorVisible(true);
        setSlots([]);
      } finally {
        setIsSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDate, booking, lang]);

  const submitReschedule = async () => {
    Keyboard.dismiss();
    if (!selectedDate || !selectedTime) return;

    // Validate formats before sending
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    const cleanTime = selectedTime.substring(0, 5);

    if (!dateRegex.test(selectedDate) || !timeRegex.test(cleanTime)) {
      setErrorMessage(t('bookingInvalidSlot'));
      setErrorVisible(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorVisible(false);

      await apiJson<unknown>(`/bookings/${id}/reschedule`, {
        auth: true,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledDate: selectedDate,
          scheduledTime: cleanTime,
          reason: reason.trim() || undefined,
        }),
      });

      // Success → navigate back to appointment detail
      router.replace(`/(client)/appointments/${id}`);

    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrorMessage(t('bookingSlotTaken'));
      } else if (error instanceof ApiError && error.status === 400) {
        setErrorMessage(t('bookingInvalidSlot'));
      } else if (error instanceof Error && !(error instanceof ApiError)) {
        setErrorMessage(error.message);
      } else {
        const status = error instanceof ApiError ? error.status : 500;
        setErrorMessage(mapHttpError(status, undefined, lang));
      }
      setErrorVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatOutputDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  const renderCalendarDays = () => {
    let blanks = [];
    for (let i = 0; i < firstDay; i++) {
      blanks.push(<View key={`blank-${i}`} style={styles.calendarDay} />);
    }

    let days = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let d = 1; d <= daysCount; d++) {
      const cellDate = new Date(year, month, d);
      const isPast = cellDate < today;
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isSelected = selectedDate === dateStr;

      days.push(
        <TouchableOpacity 
          key={d} 
          style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
          disabled={isPast}
          onPress={() => setSelectedDate(dateStr)}
        >
          <Text style={[styles.calendarDayText, isPast && styles.calendarDayPast, isSelected && styles.calendarDayTextSelected]}>
            {d}
          </Text>
        </TouchableOpacity>
      );
    }

    const totalSlots = [...blanks, ...days];
    let rows: React.ReactElement[][] = [];
    let cells: React.ReactElement[] = [];

    totalSlots.forEach((row, i) => {
      cells.push(row);
      if ((i + 1) % 7 === 0 || i === totalSlots.length - 1) {
        if (i === totalSlots.length - 1) {
          while(cells.length < 7) {
            cells.push(<View key={`pad-${cells.length}`} style={styles.calendarDay} />);
          }
        }
        rows.push(cells);
        cells = [];
      }
    });

    return rows.map((d, i) => <View key={i} style={styles.calendarRow}>{d}</View>);
  };

  if (isBookingLoading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('rescheduleTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color={colors.coral} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const providerName = booking?.provider?.businessName || (booking?.provider?.user?.firstName ? `${booking.provider.user.firstName} ${booking.provider.user.lastName}` : t('providerGeneric'));
  const serviceNames = booking?.services?.map((s) => s.name).join(', ') || '';

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rescheduleTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.currentBookingCard}>
            <Text style={styles.currentBookingTitle}>{t('rescheduleCurrentBooking')}</Text>
            <Text style={styles.currentBookingProvider}>{providerName}</Text>
            <Text style={styles.currentBookingServices}>{serviceNames}</Text>
            <View style={styles.currentBookingDateTime}>
              <Feather name="calendar" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.currentBookingText}>{formatOutputDate(booking?.scheduledDate)}</Text>
              <Text style={styles.currentBookingDot}> • </Text>
              <Feather name="clock" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.currentBookingText}>
                {booking?.scheduledTime}
                {timeSuffix}
              </Text>
            </View>
          </View>

          <GermanErrorBanner visible={errorVisible} message={errorMessage} />

          <View style={styles.calendarCard}>
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.monthButton}>
                <Feather name="chevron-left" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {monthLabel} {year}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.monthButton}>
                <Feather name="chevron-right" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDaysRow}>
              {dayNames.map((d) => (
                <Text key={d} style={styles.weekDayText}>
                  {d}
                </Text>
              ))}
            </View>

            {renderCalendarDays()}
          </View>

          {selectedDate ? (
            <View style={styles.slotsSection}>
              <Text style={styles.slotsHeader}>{t('bookingAvailableTimes')}</Text>

              {isSlotsLoading ? (
                <ActivityIndicator size="large" color={colors.coral} style={{ marginVertical: spacing.xl }} />
              ) : slots.length === 0 ? (
                <Text style={styles.emptySlotsText}>{t('bookingNoSlots')}</Text>
              ) : (
                <View style={styles.slotsGrid}>
                  {slots.map((slot, idx) => {
                    const slotTime = slot.time ?? slot.startTime;
                    const active = selectedTime === slotTime;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.slotButton, active && styles.slotButtonActive]}
                        onPress={() => setSelectedTime(slotTime)}
                      >
                        <Text style={[styles.slotText, active && styles.slotTextActive]}>{slotTime}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>{t('rescheduleReason')}</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder={t('rescheduleReasonPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={300}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerDateText}>
              {selectedDate
                ? `${t('rescheduleNewDate')}: ${formatOutputDate(selectedDate)}`
                : t('bookingChooseDate')}
            </Text>
            <Text style={styles.footerTimeText}>
              {selectedTime ? `${selectedTime}${lang === 'de' ? ' UHR' : ''}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.nextButton, (!selectedDate || !selectedTime || isSubmitting) && styles.nextButtonDisabled]}
            onPress={submitReschedule}
            disabled={!selectedDate || !selectedTime || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.nextButtonText}>{t('rescheduleConfirm')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  
  keyboardContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xl },
  
  // Current Booking
  currentBookingCard: { backgroundColor: colors.surfaceCard, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  currentBookingTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  currentBookingProvider: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary, marginBottom: 2 },
  currentBookingServices: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary, marginBottom: spacing.sm },
  currentBookingDateTime: { flexDirection: 'row', alignItems: 'center' },
  currentBookingText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  currentBookingDot: { color: colors.textTertiary, marginHorizontal: 4 },

  // Calendar
  calendarCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg, ...shadows.card },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  monthTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  monthButton: { padding: spacing.xs },
  weekDaysRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm, marginBottom: spacing.sm },
  weekDayText: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textTertiary },
  calendarRow: { flexDirection: 'row', marginBottom: spacing.xs },
  calendarDay: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calendarDaySelected: { backgroundColor: colors.coral, borderRadius: 20 },
  calendarDayText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
  calendarDayTextSelected: { color: colors.surface, fontFamily: fonts.bodyBold },
  calendarDayPast: { color: colors.textTertiary },
  
  // Slots
  slotsSection: { marginTop: spacing.sm, marginBottom: spacing.lg },
  slotsHeader: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.md },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotButton: { width: '31%', paddingVertical: 12, backgroundColor: colors.surface, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  slotButtonActive: { backgroundColor: colors.coralLight, borderColor: colors.coral },
  slotText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  slotTextActive: { color: colors.coral },
  emptySlotsText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic' },
  
  // Reason
  reasonSection: { marginBottom: spacing.xl },
  reasonLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary, marginBottom: spacing.sm },
  reasonInput: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, minHeight: 100, fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary },

  // Footer
  footer: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg, ...shadows.card },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  footerDateText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  footerTimeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  nextButton: { backgroundColor: colors.coral, height: layout.inputHeight, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  nextButtonDisabled: { backgroundColor: colors.border },
  nextButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
});
