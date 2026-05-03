import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { tokenStorage } from '../../utils/token-storage';
import { mapHttpError } from '../../utils/error-messages';
import { API } from '../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
// We'll reorder them starting from Monday for UI purposes: Mo, Di, Mi, Do, Fr, Sa, So
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
  const { lang } = useLanguage();

  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [bufferMinutes, setBufferMinutes] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [showPicker, setShowPicker] = useState<{ visible: boolean; dayIndex: number; field: 'openTime' | 'closeTime' }>({
    visible: false, dayIndex: -1, field: 'openTime'
  });

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API}/providers/me/availability`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Assuming data returns { schedule: DaySchedule[], bufferMinutes: number }
        // For phase 1, mock if missing
        if (data.schedule && data.schedule.length > 0) {
          setSchedule(data.schedule);
          setBufferMinutes(data.bufferMinutes || 0);
        } else {
          initializeDefaultSchedule();
        }
      } else {
        initializeDefaultSchedule();
      }
    } catch (error) {
      console.log('Error loading availability', error);
      initializeDefaultSchedule();
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

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowPicker({ ...showPicker, visible: Platform.OS === 'ios' });
    
    if (selectedDate && showPicker.dayIndex !== -1) {
      const timeStr = selectedDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      setSchedule(prev => prev.map(day => 
        day.dayOfWeek === showPicker.dayIndex 
          ? { ...day, [showPicker.field]: timeStr } 
          : day
      ));
    }
  };

  const openTimePicker = (dayOfWeek: number, field: 'openTime' | 'closeTime') => {
    setShowPicker({ visible: true, dayIndex: dayOfWeek, field });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorVisible(false);
      const token = await tokenStorage.getAccessToken();

      const response = await fetch(`${API}/providers/me/availability`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ schedule, bufferMinutes })
      });

      if (!response.ok) {
        throw { response: { status: response.status } };
      }

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.back();
      }, 1500);

    } catch (error: any) {
      setErrorMessage(mapHttpError(error?.response?.status, undefined, lang));
      setErrorVisible(true);
    } finally {
      setSaving(false);
    }
  };

  // Helper to parse HH:mm to Date object for the picker
  const getTimeAsDate = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verfügbarkeit</Text>
        <View style={{ width: 40 }} />
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Weekly Schedule */}
        <View style={styles.section}>
          {UI_DAY_ORDER.map(dayIndex => {
            const dayData = schedule.find(d => d.dayOfWeek === dayIndex);
            if (!dayData) return null;

            return (
              <View key={dayIndex} style={styles.dayRow}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>{DAY_NAMES[dayIndex]}</Text>
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
                      <Text style={styles.timeLabel}>Von</Text>
                      <View style={styles.timeValueBox}>
                        <Text style={styles.timeValue}>{dayData.openTime}</Text>
                        <Feather name="clock" size={16} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>

                    <View style={{ width: spacing.md }} />

                    <TouchableOpacity 
                      style={styles.timeInput}
                      onPress={() => openTimePicker(dayIndex, 'closeTime')}
                    >
                      <Text style={styles.timeLabel}>Bis</Text>
                      <View style={styles.timeValueBox}>
                        <Text style={styles.timeValue}>{dayData.closeTime}</Text>
                        <Feather name="clock" size={16} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.closedText}>Nicht verfügbar</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Buffer Time */}
        <View style={styles.bufferSection}>
          <Text style={styles.bufferLabel}>Pufferzeit zwischen Terminen</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bufferScroll}>
            {BUFFER_OPTIONS.map(mins => (
              <TouchableOpacity
                key={mins}
                style={[styles.bufferChip, bufferMinutes === mins && styles.bufferChipSelected]}
                onPress={() => setBufferMinutes(mins)}
              >
                <Text style={[styles.bufferChipText, bufferMinutes === mins && styles.bufferChipTextSelected]}>
                  {mins} Min
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

      </ScrollView>

      {/* Time Picker Modal */}
      {showPicker.visible && (
        <DateTimePicker
          value={getTimeAsDate(
            schedule.find(d => d.dayOfWeek === showPicker.dayIndex)?.[showPicker.field] || '09:00'
          )}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton 
          label="Speichern" 
          onPress={handleSave}
          loading={saving}
        />
      </View>
      {/* Toast Notification */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>Gespeichert ✓</Text>
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
    paddingTop: 100,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toast: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: 24,
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  scrollContainer: { padding: spacing.lg, paddingBottom: 40 },

  section: { marginBottom: spacing.xl },

  dayRow: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
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
  timeLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: 4 },
  timeValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeValue: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  
  closedText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textTertiary, marginTop: spacing.sm },

  bufferSection: { marginBottom: spacing.xl },
  bufferLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.md },
  bufferScroll: { gap: spacing.sm },
  bufferChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
  }
});
