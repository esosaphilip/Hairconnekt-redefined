import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../../../theme';
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('cancelTitle')}</Text>
          <View style={{ width: 40 }} />
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('cancelTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        {/* Policy Card */}
        <View style={[styles.policyCard, isShortNotice && styles.policyCardUrgent]}>
          <View style={styles.policyHeader}>
            <Feather name="alert-triangle" size={20} color={isShortNotice ? "#D32F2F" : "#E65100"} />
            <Text style={[styles.policyTitle, isShortNotice && { color: "#D32F2F" }]}>{t('cancelPolicy')}</Text>
          </View>
          <Text style={[styles.policyText, isShortNotice && { color: "#D32F2F" }]}>
            {isShortNotice 
              ? t('cancelPolicyUrgent')
              : t('cancelPolicyText')}
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
            placeholderTextColor="rgba(26,26,26,0.5)"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity 
          style={[styles.cancelButton, (!selectedReason || isSubmitting) && styles.cancelButtonDisabled]}
          onPress={handleCancelClick}
          disabled={!selectedReason || isSubmitting}
        >
          {isSubmitting ? (
             <ActivityIndicator color="#FFF" />
          ) : (
             <Text style={styles.cancelButtonText}>{t('cancelConfirmBtn')}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          {t('cancelProviderNotified')}
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: 'PlayfairDisplay-Medium', fontSize: 20, color: '#8B4513' },
  
  scrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: 60 },
  
  policyCard: { backgroundColor: '#FFF3E0', padding: 20, borderBottomWidth: 1, borderBottomColor: '#FFE0B2', marginBottom: spacing.xl },
  policyCardUrgent: { backgroundColor: '#FFEBEE', borderBottomColor: '#FFCDD2' },
  policyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  policyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: '#E65100', marginLeft: 8 },
  policyText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: '#E65100', lineHeight: 20 },
  
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textPrimary, marginBottom: spacing.lg },
  
  reasonsList: { gap: 12, marginBottom: spacing.xl },
  radioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 16, borderRadius: 16 },
  radioRowActive: { backgroundColor: '#F0E6D8' },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCC', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: '#8B4513' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#8B4513' },
  radioText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textPrimary },
  
  notesSection: { marginBottom: spacing.xl },
  notesLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: '#6B6B6B', marginBottom: 8 },
  textInput: { backgroundColor: '#F5F5F5', borderRadius: 16, padding: 16, height: 128, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textPrimary },
  
  cancelButton: { backgroundColor: '#C62828', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cancelButtonDisabled: { backgroundColor: '#DDDDDD' },
  cancelButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#FFFFFF' },
  
  footerText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#6B6B6B', textAlign: 'center' }
});
