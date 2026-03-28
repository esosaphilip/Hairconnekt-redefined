import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../../../utils/token-storage';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { API } from '../../../utils/api';

export default function RegisterStep5Screen() {
  const router = useRouter();
  const { form, reset } = useRegistration();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // STEP 1: Create user account
      setProgressText('Konto wird erstellt...');
      const authRes = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: 'provider',
          acceptedTerms: true,
        }),
      });

      if (!authRes.ok) {
        if (authRes.status === 409) {
          throw new Error('Diese E-Mail-Adresse ist bereits registriert.');
        }
        throw new Error('Konto konnte nicht erstellt werden.');
      }

      const authData = await authRes.json();
      const token = authData.accessToken;

      // STEP 2: Upload user avatar (BUG 9: before providers/register so the user exists)
      setProgressText('Profilbild wird hochgeladen...');
      if (form.profilePhotoUri) {
        const fd = new FormData();
        fd.append('avatar', { 
          uri: form.profilePhotoUri, type: 'image/jpeg', name: 'avatar.jpg',
        } as any);
        await fetch(`${API}/users/me/avatar`, {
          method: 'POST',
          // BUG 8: no Content-Type — RN sets multipart boundary automatically
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      // STEP 3: Create provider profile record
      setProgressText('Profil wird erstellt...');
      const provRes = await fetch(`${API}/providers/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerType: form.providerType,
          businessName: form.businessName,
          street: form.street,
          houseNumber: form.houseNumber,
          city: form.city,
          postalCode: form.postalCode,
          serviceRadius: form.serviceRadius,
          serviceIds: form.serviceIds,
          experienceYears: form.experienceYears,
          languages: form.languages,
          cancellationPolicy: form.cancellationPolicy,
          bio: form.bio || '',
        }),
      });

      if (!provRes.ok) {
        await tokenStorage.save(token, authData.refreshToken, 'provider');
        throw new Error('Profil konnte nicht erstellt werden. Bitte überprüfe deine Angaben und versuche es erneut.');
      }

      // STEP 4: Upload ID document (BUG 9: requires provider record to exist)
      setProgressText('Ausweis wird hochgeladen...');
      if (form.idDocumentUri) {
        const fd = new FormData();
        fd.append('idDocument', {
          uri: form.idDocumentUri, type: 'image/jpeg', name: 'id-doc.jpg',
        } as any);
        await fetch(`${API}/providers/me/id-document`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      // STEP 5: Upload portfolio images
      setProgressText('Portfolio wird hochgeladen...');
      for (const uri of form.portfolioUris) {
        const fd = new FormData();
        fd.append('portfolio', {
          uri, type: 'image/jpeg', name: 'portfolio.jpg',
        } as any);
        await fetch(`${API}/providers/me/portfolio`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      setProgressText('Fertig!');
      await tokenStorage.save(token, authData.refreshToken, 'provider');
      await AsyncStorage.removeItem('registrationForm');
      reset();
      router.replace('/(provider)/pending');

    } catch (err: any) {
      setError(err.message ?? 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
      setProgressText('');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => !isSubmitting && router.back()}
          disabled={isSubmitting}
        >
          <Feather name="arrow-left" size={24} color={isSubmitting ? colors.textTertiary : colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.progressText}>Schritt 5 / 5</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Zusammenfassung</Text>
        <Text style={styles.subtitle}>Bitte prüfe deine Angaben vor dem Absenden.</Text>

        {error && (
          <View style={styles.errorBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
              <Feather name="alert-circle" size={20} color={colors.error} style={{ marginTop: 2 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity onPress={handleSubmit} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Card 1 */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Geschäftsinformationen</Text>
            <TouchableOpacity onPress={() => router.push('/(provider)/register/step2')}>
              <Text style={styles.editLink}>Bearbeiten</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardValueMain}>{form.businessName}</Text>
          <Text style={styles.cardValueSub}>{form.street} {form.houseNumber}, {form.postalCode} {form.city}</Text>
          <Text style={styles.cardValueSub}>Radius: {form.serviceRadius} km</Text>
        </View>

        {/* Card 2 */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Services & Erfahrung</Text>
            <TouchableOpacity onPress={() => router.push('/(provider)/register/step3')}>
              <Text style={styles.editLink}>Bearbeiten</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardValueMain}>{form.serviceIds.length} Services gewählt</Text>
          <Text style={styles.cardValueSub}>{form.experienceYears} Jahre Erfahrung</Text>
          <Text style={styles.cardValueSub}>{form.languages.join(', ')}</Text>
        </View>

        {/* Card 3 */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Portfolio</Text>
            <TouchableOpacity onPress={() => router.push('/(provider)/register/step4')}>
              <Text style={styles.editLink}>Bearbeiten</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardValueMain, form.profilePhotoUri ? styles.greenText : styles.redText]}>
            {form.profilePhotoUri ? '✓ Profilbild' : '✗ Profilbild fehlt'}
          </Text>
          <Text style={styles.cardValueSub}>{form.portfolioUris.length} Portfolio-Fotos</Text>
          <Text style={[styles.cardValueSub, form.idDocumentUri ? styles.greenText : styles.redText]}>
            {form.idDocumentUri ? '✓ Ausweis' : '✗ Ausweis fehlt'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>WAS PASSIERT JETZT?</Text>
        
        <View style={styles.nextStepRow}>
          <View style={styles.goldCircle}><Text style={styles.goldCircleText}>1</Text></View>
          <View style={styles.nextStepContent}>
            <Text style={styles.nextStepTitle}>Prüfung deiner Angaben</Text>
            <Text style={styles.nextStepSub}>~24 Stunden</Text>
          </View>
        </View>

        <View style={styles.nextStepRow}>
          <View style={styles.goldCircle}><Text style={styles.goldCircleText}>2</Text></View>
          <View style={styles.nextStepContent}>
            <Text style={styles.nextStepTitle}>Verifizierung deines Ausweises</Text>
            <Text style={styles.nextStepSub}>~24 Stunden</Text>
          </View>
        </View>

        <View style={styles.nextStepRow}>
          <View style={styles.goldCircle}><Text style={styles.goldCircleText}>3</Text></View>
          <View style={styles.nextStepContent}>
            <Text style={styles.nextStepTitle}>Freischaltung deines Profils</Text>
            <Text style={styles.nextStepSub}>~1 Stunde</Text>
          </View>
        </View>

        <View style={styles.nextStepRow}>
          <View style={styles.goldCircle}><Text style={styles.goldCircleText}>4</Text></View>
          <View style={styles.nextStepContent}>
            <Text style={styles.nextStepTitle}>Bestätigungs-E-Mail</Text>
            <Text style={styles.nextStepSub}>Sofort</Text>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>Registrierung absenden</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={isSubmitting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ActivityIndicator size="large" color={colors.coral} />
            <Text style={styles.modalText}>{progressText}</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm
  },
  backButton: { padding: spacing.xs, marginLeft: -spacing.xs },
  progressText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary },
  
  progressBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: 4, marginBottom: spacing.md },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.coral },
  
  scrollContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xxxl, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.lg },
  
  errorBanner: { 
    flexDirection: 'column', backgroundColor: '#FFEBEE', padding: spacing.md, 
    borderRadius: borderRadius.md, marginBottom: spacing.lg,
    borderLeftWidth: 4, borderLeftColor: colors.error 
  },
  errorText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.error, marginLeft: spacing.sm, flexShrink: 1, lineHeight: 20 },
  retryBtn: { alignSelf: 'flex-end', marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  retryBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.error },
  
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  editLink: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.coral },
  cardValueMain: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: 4 },
  cardValueSub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: 2 },
  
  greenText: { color: '#4CAF50' },
  redText: { color: colors.error },
  
  sectionTitle: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.md, textTransform: 'uppercase' },
  
  nextStepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  goldCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  goldCircleText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.background },
  nextStepContent: { flex: 1, paddingTop: 6 },
  nextStepTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: 2 },
  nextStepSub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  submitButton: { backgroundColor: colors.coral, borderRadius: borderRadius.md, height: 56, justifyContent: 'center', alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.background },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', width: '70%', ...shadows.card },
  modalText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: '#555555', marginTop: spacing.md, textAlign: 'center' },
});