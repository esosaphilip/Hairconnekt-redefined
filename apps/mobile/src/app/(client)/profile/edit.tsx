import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing } from '../../../theme';
import { mapHttpError } from '../../../utils/error-messages';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch, apiJson } from '@/services/apiClient';
import { debugError } from '@/utils/logger';


export default function ClientProfileEditScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      const data: any = await apiJson('/users/me', { auth: true });
      if (data) {
        if (data.avatarUrl || data.data?.avatarUrl) {
          setAvatarUri(data.avatarUrl || data.data.avatarUrl);
        }
        setFirstName(data.firstName || data.data?.firstName || '');
        setLastName(data.lastName || data.data?.lastName || '');
        setEmail(data.email || data.data?.email || '');
        setPhone(data.phone || data.data?.phone || '');
      }
    } catch (error: any) {
      debugError('Client profile load failed', error);
      setErrorMessage(mapHttpError(error?.status || 500, undefined, lang));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage(t('personalInfoNameRequired'));
      setErrorVisible(true);
      return;
    }

    try {
      setIsSaving(true);
      setErrorVisible(false);

      const res = await apiFetch('/users/me', {
        auth: true,
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firstName, lastName, phone })
      });

      if (res.ok) {
        router.back();
      } else {
        const status = res.status;
        setErrorMessage(mapHttpError(status, undefined, lang));
        setErrorVisible(true);
      }
    } catch (error: any) {
      debugError('Client profile save failed', error);
      setErrorMessage(mapHttpError(500, undefined, lang));
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
      debugError('Client avatar selection failed', error);
      setErrorMessage(t('personalInfoPickImageError'));
      setErrorVisible(true);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setIsUploadingAvatar(true);
      setErrorVisible(false);

      const formData = new FormData();

      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const response = await apiFetch('/users/me/avatar', {
        auth: true,
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(mapHttpError(response.status, undefined, lang));
      }

      const data = await response.json();
      setAvatarUri(data.avatarUrl || uri);
      setAvatarVersion(Date.now());
    } catch (error: any) {
      debugError('Client avatar upload failed', error);
      setErrorMessage(error.message || mapHttpError(500, undefined, lang));
      setErrorVisible(true);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('personalInfoTitle')}</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveButtonTextContainer}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.teal} />
            ) : (
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} onDismiss={() => setErrorVisible(false)} />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={pickAvatar}
              activeOpacity={0.8}
              disabled={isUploadingAvatar}
            >
              {avatarUri ? (
                <>
                  <Image
                    source={{ uri: avatarUri }}
                    key={`avatar-${avatarVersion}`}
                    style={styles.avatarImage}
                  />
                  {isUploadingAvatar && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color={colors.surface} />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Feather name="user" size={40} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Feather name="camera" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>{t('personalInfoAvatar')}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('personalInfoFirstName')}</Text>
            <TextInput
              ref={firstNameRef}
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('personalInfoFirstName')}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('personalInfoLastName')}</Text>
            <TextInput
              ref={lastNameRef}
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('personalInfoLastName')}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('personalInfoEmail')}</Text>
            <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} selectTextOnFocus={false} />
            <Text style={styles.hintText}>{t('personalInfoEmailNote')}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('personalInfoPhone')}</Text>
            <TextInput
              ref={phoneRef}
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+49 ..."
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              inputMode="tel"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('personalInfoSave')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  safeContainer: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.primary },
  saveButtonTextContainer: { width: 70, alignItems: 'flex-end' },
  saveButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.teal },

  content: { flex: 1 },
  contentInner: { padding: spacing.xl },

  inputGroup: { marginBottom: spacing.lg },
  inputLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputDisabled: { opacity: 0.5, backgroundColor: colors.surface, borderColor: colors.border },
  hintText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 4 },

  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: { backgroundColor: colors.coral, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.background },
});
