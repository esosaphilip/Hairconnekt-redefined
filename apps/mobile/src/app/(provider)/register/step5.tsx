import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { tokenStorage } from '../../../utils/token-storage';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch, apiJson } from '@/services/apiClient';

type RegisterAuthResponse = {
  accessToken: string;
  refreshToken: string;
};

type ReactNativeFile = Blob & {
  uri: string;
  type: string;
  name: string;
};

export default function RegisterStep5Screen() {
  const router = useRouter();
  const { form, reset } = useRegistration();
  const { t } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const languageLabel = (value: string): string => {
    if (value === 'Deutsch') return t('languageGerman');
    if (value === 'Englisch') return t('languageEnglish');
    if (value === 'Französisch') return t('languageFrench');
    if (value === 'Arabisch') return t('languageArabic');
    if (value === 'Türkisch') return t('languageTurkish');
    return value;
  };

  const createImageFormData = (
    fieldName: 'avatar' | 'idDocument' | 'portfolio',
    uri: string,
    filename: string,
  ): FormData => {
    const formData = new FormData();
    const file: ReactNativeFile = {
      uri,
      type: 'image/jpeg',
      name: filename,
    } as ReactNativeFile;
    formData.append(fieldName, file);
    return formData;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // STEP 1: Create user account
      setProgressText(t('providerRegisterSubmittingAccount'));
      const authData = await apiJson<RegisterAuthResponse>('/auth/register', {
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
      const token = authData.accessToken;

      // STEP 2: Upload user avatar (BUG 9: before providers/register so the user exists)
      setProgressText(t('providerRegisterUploadingProfilePhoto'));
      if (form.profilePhotoUri) {
        const fd = createImageFormData('avatar', form.profilePhotoUri, 'avatar.jpg');
        await apiFetch('/users/me/avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      // STEP 3: Create provider profile record
      setProgressText(t('providerRegisterCreatingProfile'));
      const provRes = await apiFetch('/providers/register', {
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
        throw new Error(t('providerRegisterProfileCreateFailed'));
      }

      // STEP 4: Upload ID document (BUG 9: requires provider record to exist)
      setProgressText(t('providerRegisterUploadingId'));
      if (form.idDocumentUri) {
        const fd = createImageFormData('idDocument', form.idDocumentUri, 'id-doc.jpg');
        await apiFetch('/providers/me/id-document', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      // STEP 5: Upload portfolio images
      setProgressText(t('providerRegisterUploadingPortfolio'));
      for (const uri of form.portfolioUris) {
        const fd = createImageFormData('portfolio', uri, 'portfolio.jpg');
        await apiFetch('/providers/me/portfolio', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }

      setProgressText(t('done'));
      await tokenStorage.save(token, authData.refreshToken, 'provider');
      reset();
      router.replace(`/(provider)/verify-email?email=${encodeURIComponent(form.email)}` as any);

    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError(t('providerRegisterEmailTaken'));
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('errorUnknown'));
      }
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
        <Text style={styles.progressText}>{t('providerRegisterProgress').replace('{step}', '5').replace('{total}', '5')}</Text>
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
        <Text style={styles.title}>{t('providerRegisterSummaryTitle')}</Text>
        <Text style={styles.subtitle}>{t('providerRegisterSummarySubtitle')}</Text>

        {error && (
          <View style={styles.errorBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
              <Feather name="alert-circle" size={20} color={colors.error} style={{ marginTop: spacing.xxxs }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity onPress={handleSubmit} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>{t('appointmentsRetry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Card 1 */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('providerRegisterSummaryBusinessTitle')}</Text>
            <TouchableOpacity onPress={() => router.push('/(provider)/register/step2')}>
              <Text style={styles.editLink}>{t('edit')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardValueMain}>{form.businessName}</Text>
          <Text style={styles.cardValueSub}>{form.street} {form.houseNumber}, {form.postalCode} {form.city}</Text>
          <Text style={styles.cardValueSub}>{t('providerRegisterRadiusLabel').replace('{km}', String(form.serviceRadius))}</Text>
        </View>

        {/* Card 2 */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('providerRegisterSummaryServicesTitle')}</Text>
            <TouchableOpacity onPress={() => router.push('/(provider)/register/step3')}>
              <Text style={styles.editLink}>{t('edit')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardValueMain}>{t('providerRegisterSummaryServicesSelected').replace('{count}', String(form.serviceIds.length))}</Text>
          <Text style={styles.cardValueSub}>{t('providerRegisterStep3ExperienceYears').replace('{years}', String(form.experienceYears ?? 0))}</Text>
          <Text style={styles.cardValueSub}>{(form.languages ?? []).map(languageLabel).join(', ')}</Text>
        </View>

        {/* Card 3 */}
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('providerRegisterSummaryPortfolioTitle')}</Text>
            <TouchableOpacity onPress={() => router.push('/(provider)/register/step4')}>
              <Text style={styles.editLink}>{t('edit')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardValueMain, form.profilePhotoUri ? styles.greenText : styles.redText]}>
            {form.profilePhotoUri ? t('providerRegisterSummaryProfilePhotoOk') : t('providerRegisterSummaryProfilePhotoMissing')}
          </Text>
          <Text style={styles.cardValueSub}>{t('providerRegisterSummaryPortfolioPhotos').replace('{count}', String(form.portfolioUris.length))}</Text>
          <Text style={[styles.cardValueSub, form.idDocumentUri ? styles.greenText : styles.redText]}>
            {form.idDocumentUri ? t('providerRegisterSummaryIdOk') : t('providerRegisterSummaryIdMissing')}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('providerRegisterNextStepsTitle')}</Text>
        
        <View style={styles.nextStepRow}>
          <View style={styles.goldCircle}><Text style={styles.goldCircleText}>1</Text></View>
          <View style={styles.nextStepContent}>
            <Text style={styles.nextStepTitle}>{t('providerRegisterNextStep1Title')}</Text>
            <Text style={styles.nextStepSub}>{t('providerRegisterNextStepTime24h')}</Text>
          </View>
        </View>

        <View style={styles.nextStepRow}>
          <View style={styles.goldCircle}><Text style={styles.goldCircleText}>2</Text></View>
          <View style={styles.nextStepContent}>
            <Text style={styles.nextStepTitle}>{t('providerRegisterNextStep2Title')}</Text>
            <Text style={styles.nextStepSub}>{t('providerRegisterNextStepTime24h')}</Text>
          </View>
        </View>

        <View style={styles.nextStepRow}>
          <View style={styles.goldCircle}><Text style={styles.goldCircleText}>3</Text></View>
          <View style={styles.nextStepContent}>
            <Text style={styles.nextStepTitle}>{t('providerRegisterNextStep3Title')}</Text>
            <Text style={styles.nextStepSub}>{t('providerRegisterNextStepTime1h')}</Text>
          </View>
        </View>

        <View style={styles.nextStepRow}>
          <View style={styles.goldCircle}><Text style={styles.goldCircleText}>4</Text></View>
          <View style={styles.nextStepContent}>
            <Text style={styles.nextStepTitle}>{t('providerRegisterNextStep4Title')}</Text>
            <Text style={styles.nextStepSub}>{t('providerRegisterNextStepTimeImmediate')}</Text>
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
            <Text style={styles.submitButtonText}>{t('providerRegisterSubmit')}</Text>
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
  
  progressBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.xxs, marginBottom: spacing.md },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.coral },
  
  scrollContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xxxl, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.lg },
  
  errorBanner: { 
    flexDirection: 'column', backgroundColor: colors.errorLightSolid, padding: spacing.md, 
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
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  editLink: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.coral },
  cardValueMain: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xxs },
  cardValueSub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xxxs },
  
  greenText: { color: colors.successAlt },
  redText: { color: colors.error },
  
  sectionTitle: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.md, textTransform: 'uppercase' },
  
  nextStepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  goldCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  goldCircleText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.background },
  nextStepContent: { flex: 1, paddingTop: spacing.xxs + spacing.xxxs },
  nextStepTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xxxs },
  nextStepSub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  submitButton: { backgroundColor: colors.coral, borderRadius: borderRadius.md, height: 56, justifyContent: 'center', alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.background },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.lg, alignItems: 'center', width: '70%', ...shadows.card },
  modalText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
});
