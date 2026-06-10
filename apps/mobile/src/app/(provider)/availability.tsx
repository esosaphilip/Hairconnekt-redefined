import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '../../theme';
import { DateTimePickerModal } from '@/components/DateTimePickerModal';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiJson } from '@/services/apiClient';
const UI_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const BUFFER_OPTIONS = [0, 15, 30, 45, 60];

interface DaySchedule {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export default function AvailabilityScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  const dayNames = [
    t('availabilityDaySun'),
    t('availabilityDayMon'),
    t('availabilityDayTue'),
    t('availabilityDayWed'),
    t('availabilityDayThu'),
    t('availabilityDayFri'),
    t('availabilityDaySat'),
  ];

  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [bufferMinutes, setBufferMinutes] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);
  const [showToast, setShowToast] = useState(false);

  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    dayOfWeek: number;
    field: 'openTime' | 'closeTime';
  }>({
    visible: false,
    dayOfWeek: -1,
    field: 'openTime',
  });

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setErrorVisible(false);
      const data = await apiJson<any>('/providers/me/availability', {
        auth: true,
        timeoutMs: 20000,
        retryCount: 1,
      });
      if (data?.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
        setSchedule(data.schedule);
        setBufferMinutes(typeof data.bufferMinutes === 'number' ? data.bufferMinutes : 0);
      } else {
        initializeDefaultSchedule();
      }
    } catch (error: any) {
      setErrorStatus(error?.status ?? error?.response?.status);
      setErrorMessage(error?.message ?? t('errorUnknown'));
      setErrorVisible(true);
      if (schedule.length === 0) initializeDefaultSchedule();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultSchedule = () => {
    const defaultSchedule: DaySchedule[] = [];
    for (let i = 0; i <= 6; i++) {
      // Mon-Fri open by default
      const isOpen = i >= 1 && i <= 5;
      defaultSchedule.push({
        dayOfWeek: i,
        isOpen,
        openTime: '09:00',
        closeTime: '18:00'
      });
    }
    setSchedule(defaultSchedule);
  };

  const toggleDay = (dayOfWeek: number) => {
    setSchedule(prev => prev.map(day => 
      day.dayOfWeek === dayOfWeek ? { ...day, isOpen: !day.isOpen } : day
    ));
  };

  const openTimePicker = (dayOfWeek: number, field: 'openTime' | 'closeTime') => {
    setPickerState({ visible: true, dayOfWeek, field });
  };

  const handlePickerConfirm = (selectedDate: Date) => {
    const timeStr = selectedDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    setSchedule((prev) =>
      prev.map((day) =>
        day.dayOfWeek === pickerState.dayOfWeek ? { ...day, [pickerState.field]: timeStr } : day,
      ),
    );
    setPickerState((prev) => ({ ...prev, visible: false }));
  };

  const getPickerValue = (): Date => {
    const day = schedule.find((d) => d.dayOfWeek === pickerState.dayOfWeek);
    if (!day) return new Date();
    const timeStr = day[pickerState.field] || '09:00';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorVisible(false);
      await apiJson<any>('/providers/me/availability', {
        method: 'PUT',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, bufferMinutes }),
        timeoutMs: 20000,
      });

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.back();
      }, 1500);

    } catch (error: any) {
      setErrorStatus(error?.status ?? error?.response?.status);
      setErrorMessage(error?.message ?? t('errorUnknown'));
      setErrorVisible(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('availabilityTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      <GermanErrorBanner
        visible={errorVisible}
        statusCode={errorStatus}
        message={errorMessage}
        actionLabel={t('appointmentsRetry')}
        onAction={loadAvailability}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Weekly Schedule */}
        <View style={styles.section}>
          {UI_DAY_ORDER.map(dayIndex => {
            const dayData = schedule.find(d => d.dayOfWeek === dayIndex);
            if (!dayData) return null;

            return (
              <View key={dayIndex} style={styles.dayRow}>
                <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>{dayNames[dayIndex]}</Text>
                  <Switch
                    value={dayData.isOpen}
                    onValueChange={() => toggleDay(dayIndex)}
                    trackColor={{ false: colors.borderStrong, true: colors.green }}
                    thumbColor={colors.background}
                  />
                </View>

                {dayData.isOpen ? (
                  <View style={styles.timeInputsRow}>
                    <TouchableOpacity 
                      style={styles.timeInput}
                      onPress={() => openTimePicker(dayIndex, 'openTime')}
                    >
                      <Text style={styles.timeLabel}>{t('availabilityFrom')}</Text>
                      <View style={styles.timeValueBox}>
                        <Text style={styles.timeValue}>{dayData.openTime}</Text>
                        <Feather name="clock" size={fontSizes.md} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>

                    <View style={{ width: spacing.md }} />

                    <TouchableOpacity 
                      style={styles.timeInput}
                      onPress={() => openTimePicker(dayIndex, 'closeTime')}
                    >
                      <Text style={styles.timeLabel}>{t('availabilityTo')}</Text>
                      <View style={styles.timeValueBox}>
                        <Text style={styles.timeValue}>{dayData.closeTime}</Text>
                        <Feather name="clock" size={fontSizes.md} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.closedText}>{t('availabilityClosed')}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Buffer Time */}
        <View style={styles.bufferSection}>
          <Text style={styles.bufferLabel}>{t('availabilityBuffer')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bufferScroll}>
            {BUFFER_OPTIONS.map(mins => (
              <TouchableOpacity
                key={mins}
                style={[styles.bufferChip, bufferMinutes === mins && styles.bufferChipSelected]}
                onPress={() => setBufferMinutes(mins)}
              >
                <Text style={[styles.bufferChipText, bufferMinutes === mins && styles.bufferChipTextSelected]}>
                  {mins} {t('appointmentsMinutes')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

      </ScrollView>

      <DateTimePickerModal
        visible={pickerState.visible}
        mode="time"
        value={getPickerValue()}
        locale={locale}
        cancelLabel={t('cancel')}
        confirmLabel={t('done')}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerState((prev) => ({ ...prev, visible: false }))}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton 
          label={t('availabilitySave')} 
          onPress={handleSave}
          loading={saving}
        />
      </View>
      {/* Toast Notification */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>{t('availabilitySaved')}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: spacing.xl2 + spacing.xl2 + spacing.l,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toast: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + spacing.xxs,
    borderRadius: borderRadius.lg,
  },
  toastText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.background,
  },
  safeContainer: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  backButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  scrollContainer: { padding: spacing.lg, paddingBottom: spacing.xl2 },

  section: { marginBottom: spacing.xl },

  dayRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  
  timeInputsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  timeInput: { flex: 1 },
  timeLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: spacing.xxs },
  timeValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight - spacing.xxs,
    borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs,
    borderWidth: spacing.unit,
    borderColor: colors.border,
  },
  timeValue: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  
  closedText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.sm },

  bufferSection: { marginBottom: spacing.xl },
  bufferLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.md },
  bufferScroll: { gap: spacing.sm },
  bufferChip: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: spacing.unit,
    borderColor: colors.border,
  },
  bufferChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bufferChipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  bufferChipTextSelected: { color: colors.background },

  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: spacing.unit,
    borderTopColor: colors.border,
  }
});
