import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../../theme';
import { GermanErrorBanner } from '../../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../../utils/error-messages';
import { API } from '../../../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RescheduleAppointment() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  const timeSuffix = lang === 'de' ? ' Uhr' : '';

  // Booking Data
  const [booking, setBooking] = useState<any>(null);
  const [isBookingLoading, setIsBookingLoading] = useState(true);

  // Form State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  
  // Slots Data
  const [slots, setSlots] = useState<any[]>([]);
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

  // Fetch Booking Details
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!id) return;
        setIsBookingLoading(true);
        const token = await tokenStorage.getAccessToken();
        const res = await axios.get(`${API}/bookings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBooking(res.data);
      } catch (err: any) {
        setErrorMessage(mapHttpError(err.response?.status, undefined, lang));
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
        const token = await tokenStorage.getAccessToken();
        const res = await fetch(`${API}/providers/${booking.provider.id}/slots?date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const slotArray = data.slots ?? data.data ?? [];
        // Filter only available slots
        setSlots(slotArray.filter((s: any) => s.available || s.isAvailable));
        setIsSlotsLoading(false);
      } catch (err: any) {
        setErrorMessage(mapHttpError(err.response?.status, undefined, lang));
        setErrorVisible(true);
        setSlots([]);
        setIsSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDate, booking]);

  const submitReschedule = async () => {
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
      const token = await tokenStorage.getAccessToken();

      const res = await fetch(`${API}/bookings/${id}/reschedule`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledDate: selectedDate,
          scheduledTime: cleanTime,
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const backendMessage = Array.isArray(err?.message) ? err.message[0] : err?.message;
        if (res.status === 409) {
          throw new Error(t('bookingSlotTaken'));
        }
        if (res.status === 400) {
          throw new Error(t('bookingInvalidSlot'));
        }
        throw new Error(backendMessage ?? mapHttpError(res.status, undefined, lang));
      }

      // Success → navigate back to appointment detail
      router.replace(`/(client)/appointments/${id}`);

    } catch (err: any) {
      setErrorMessage(err.message ?? mapHttpError(500, undefined, lang));
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
    let rows: any[][] = [];
    let cells: any[] = [];

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
  const serviceNames = booking?.services?.map((s: any) => s.name).join(', ') || '';

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rescheduleTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Current Booking Info */}
        <View style={styles.currentBookingCard}>
          <Text style={styles.currentBookingTitle}>{t('rescheduleCurrentBooking')}</Text>
          <Text style={styles.currentBookingProvider}>{providerName}</Text>
          <Text style={styles.currentBookingServices}>{serviceNames}</Text>
          <View style={styles.currentBookingDateTime}>
            <Feather name="calendar" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.currentBookingText}>{formatOutputDate(booking?.scheduledDate)}</Text>
            <Text style={styles.currentBookingDot}> • </Text>
            <Feather name="clock" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.currentBookingText}>{booking?.scheduledTime}{timeSuffix}</Text>
          </View>
        </View>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        {/* Native Calendar Card */}
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthButton}>
              <Feather name="chevron-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthLabel} {year}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthButton}>
              <Feather name="chevron-right" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.weekDaysRow}>
            {dayNames.map(d => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
          </View>
          
          {renderCalendarDays()}
        </View>

        {/* Dynamic Time Slots Block */}
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
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>
                        {slotTime}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {/* Reason Block */}
        <View style={styles.reasonSection}>
          <Text style={styles.reasonLabel}>{t('rescheduleReason')}</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder={t('rescheduleReasonPlaceholder')}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerDateText}>
            {selectedDate ? `${t('rescheduleNewDate')}: ${formatOutputDate(selectedDate)}` : t('bookingChooseDate')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  
  scrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: 150 },
  
  // Current Booking
  currentBookingCard: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
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
  slotButtonActive: { backgroundColor: '#FFEBEA', borderColor: colors.coral },
  slotText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  slotTextActive: { color: colors.coral },
  emptySlotsText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic' },
  
  // Reason
  reasonSection: { marginBottom: spacing.xl },
  reasonLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary, marginBottom: spacing.sm },
  reasonInput: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, minHeight: 100, fontFamily: fonts.body, fontSize: 16, color: colors.textPrimary },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 30, ...shadows.card },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  footerDateText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  footerTimeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  nextButton: { backgroundColor: colors.coral, height: 48, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  nextButtonDisabled: { backgroundColor: colors.border },
  nextButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
});
