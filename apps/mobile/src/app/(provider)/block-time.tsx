import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../theme';
import { DateTimePickerModal } from '../../components/DateTimePickerModal';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { tokenStorage } from '../../utils/token-storage';
import { mapHttpError } from '../../utils/error-messages';
import { API } from '../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';

const REASONS = [
  { id: 'urlaub', label: 'Urlaub', icon: '🏖️' },
  { id: 'krank', label: 'Krank', icon: '🤒' },
  { id: 'termin', label: 'Persönlicher Termin', icon: '📅' },
  { id: 'pause', label: 'Pause', icon: '☕' },
  { id: 'sonstiges', label: 'Sonstiges', icon: '📝' },
];

export default function BlockTimeScreen() {
  const router = useRouter();
  const { lang } = useLanguage();
  
  // State
  const [reason, setReason] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isAllDay, setIsAllDay] = useState(true);
  const [isRepeating, setIsRepeating] = useState(false); // Ignored on submit for Phase 1
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  // Picker State
  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    mode: 'date' | 'time';
    field: 'startDate' | 'endDate' | 'startTime' | 'endTime';
  }>({
    visible: false,
    mode: 'date',
    field: 'startDate',
  });

  const openPicker = (field: 'startDate' | 'endDate' | 'startTime' | 'endTime', mode: 'date' | 'time') => {
    setPickerState({ visible: true, mode, field });
  };

  const handlePickerConfirm = (selectedDate: Date) => {
    const field = pickerState.field;
    setPickerState((prev) => ({ ...prev, visible: false }));
    switch (field) {
      case 'startDate':
        setStartDate(selectedDate);
        break;
      case 'endDate':
        setEndDate(selectedDate);
        break;
      case 'startTime':
        setStartTime(selectedDate);
        break;
      case 'endTime':
        setEndTime(selectedDate);
        break;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'DD.MM.YYYY';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (time: Date | null) => {
    if (!time) return 'HH:MM';
    return time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Convert local Date to YYYY-MM-DD format
  const toDateString = (date: Date | null) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isFormValid = () => {
    if (!reason || !startDate || !endDate) return false;
    if (!isAllDay && (!startTime || !endTime)) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    try {
      setIsLoading(true);
      setErrorVisible(false);
      const token = await tokenStorage.getAccessToken();

      const payload = {
        reason: REASONS.find(r => r.id === reason)?.label,
        startDate: toDateString(startDate),
        endDate: toDateString(endDate),
        isAllDay,
        ...(isAllDay ? {} : {
          startTime: formatTime(startTime),
          endTime: formatTime(endTime)
        })
      };

      const response = await fetch(`${API}/providers/me/blocks`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw { response: { status: response.status } };
      }

      router.back();
    } catch (error: any) {
      setErrorMessage(mapHttpError(error?.response?.status, undefined, lang));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zeit blockieren</Text>
        <View style={{ width: 40 }} />
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Reason Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Grund</Text>
          <View style={styles.reasonsGrid}>
            {REASONS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.reasonCard,
                  reason === item.id && styles.reasonCardSelected
                ]}
                onPress={() => setReason(item.id)}
              >
                <Text style={styles.reasonIcon}>{item.icon}</Text>
                <Text style={[
                  styles.reasonLabel,
                  reason === item.id && styles.reasonLabelSelected
                ]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Zeitraum Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Zeitraum</Text>
          <View style={styles.dateInputsContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Startdatum</Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => openPicker('startDate', 'date')}
              >
                <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
                  {formatDate(startDate)}
                </Text>
                <Feather name="calendar" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Enddatum</Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => openPicker('endDate', 'date')}
              >
                <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                  {formatDate(endDate)}
                </Text>
                <Feather name="calendar" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* All Day Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Ganztägig</Text>
          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{ false: colors.borderStrong, true: colors.coral }}
            thumbColor={colors.background}
          />
        </View>

        {/* Uhrzeit Section */}
        {!isAllDay && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Uhrzeit</Text>
            <View style={styles.dateInputsContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Von</Text>
                <TouchableOpacity 
                  style={styles.dateInput} 
                  onPress={() => openPicker('startTime', 'time')}
                >
                  <Text style={[styles.dateText, !startTime && styles.placeholderText]}>
                    {formatTime(startTime)}
                  </Text>
                  <Feather name="clock" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Bis</Text>
                <TouchableOpacity 
                  style={styles.dateInput} 
                  onPress={() => openPicker('endTime', 'time')}
                >
                  <Text style={[styles.dateText, !endTime && styles.placeholderText]}>
                    {formatTime(endTime)}
                  </Text>
                  <Feather name="clock" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Wiederholen Section */}
        <View style={styles.repeatingCard}>
          <View style={styles.repeatingInfo}>
            <Text style={styles.repeatingTitle}>Wiederholen</Text>
            <Text style={styles.repeatingSub}>Zeit regelmäßig blockieren</Text>
          </View>
          <Switch
            value={isRepeating}
            onValueChange={setIsRepeating}
            trackColor={{ false: colors.borderStrong, true: colors.coral }}
            thumbColor={colors.background}
          />
        </View>

      </ScrollView>

      <DateTimePickerModal
        visible={pickerState.visible}
        mode={pickerState.mode}
        value={
          pickerState.field === 'startDate' ? (startDate ?? new Date())
          : pickerState.field === 'endDate' ? (endDate ?? new Date())
          : pickerState.field === 'startTime' ? (startTime ?? new Date())
          : (endTime ?? new Date())
        }
        minimumDate={pickerState.mode === 'date' ? new Date() : undefined}
        onConfirm={handlePickerConfirm}
        onCancel={() => setPickerState((prev) => ({ ...prev, visible: false }))}
      />

      {/* Footer Button */}
      <View style={styles.footer}>
        <PrimaryButton 
          label="Zeit blockieren" 
          onPress={handleSubmit}
          disabled={!isFormValid()}
          loading={isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  
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
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.md },

  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reasonCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonCardSelected: {
    backgroundColor: colors.coralLight,
    borderColor: colors.coral,
  },
  reasonIcon: { fontSize: 20, marginRight: spacing.sm },
  reasonLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary, flex: 1 },
  reasonLabelSelected: { color: colors.coral },

  dateInputsContainer: { flexDirection: 'row', gap: spacing.md },
  inputWrapper: { flex: 1 },
  inputLabel: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: 4 },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    height: 48,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
  },
  dateText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  placeholderText: { color: colors.textTertiary },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  toggleLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },

  repeatingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.xl,
  },
  repeatingInfo: { flex: 1 },
  repeatingTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: 2 },
  repeatingSub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  }
});
