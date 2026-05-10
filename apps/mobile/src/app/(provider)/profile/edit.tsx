import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { colors, fonts, fontSizes, spacing, shadows } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { FormInput } from '../../../components/FormInput';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch, apiJson } from '@/services/apiClient';

const AVAILABLE_LANGUAGES = [
  { value: 'Deutsch', labelKey: 'languageGerman' },
  { value: 'Englisch', labelKey: 'languageEnglish' },
  { value: 'Französisch', labelKey: 'languageFrench' },
  { value: 'Arabisch', labelKey: 'languageArabic' },
  { value: 'Türkisch', labelKey: 'languageTurkish' },
  { value: 'Hausa', labelKey: 'languageHausa' },
  { value: 'Yoruba', labelKey: 'languageYoruba' },
  { value: 'Igbo', labelKey: 'languageIgbo' },
];

type CancellationPolicy = '24h' | '48h' | '72h';

export default function EditProfileScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const businessNameRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const streetRef = useRef<TextInput>(null);
  const houseNumberRef = useRef<TextInput>(null);
  const postalCodeRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);

  const [form, setForm] = useState({
    businessName: '',
    bio: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    cancellationPolicy: '24h' as CancellationPolicy,
    languages: [] as string[],
    serviceRadius: 15,
  });

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  // BUG 4: bump after upload to force Image re-render
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);
  const [errorAction, setErrorAction] = useState<'load' | 'save' | 'avatar'>('load');
  const [lastAvatarUploadUri, setLastAvatarUploadUri] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      setErrorStatus(undefined);
      const data = await apiJson<any>('/providers/me', { auth: true, timeoutMs: 20000, retryCount: 1 });
      setForm({
        businessName: data.businessName || '',
        bio: data.bio || '',
        street: data.street || '',
        houseNumber: data.houseNumber || '',
        postalCode: data.postalCode || '',
        city: data.city || '',
        cancellationPolicy: (data.cancellationPolicy as CancellationPolicy) || '24h',
        languages: data.languages || [],
        serviceRadius: data.serviceRadius || 15,
      });
      if (data.avatarUrl) {
        setAvatarUri(data.avatarUrl);
      }
    } catch (error: any) {
      setErrorAction('load');
      setErrorStatus(error?.status ?? error?.response?.status);
      setErrorMessage(error?.message ?? t('errorUnknown'));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    try {
      setIsSaving(true);
      setErrorVisible(false);
      await apiJson<any>('/providers/me', {
        method: 'PATCH',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        timeoutMs: 20000,
      });

      router.back();
    } catch (error: any) {
      setErrorAction('save');
      setErrorStatus(error?.status ?? error?.response?.status);
      setErrorMessage(error?.message ?? t('errorUnknown'));
      setErrorVisible(true);
    } finally {
      setIsSaving(false);
    }
  };

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking avatar', error);
      setErrorMessage(t('providerEditPickImageError'));
      setErrorVisible(true);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setIsUploadingAvatar(true);
      setErrorVisible(false);
      setLastAvatarUploadUri(uri);
      
      // Optimistically show it
      setAvatarUri(uri);

      const formData = new FormData();
      
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const response = await apiFetch('/providers/me/avatar', {
        method: 'POST',
        auth: true,
        body: formData,
        timeoutMs: 60000,
      });

      if (!response.ok) {
        throw { status: response.status };
      }
      // BUG 4: bust cache so Image re-renders with new photo
      setAvatarVersion(Date.now());
    } catch (error: any) {
      setErrorAction('avatar');
      setErrorStatus(error?.status ?? error?.response?.status);
      setErrorMessage(error?.message ?? t('errorUnknown'));
      setErrorVisible(true);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setForm(prev => {
      if (prev.languages.includes(lang)) {
        return { ...prev, languages: prev.languages.filter(l => l !== lang) };
      } else {
        return { ...prev, languages: [...prev.languages, lang] };
      }
    });
  };

  const handleRetry = async () => {
    if (errorAction === 'save') {
      await handleSave();
      return;
    }
    if (errorAction === 'avatar') {
      if (lastAvatarUploadUri) {
        await uploadAvatar(lastAvatarUploadUri);
      }
      return;
    }
    await loadProfile();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('providerEditTitle')}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={styles.headerSaveText}>{t('save')}</Text>
        </TouchableOpacity>
      </View>

      <GermanErrorBanner
        visible={errorVisible}
        statusCode={errorStatus}
        message={errorMessage}
        actionLabel={t('appointmentsRetry')}
        onAction={handleRetry}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} activeOpacity={0.8}>
              {avatarUri ? (
                <Image key={`avatar-${avatarVersion}`} source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Feather name="user" size={48} color={colors.primaryLight} />
                </View>
              )}
              
              {isUploadingAvatar && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.background} />
                </View>
              )}

              <View style={styles.cameraIconContainer}>
                <Feather name="camera" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>

          <FormInput
            ref={businessNameRef}
            label={t('providerEditName')}
            value={form.businessName}
            onChangeText={(val) => setForm({ ...form, businessName: val })}
            placeholder={t('providerEditDisplayNamePlaceholder')}
            maxLength={100}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => bioRef.current?.focus()}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('providerEditBio')}</Text>
            <TextInput
              ref={bioRef}
              style={styles.bioInput}
              value={form.bio}
              onChangeText={(val) => setForm({ ...form, bio: val })}
              placeholder={t('providerEditBioPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={500}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => streetRef.current?.focus()}
            />
            <Text style={styles.charCount}>{form.bio.length}/500</Text>
          </View>

          <View style={styles.rowInputs}>
            <View style={{ flex: 2, marginRight: spacing.md }}>
              <FormInput
                ref={streetRef}
                label={t('providerEditStreet')}
                value={form.street}
                onChangeText={(val) => setForm({ ...form, street: val })}
                placeholder="Musterstr."
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => houseNumberRef.current?.focus()}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput
                ref={houseNumberRef}
                label={t('providerEditHouseNumber')}
                value={form.houseNumber}
                onChangeText={(val) => setForm({ ...form, houseNumber: val })}
                placeholder="12a"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => postalCodeRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.rowInputs}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <FormInput
                ref={postalCodeRef}
                label={t('providerEditPostalCode')}
                value={form.postalCode}
                onChangeText={(val) => setForm({ ...form, postalCode: val })}
                placeholder="10115"
                keyboardType="number-pad"
                inputMode="numeric"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => cityRef.current?.focus()}
              />
            </View>
            <View style={{ flex: 2 }}>
              <FormInput
                ref={cityRef}
                label={t('providerEditCity')}
                value={form.city}
                onChangeText={(val) => setForm({ ...form, city: val })}
                placeholder="Berlin"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t('providerEditRadius')}: {form.serviceRadius} km
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={5}
              maximumValue={50}
              step={5}
              value={form.serviceRadius}
              onValueChange={(val) => setForm({ ...form, serviceRadius: val })}
              minimumTrackTintColor={colors.coral}
              maximumTrackTintColor={colors.borderStrong}
              thumbTintColor={colors.coral}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.sectionTitle}>{t('providerEditLanguages')}</Text>
            <View style={styles.chipContainer}>
              {AVAILABLE_LANGUAGES.map((item) => {
                const isSelected = form.languages.includes(item.value);
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleLanguage(item.value)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{t(item.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.sectionTitle}>{t('providerEditCancellation')}</Text>

            <TouchableOpacity
              style={[styles.radioCard, form.cancellationPolicy === '24h' && styles.radioCardSelected]}
              onPress={() => setForm({ ...form, cancellationPolicy: '24h' })}
              activeOpacity={0.8}
            >
              <View style={styles.radioHeader}>
                <Text style={[styles.radioTitle, form.cancellationPolicy === '24h' && styles.radioTitleSelected]}>
                  {t('providerEditCancel24')}
                </Text>
                <View style={[styles.radioCircle, form.cancellationPolicy === '24h' && styles.radioCircleSelected]}>
                  {form.cancellationPolicy === '24h' && <View style={styles.radioInnerCircle} />}
                </View>
              </View>
              <Text style={styles.radioDesc}>{t('providerEditCancel24Desc')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.radioCard, form.cancellationPolicy === '48h' && styles.radioCardSelected]}
              onPress={() => setForm({ ...form, cancellationPolicy: '48h' })}
              activeOpacity={0.8}
            >
              <View style={styles.radioHeader}>
                <Text style={[styles.radioTitle, form.cancellationPolicy === '48h' && styles.radioTitleSelected]}>
                  {t('providerEditCancel48')}
                </Text>
                <View style={[styles.radioCircle, form.cancellationPolicy === '48h' && styles.radioCircleSelected]}>
                  {form.cancellationPolicy === '48h' && <View style={styles.radioInnerCircle} />}
                </View>
              </View>
              <Text style={styles.radioDesc}>{t('providerEditCancel48Desc')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.radioCard, form.cancellationPolicy === '72h' && styles.radioCardSelected]}
              onPress={() => setForm({ ...form, cancellationPolicy: '72h' })}
              activeOpacity={0.8}
            >
              <View style={styles.radioHeader}>
                <Text style={[styles.radioTitle, form.cancellationPolicy === '72h' && styles.radioTitleSelected]}>
                  {t('providerEditCancel72')}
                </Text>
                <View style={[styles.radioCircle, form.cancellationPolicy === '72h' && styles.radioCircleSelected]}>
                  {form.cancellationPolicy === '72h' && <View style={styles.radioInnerCircle} />}
                </View>
              </View>
              <Text style={styles.radioDesc}>{t('providerEditCancel72Desc')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label={t('providerEditSave')} onPress={handleSave} loading={isSaving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: { minWidth: 60, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  headerSaveText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.teal, textAlign: 'right' },

  scrollContainer: { padding: spacing.lg, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 60 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },

  inputGroup: { marginBottom: spacing.xl },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.sm },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.md },
  
  bioInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 120,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  charCount: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: 4 },

  slider: { width: '100%', height: 40 },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
  chipTextSelected: { color: colors.background },

  radioCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#EEEEEE',
    ...shadows.card,
  },
  radioCardSelected: { borderColor: colors.coral, backgroundColor: '#FFF9F8' },
  radioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  radioTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  radioTitleSelected: { color: colors.coral },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: { borderColor: colors.coral },
  radioInnerCircle: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.coral },
  radioDesc: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }
});
