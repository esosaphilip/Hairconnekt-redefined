import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { API } from '../../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';


export default function ClientBookingDateTime() {
  const router = useRouter();
  const { providerId, selectedServiceIds, totalPrice } = useLocalSearchParams<{ providerId: string, selectedServiceIds: string, totalPrice: string }>();
  const { t, lang } = useLanguage();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  const [slots, setSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysCount = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  
  const dayNames = lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const formatOutputDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  useEffect(() => {
    if (selectedDate && providerId) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, providerId]);

  const fetchSlots = async (dateStr: string) => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      setSelectedTime('');
      const token = await tokenStorage.getAccessToken();
      
      const response = await axios.get(`${API}/providers/${providerId}/slots?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let fetchedSlots = response.data.slots ?? response.data.data ?? response.data ?? [];
      if (!Array.isArray(fetchedSlots)) {
        fetchedSlots = [];
      }
      // Basic formatting sort
      fetchedSlots.sort((a: any, b: any) => (a.time || a.startTime || '').localeCompare(b.time || b.startTime || ''));
      setSlots(fetchedSlots);
    } catch (err: any) {
      setErrorMessage(mapHttpError(err.response?.status, undefined, lang));
      setErrorVisible(true);
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (!selectedDate || !selectedTime) return;

    const providerIdValue = (Array.isArray(providerId) ? providerId[0] : providerId) as string;

    try {
      const token = await tokenStorage.getAccessToken();
      const res = await axios.get(
        `${API}/providers/${providerIdValue}/slots?date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const freshSlots: Array<{ time: string; available: boolean }> =
        res.data?.slots ?? res.data?.data ?? [];

      const stillAvailable = freshSlots.find(
        (s) => s.time === selectedTime && s.available,
      );

      if (!stillAvailable) {
        setErrorMessage(
          'Dieser Zeitslot ist leider nicht mehr verfügbar. Bitte wähle eine andere Zeit.',
        );
        setErrorVisible(true);
        setSelectedTime('');
        fetchSlots(selectedDate);
        return;
      }
    } catch {}

    router.push({
      pathname: '/(client)/booking/details',
      params: { 
        providerId, 
        selectedServiceIds, 
        totalPrice, 
        date: selectedDate,
        time: selectedTime
      }
    } as any);
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

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bookingSelectDate')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.stepIndicatorContainer}>
        <Text style={styles.stepText}>{t('bookingStep')} 2 {t('bookingOf')} 4</Text>
        <View style={styles.stepBarRow}>
          <View style={[styles.stepSegment, styles.stepSegmentActive]} />
          <View style={[styles.stepSegment, styles.stepSegmentActive]} />
          <View style={styles.stepSegment} />
          <View style={styles.stepSegment} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Native Calendar Card */}
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthButton}>
              <Feather name="chevron-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {currentMonth.toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.monthButton}>
              <Feather name="chevron-right" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.weekDaysRow}>
            {dayNames.map(d => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
          </View>
          
          {renderCalendarDays()}
        </View>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        {/* Dynamic Time Slots Block */}
        {selectedDate && (
          <View style={styles.slotsSection}>
            <Text style={styles.slotsHeader}>{t('bookingAvailableTimes')}</Text>
            
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.coral} style={{ marginVertical: spacing.xl }} />
            ) : slots.length === 0 ? (
              <Text style={styles.emptySlotsText}>{t('bookingNoSlots')}</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots
                  .filter(slot => slot.available || slot.isAvailable)
                  .map((slot, idx) => {
                  const time = slot.time ?? slot.startTime;
                  const active = selectedTime === time;
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.slotButton, active && styles.slotButtonActive]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text style={[styles.slotText, active && styles.slotTextActive]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerDateText}>
            {selectedDate ? `${t('bookingSelectDate')}: ${formatOutputDate(selectedDate)}` : t('bookingChooseDate')}
          </Text>
          <Text style={styles.footerTimeText}>
            {selectedTime ? `${selectedTime}${t('timeSuffix')}` : ''}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.nextButton, (!selectedDate || !selectedTime) && styles.nextButtonDisabled]} 
          onPress={handleNext}
          disabled={!selectedDate || !selectedTime}
        >
          <Text style={styles.nextButtonText}>{t('next')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary },
  
  stepIndicatorContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface },
  stepText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: 8 },
  stepBarRow: { flexDirection: 'row', gap: 4 },
  stepSegment: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  stepSegmentActive: { backgroundColor: colors.coral },
  
  scrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: 120 },
  
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
  
  slotsSection: { marginTop: spacing.sm },
  slotsHeader: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.md },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotButton: { width: '31%', paddingVertical: 12, backgroundColor: colors.surface, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  slotButtonActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  slotText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  slotTextActive: { color: colors.primary },
  emptySlotsText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 30, ...shadows.card },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  footerDateText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  footerTimeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  nextButton: { backgroundColor: colors.coral, height: 48, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  nextButtonDisabled: { backgroundColor: colors.border },
  nextButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
});
