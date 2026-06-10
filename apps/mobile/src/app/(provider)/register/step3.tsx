import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { API } from '../../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';

const LANGUAGE_CODE_MAP = {
  de: 'de',
  en: 'en',
  fr: 'fr',
  ar: 'ar',
  tr: 'tr',
  Deutsch: 'de',
  Englisch: 'en',
  Französisch: 'fr',
  Arabisch: 'ar',
  Türkisch: 'tr',
} as const;

const normalizeLanguageValue = (value: string): string =>
  LANGUAGE_CODE_MAP[value as keyof typeof LANGUAGE_CODE_MAP] ?? value;

const normalizeLanguages = (values: string[] | undefined): string[] => {
  const normalized = (values ?? ['de']).map(normalizeLanguageValue);
  return Array.from(new Set(normalized));
};

export default function RegisterStep3Screen() {
  const router = useRouter();
  const { form, update } = useRegistration();
  const { t } = useLanguage();

  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>(form.serviceIds || []);
  const [experienceYears, setExperienceYears] = useState(form.experienceYears || 1);
  const [languages, setLanguages] = useState<string[]>(normalizeLanguages(form.languages));
  
  const policyValues = ['24h', '48h', '72h'] as const;
  type PolicyType = typeof policyValues[number];
  
  const initialPolicy = form.cancellationPolicy && policyValues.includes(form.cancellationPolicy as any) 
    ? (form.cancellationPolicy as PolicyType) 
    : '24h';
    
  const [cancellationPolicy, setCancellationPolicy] = useState<PolicyType>(initialPolicy);
  const [bio, setBio] = useState(form.bio || '');

  const availableLanguages: {
    value: string;
    labelKey:
      | 'languageGerman'
      | 'languageEnglish'
      | 'languageFrench'
      | 'languageArabic'
      | 'languageTurkish';
  }[] = [
    { value: 'de', labelKey: 'languageGerman' },
    { value: 'en', labelKey: 'languageEnglish' },
    { value: 'fr', labelKey: 'languageFrench' },
    { value: 'ar', labelKey: 'languageArabic' },
    { value: 'tr', labelKey: 'languageTurkish' },
  ];

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const res = await fetch(`${API}/services/categories`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setAvailableCategories(data || []);
      } catch (err) {
        setServicesError(true);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  const toggleService = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (lang: string) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]
    );
  };

  const handleNext = () => {
    Keyboard.dismiss();
    if (languages.length === 0) return;
    update({
      serviceIds: selectedIds,
      experienceYears,
      languages: normalizeLanguages(languages),
      cancellationPolicy,
      bio: bio.trim(),
    });
    router.push('/(provider)/register/step4');
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.progressText}>{t('providerRegisterProgress').replace('{step}', '3').replace('{total}', '5')}</Text>
        <View style={{ width: fontSizes.xxl }} />
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('providerRegisterStep3SpecialisationsTitle')}</Text>
            <Text style={styles.sectionSubtitle}>{t('providerRegisterStep3SpecialisationsSubtitle')}</Text>
            
            {loadingServices ? (
              <ActivityIndicator size="small" color={colors.coral} style={{ marginVertical: spacing.md }} />
            ) : servicesError ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={fontSizes.xl} color={colors.error} />
                <Text style={styles.errorText}>{t('providerRegisterStep3ServicesLoadError')}</Text>
              </View>
            ) : (
              <View style={styles.chipsRow}>
                {availableCategories.map((cat) => {
                  const isSelected = selectedIds.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleService(cat.id)}
                      style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                    >
                      <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('providerRegisterStep3ExperienceTitle')}</Text>
            <Text style={styles.experienceLabel}>{t('providerRegisterStep3ExperienceYears').replace('{years}', String(experienceYears))}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={20}
              step={1}
              value={experienceYears}
              onValueChange={setExperienceYears}
              minimumTrackTintColor={colors.coral}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.coral}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('providerRegisterStep3LanguagesTitle')}</Text>
            <View style={styles.chipsRow}>
              {availableLanguages.map((item) => {
                const isSelected = languages.includes(item.value);
                return (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => toggleLanguage(item.value)}
                    style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                  >
                    <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                      {t(item.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {languages.length === 0 && (
              <Text style={styles.languagesErrorText}>{t('providerRegisterStep3LanguagesRequired')}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('providerRegisterStep3CancellationTitle')}</Text>
            <View style={styles.pillsRow}>
              {policyValues.map((policy) => {
                const isSelected = cancellationPolicy === policy;
                return (
                  <TouchableOpacity
                    key={policy}
                    onPress={() => setCancellationPolicy(policy)}
                    style={[styles.pill, isSelected ? styles.pillSelected : styles.pillUnselected]}
                  >
                    <Text style={[styles.pillText, isSelected ? styles.pillTextSelected : styles.pillTextUnselected]}>
                      {policy}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.section, { borderBottomWidth: spacing.none }]}>
            <Text style={styles.sectionTitle}>{t('providerRegisterStep3AboutTitle')}</Text>
            <TextInput
              style={styles.textArea}
              multiline
              maxLength={500}
              value={bio}
              onChangeText={setBio}
              placeholder={t('providerRegisterStep3BioPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={styles.charCounter}>{bio.length}/500</Text>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton 
            label={t('next')} 
            onPress={handleNext} 
            variant="filled" 
            disabled={languages.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm
  },
  backButton: { padding: spacing.xs, marginLeft: -spacing.xs },
  progressText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary },
  
  progressBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.xxs, marginBottom: spacing.md },
  progressSegment: { flex: 1, height: spacing.xxs, borderRadius: borderRadius.xs, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.coral },
  
  scrollContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  
  section: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xs },
  sectionSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
  
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorLight, padding: spacing.sm, borderRadius: borderRadius.sm, marginBottom: spacing.sm },
  errorText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.error, marginLeft: spacing.sm },
  
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: spacing.unit },
  chipSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipUnselected: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm },
  chipTextSelected: { color: colors.background },
  chipTextUnselected: { color: colors.textPrimary },
  
  experienceLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.sm },
  slider: { width: '100%', height: layout.inputHeight },
  
  pillsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  pill: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  pillSelected: { backgroundColor: colors.coral },
  pillUnselected: { backgroundColor: colors.surface },
  pillText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md },
  pillTextSelected: { color: colors.background },
  pillTextUnselected: { color: colors.textSecondary },

  languagesErrorText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.error, marginTop: spacing.xs },
  
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: spacing.unit,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    height: layout.avatarXl,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  charCounter: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'right', marginTop: spacing.xs },
  
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: spacing.unit, borderTopColor: colors.border },
});
