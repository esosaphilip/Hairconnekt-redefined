import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../../../theme';
import { GermanErrorBanner } from '../../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../../utils/error-messages';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const CANCEL_REASONS = [
  'Anderer Termin dazwischengekommen', // Maps to 'Andere Pläne' for UI logic, but DTO expects explicit strings. 
  'Gesundheitliche Gründe',             // Maps to 'Krank'
  'Finanzielle Gründe',                 // We'll map this to 'Notfall' or 'Sonstiges' later based on DTO constraints. 
  'Möchte einen anderen Anbieter',      // Maps to 'Anbieter abgesagt' / 'Sonstiges'
  'Sonstiges'
];

// Re-map constraints matching Backend strictly
const UI_TO_API_MAP: Record<string, string> = {
  'Anderer Termin dazwischengekommen': 'Andere Pläne',
  'Gesundheitliche Gründe': 'Krank',
  'Finanzielle Gründe': 'Notfall', // Or Sonstiges, we'll map to Notfall
  'Möchte einen anderen Anbieter': 'Anbieter abgesagt',
  'Sonstiges': 'Sonstiges'
};

export default function CancelAppointment() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reasonUI, setReasonUI] = useState<string>('');
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
        const res = await axios.get(`${API_URL}/bookings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBooking(res.data);
      } catch (err: any) {
        setErrorMessage(mapHttpError(err.response?.status));
        setErrorVisible(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const handleCancelClick = () => {
    if (!reasonUI) return;
    Alert.alert(
      "Termin wirklich stornieren?",
      "Möchtest du diesen Termin wirklich stornieren? Diese Aktion kann nicht rückgängig gemacht werden.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Stornieren", style: "destructive", onPress: submitCancel }
      ]
    );
  };

  const submitCancel = async () => {
    try {
      setIsSubmitting(true);
      setErrorVisible(false);
      const token = await tokenStorage.getAccessToken();
      
      const mappedReason = UI_TO_API_MAP[reasonUI] || 'Sonstiges';

      await axios.patch(`${API_URL}/bookings/${id}/cancel`, {
        reason: mappedReason,
        notes: notes.trim() || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.replace(`/(client)/appointments` as any);
    } catch (err: any) {
      setErrorMessage(mapHttpError(err.response?.status));
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
          <Text style={styles.headerTitle}>Termin stornieren</Text>
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
        <Text style={styles.headerTitle}>Termin stornieren</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        {/* Policy Card */}
        <View style={[styles.policyCard, isShortNotice && styles.policyCardUrgent]}>
          <View style={styles.policyHeader}>
            <Feather name="alert-triangle" size={20} color={isShortNotice ? "#D32F2F" : "#E65100"} />
            <Text style={[styles.policyTitle, isShortNotice && { color: "#D32F2F" }]}>Stornierungsrichtlinie</Text>
          </View>
          <Text style={[styles.policyText, isShortNotice && { color: "#D32F2F" }]}>
            {isShortNotice 
              ? "Kurzfristige Stornierung (weniger als 24h). Eine Gebühr von 50% des Servicepreises kann anfallen." 
              : "Kostenlose Stornierung bis 24 Stunden vor Termin möglich. Bei kurzfristigerer Stornierung kann eine Gebühr von 50% anfallen."}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Grund für Stornierung</Text>

        <View style={styles.reasonsList}>
          {CANCEL_REASONS.map((r, idx) => {
            const isSelected = reasonUI === r;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.radioRow, isSelected && styles.radioRowActive]}
                onPress={() => setReasonUI(r)}
              >
                <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Zusätzliche Anmerkungen (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Möchten Sie noch etwas hinzufügen?"
            placeholderTextColor="rgba(26,26,26,0.5)"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity 
          style={[styles.cancelButton, (!reasonUI || isSubmitting) && styles.cancelButtonDisabled]}
          onPress={handleCancelClick}
          disabled={!reasonUI || isSubmitting}
        >
          {isSubmitting ? (
             <ActivityIndicator color="#FFF" />
          ) : (
             <Text style={styles.cancelButtonText}>Termin stornieren</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Der Anbieter wird über die Stornierung informiert
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
