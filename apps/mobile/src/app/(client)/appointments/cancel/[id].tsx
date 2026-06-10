import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, layout, lineHeights } from '../../../../theme';
import { GermanErrorBanner } from '../../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../../utils/error-messages';
import { API } from '../../../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';

type BackendReason = 'Andere Pläne' | 'Krank' | 'Notfall' | 'Anbieter abgesagt' | 'Sonstiges';

const CANCEL_REASONS: { labelKey: 'cancelReasonOther' | 'cancelReasonSick' | 'cancelReasonEmergency' | 'cancelReasonProvider' | 'cancelReasonMisc'; apiValue: BackendReason }[] = [
  { labelKey: 'cancelReasonOther', apiValue: 'Andere Pläne' },
  { labelKey: 'cancelReasonSick', apiValue: 'Krank' },
  { labelKey: 'cancelReasonEmergency', apiValue: 'Notfall' },
  { labelKey: 'cancelReasonProvider', apiValue: 'Anbieter abgesagt' },
  { labelKey: 'cancelReasonMisc', apiValue: 'Sonstiges' },
];

export default function CancelAppointment() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { lang, t } = useLanguage();

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReason, setSelectedReason] = useState<BackendReason | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!id) return;
        setIsLoading(true);
        const token = await tokenStorage.getAccessToken();
        const res = await axios.get(`${API}/bookings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBooking(res.data);
      } catch (err: any) {
        setErrorMessage(mapHttpError(err.response?.status, undefined, lang));
        setErrorVisible(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const handleCancelClick = () => {
    if (!selectedReason) return;
    Alert.alert(
      t('cancelConfirmTitle'),
      t('cancelConfirmBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('cancelConfirmBtn'), style: 'destructive', onPress: submitCancel }
      ]
    );
  };

  const submitCancel = async () => {
    Keyboard.dismiss();
    if (!selectedReason) return;
    try {
      setIsSubmitting(true);
      setErrorVisible(false);
      const token = await tokenStorage.getAccessToken();

      await axios.patch(`${API}/bookings/${id}/cancel`, {
        reason: selectedReason,
        notes: notes.trim() || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.replace(`/(client)/appointments` as any);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        setErrorMessage(t('cancelNotAllowed'));
      } else {
        setErrorMessage(mapHttpError(status, undefined, lang));
      }
      setErrorVisible(true);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
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
          <Text style={styles.headerTitle}>{t('cancelTitle')}</Text>
          <View style={{ width: layout.iconButton }} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // Calculate 24h limit
  let isShortNotice = false;
  if (booking?.scheduledDate && booking?.scheduledTime) {
    const [year, month, day] = booking.scheduledDate.split('-');
    const [hours, minutes] = booking.scheduledTime.split(':');
    const appointmentDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
    
    const diffHours = (appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffHours < 24 && diffHours > 0) {
      isShortNotice = true;
    }
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
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('cancelTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
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
          <GermanErrorBanner visible={errorVisible} message={errorMessage} />

          <View style={[styles.policyCard, isShortNotice && styles.policyCardUrgent]}>
            <View style={styles.policyHeader}>
              <Feather
                name="alert-triangle"
                size={fontSizes.xl}
                color={isShortNotice ? colors.error : colors.orange}
              />
              <Text style={[styles.policyTitle, isShortNotice && styles.policyTitleUrgent]}>
                {t('cancelPolicy')}
              </Text>
            </View>
            <Text style={[styles.policyText, isShortNotice && styles.policyTextUrgent]}>
              {isShortNotice ? t('cancelPolicyUrgent') : t('cancelPolicyText')}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>{t('cancelReason')}</Text>

          <View style={styles.reasonsList}>
            {CANCEL_REASONS.map((item, idx) => {
              const isSelected = selectedReason === item.apiValue;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.radioRow, isSelected && styles.radioRowActive]}
                  onPress={() => setSelectedReason(item.apiValue)}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioText}>{t(item.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>{t('cancelNotes')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={t('cancelNotesPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={500}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          <TouchableOpacity
            style={[styles.cancelButton, (!selectedReason || isSubmitting) && styles.cancelButtonDisabled]}
            onPress={handleCancelClick}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.cancelButtonText}>{t('cancelConfirmBtn')}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>{t('cancelProviderNotified')}</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: layout.headerHeight, borderBottomWidth: spacing.unit, borderBottomColor: colors.border },
  backButton: { width: layout.iconButton, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: 'PlayfairDisplay-Medium', fontSize: fontSizes.xl, color: colors.primary },
  
  scrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xl },
  
  policyCard: { backgroundColor: colors.orangeLight, padding: spacing.lg, borderBottomWidth: spacing.unit, borderBottomColor: colors.border, marginBottom: spacing.xl },
  policyCardUrgent: { backgroundColor: colors.errorLight, borderBottomColor: colors.border },
  policyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxs + spacing.xxxs },
  policyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.orange, marginLeft: spacing.xs },
  policyTitleUrgent: { color: colors.error },
  policyText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.orange, lineHeight: lineHeights.sm },
  policyTextUrgent: { color: colors.error },
  
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xl, color: colors.textPrimary, marginBottom: spacing.lg },
  
  reasonsList: { gap: spacing.sm, marginBottom: spacing.xl },
  radioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md },
  radioRowActive: { backgroundColor: colors.primaryLight },
  radioCircle: { width: spacing.lg, height: spacing.lg, borderRadius: borderRadius.md - spacing.xxs, borderWidth: spacing.xxxs, borderColor: colors.borderStrong, marginRight: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: colors.primary },
  radioInner: { width: spacing.sm, height: spacing.sm, borderRadius: spacing.sm / 2, backgroundColor: colors.primary },
  radioText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  
  notesSection: { marginBottom: spacing.xl },
  notesLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  textInput: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, height: layout.textAreaHeight + spacing.xs, fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary, borderWidth: spacing.unit, borderColor: colors.border },
  
  cancelButton: { backgroundColor: colors.error, height: layout.buttonHeight, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  cancelButtonDisabled: { backgroundColor: colors.borderStrong },
  cancelButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.background },
  
  footerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'center' }
});
