import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking, Alert, Modal, TextInput, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { colors, fonts, fontSizes, spacing, borderRadius, layout, shadows } from '@/theme';
import { tokenStorage } from '../../utils/token-storage';
import { PrimaryButton } from '../../components/PrimaryButton';
import { mapHttpError } from '../../utils/error-messages';
import { useLanguage } from '@/contexts/LanguageContext';
import { LEGAL_URLS } from '@/constants';
import { debugLog } from '@/utils/logger';
import { AuthService } from '@/services/authService';
import { ApiError, apiFetch } from '@/services/apiClient';


export default function SharedSettingsScreen() {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleNotificationSettings = async () => {
    await Notifications.getPermissionsAsync();
    await Linking.openSettings();
  };

  const openLegal = (url: string, title: string) => {
    router.push({ pathname: '/(shared)/legal', params: { url, title } } as any);
  };

  const handleLogout = () => {
    Alert.alert(
      t('settingsLogoutConfirm'),
      t('settingsLogoutBody'),
      [
        { text: t('cancel'), style: "cancel" },
        { 
          text: t('settingsLogout'),
          style: "destructive",
          onPress: async () => {
            try {
              await AuthService.logout();
              router.replace('/(auth)/login' as any);
            } catch (error) {
              debugLog('Error logging out:', error);
              await tokenStorage.clear();
              router.replace('/(auth)/login' as any);
            }
          }
        }
      ]
    );
  };

  const openDeleteModal = () => {
    setDeleteStep(1);
    setPassword('');
    setDeleteError('');
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    Keyboard.dismiss();
    if (!password) {
      setDeleteError(t('enterPassword'));
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      const response = await apiFetch('/users/me', {
        auth: true,
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new ApiError('Delete account failed', response.status, null);
      }

      await tokenStorage.clear();
      setDeleteModalVisible(false);
      router.replace('/(auth)/login' as any);

    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      setDeleteError(mapHttpError(status, undefined, lang));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderRow = (icon: keyof typeof Feather.glyphMap, label: string, onPress: () => void, color = colors.textPrimary) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.rowLeft}>
        <Feather name={icon} size={20} color={color} style={{ marginRight: spacing.md }} />
        <Text style={[styles.rowText, { color }]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const buildId =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();
  const versionLabel = buildId ? `HairConnekt v${appVersion} (${buildId})` : `HairConnekt v${appVersion}`;

  const handleVersionTap = () => {
    setVersionTapCount(prev => {
      const next = prev + 1;
      if (next >= 7) setDiagnosticsEnabled(true);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('back')}>
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settingsTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>{t('settingsLanguage')}</Text>
        <View style={styles.cardGroup}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langPill, lang === 'de' && styles.langPillActive]}
              onPress={() => setLang('de')}
              activeOpacity={0.8}
            >
              <Text style={[styles.langPillText, lang === 'de' && styles.langPillTextActive]}>{t('settingsLanguageDe')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langPill, lang === 'en' && styles.langPillActive]}
              onPress={() => setLang('en')}
              activeOpacity={0.8}
            >
              <Text style={[styles.langPillText, lang === 'en' && styles.langPillTextActive]}>{t('settingsLanguageEn')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('settingsAccount')}</Text>
        <View style={styles.cardGroup}>
          {renderRow("bell", t('settingsNotifications'), handleNotificationSettings)}
        </View>

        <Text style={styles.sectionTitle}>{t('settingsLegal')}</Text>
        <View style={styles.cardGroup}>
          {renderRow("shield", t('settingsPrivacy'), () => openLegal(LEGAL_URLS.privacy, t('settingsPrivacy')))}
          {renderRow("file-text", t('settingsTerms'), () => openLegal(LEGAL_URLS.terms, t('settingsTerms')))}
          {renderRow("info", t('settingsImprint'), () => openLegal(LEGAL_URLS.imprint, t('settingsImprint')))}
        </View>

        <View style={styles.mainDivider} />

        {/* LOGOUT */}
        <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('settingsLogout')}>
          <Feather name="log-out" size={20} color={colors.coral} style={{ marginRight: spacing.md }} />
          <Text style={styles.actionTextCoral}>{t('settingsLogout')}</Text>
        </TouchableOpacity>

        {/* DELETE ACCOUNT */}
        <TouchableOpacity style={styles.actionRow} onPress={openDeleteModal} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('settingsDeleteAccount')}>
          <Feather name="trash-2" size={18} color={colors.error} style={{ marginRight: spacing.md }} />
          <Text style={styles.actionTextSmallRed}>{t('settingsDeleteAccount')}</Text>
        </TouchableOpacity>

        {diagnosticsEnabled ? (
          <>
            <Text style={styles.sectionTitle}>{t('settingsDiagnostics')}</Text>
            <View style={styles.cardGroup}>
              {renderRow('activity', t('settingsDiagnosticsSendSentry'), () => {
                Sentry.captureException(new Error('Sentry test event'));
                Alert.alert(t('done'), t('settingsDiagnosticsSent'));
              })}
            </View>
          </>
        ) : null}

        <TouchableOpacity onPress={handleVersionTap} activeOpacity={0.7}>
          <Text style={styles.versionText}>{versionLabel}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* DELETE ACCOUNT MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.modalContent}>
            
            {deleteStep === 1 ? (
              <>
                <View style={styles.modalIconCircle}>
                  <Feather name="alert-triangle" size={32} color={colors.error} />
                </View>
                <Text style={styles.modalTitle}>{t('settingsDeleteTitle')}</Text>
                <Text style={styles.modalBody}>{t('settingsDeleteBody')}</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalBtnOutline} onPress={() => setDeleteModalVisible(false)}>
                    <Text style={styles.modalBtnOutlineText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnSolid} onPress={() => setDeleteStep(2)}>
                    <Text style={styles.modalBtnSolidText}>{t('next')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{t('settingsDeleteEnterPassword')}</Text>
                <Text style={styles.modalBody}>{t('settingsDeletePasswordBody')}</Text>
                
                {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
                
                <TextInput
                  ref={passwordRef}
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('password')}
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleConfirmDelete}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalBtnOutline} onPress={() => setDeleteModalVisible(false)}>
                    <Text style={styles.modalBtnOutlineText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <PrimaryButton 
                      label={t('settingsDeleteFinal')} 
                      onPress={handleConfirmDelete}
                      loading={isDeleting}
                    />
                  </View>
                </View>
              </>
            )}

          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    backgroundColor: colors.background,
  },
  backButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl2 + spacing.l },

  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.md, marginTop: spacing.sm },
  
  cardGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.card,
    marginBottom: spacing.xl,
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  langStaticTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  langStaticNote: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  langPill: {
    flex: 1,
    minHeight: layout.inputHeight,
    borderRadius: borderRadius.full,
    borderWidth: spacing.unit,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  langPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  langPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  langPillTextActive: {
    color: colors.primary,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md },
  divider: { height: spacing.unit, backgroundColor: colors.border, marginHorizontal: spacing.lg },

  mainDivider: { height: spacing.unit, backgroundColor: colors.border, marginVertical: spacing.md, marginHorizontal: spacing.xl },

  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  actionTextCoral: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.coral },
  actionTextSmallRed: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.error },

  versionText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl2 },

  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xl, alignItems: 'center' },
  modalIconCircle: { width: layout.avatarMd, height: layout.avatarMd, borderRadius: layout.iconButton - spacing.xxxs, backgroundColor: colors.errorLight, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md },
  modalBody: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: spacing.lg - spacing.xxxs },
  
  passwordInput: {
    width: '100%',
    height: layout.inputHeightMd,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    marginBottom: spacing.xl,
    borderWidth: spacing.unit,
    borderColor: colors.border,
  },
  errorText: { color: colors.error, fontFamily: fonts.body, fontSize: fontSizes.sm, marginBottom: spacing.md, textAlign: 'center' },

  modalButtons: { flexDirection: 'row', width: '100%' },
  modalBtnOutline: { flex: 1, height: layout.inputHeightMd, borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs, borderWidth: spacing.unit, borderColor: colors.borderStrong, justifyContent: 'center', alignItems: 'center' },
  modalBtnOutlineText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textSecondary },
  modalBtnSolid: { flex: 1, height: layout.inputHeightMd, borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs, backgroundColor: colors.coral, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.md },
  modalBtnSolidText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.background },
});
