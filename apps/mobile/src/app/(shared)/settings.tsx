import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking, Alert, Modal, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
// Temporarily comment out Notifications to avoid Expo Go SDK 53 errors
// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
import { colors, fonts, fontSizes, spacing, borderRadius, layout, shadows } from '@/theme';
import { tokenStorage } from '../../utils/token-storage';
import { PrimaryButton } from '../../components/PrimaryButton';
import { mapHttpError } from '../../utils/error-messages';
import { API } from '../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';


export default function SharedSettingsScreen() {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  async function registerForPushNotificationsAsync() {
    // Dummy implementation for Expo Go
    console.log('Push notifications mocked for Expo Go');
  }

  const handleLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), t('errorOpenLink'));
    });
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
              const token = await tokenStorage.getAccessToken();
              const refreshToken = await tokenStorage.getRefreshToken();

              if (refreshToken) {
                await fetch(`${API}/auth/logout`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ refreshToken })
                });
              }

              await tokenStorage.clear();
              router.replace('/(auth)/login' as any);
            } catch (error) {
              console.log('Error logging out:', error);
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
    if (!password) {
      setDeleteError(t('enterPassword'));
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      const token = await tokenStorage.getAccessToken();
      
      const response = await fetch(`${API}/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        throw { response: { status: response.status } };
      }

      await tokenStorage.clear();
      setDeleteModalVisible(false);
      router.replace('/(auth)/login' as any);

    } catch (error: any) {
      setDeleteError(mapHttpError(error?.response?.status, undefined, lang));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderRow = (icon: keyof typeof Feather.glyphMap, label: string, onPress: () => void, color = colors.textPrimary) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <Feather name={icon} size={20} color={color} style={{ marginRight: spacing.md }} />
        <Text style={[styles.rowText, { color }]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settingsTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>{t('settingsLanguage')}</Text>
        <View style={styles.cardGroup}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langPill, lang === 'de' && styles.langPillActive]}
              onPress={() => setLang('de')}
              activeOpacity={0.7}
            >
              <Text style={[styles.langPillText, lang === 'de' && styles.langPillTextActive]}>
                {t('settingsLanguageDe')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langPill, lang === 'en' && styles.langPillActive]}
              onPress={() => setLang('en')}
              activeOpacity={0.7}
            >
              <Text style={[styles.langPillText, lang === 'en' && styles.langPillTextActive]}>
                {t('settingsLanguageEn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('settingsAccount')}</Text>
        <View style={styles.cardGroup}>
          {renderRow("bell", t('settingsNotifications'), () => router.push('/(shared)/notifications' as any))}
        </View>

        <Text style={styles.sectionTitle}>{t('settingsLegal')}</Text>
        <View style={styles.cardGroup}>
          {renderRow("shield", t('settingsPrivacy'), () => handleLink('https://hairconnekt.de/privacy'))}
          <View style={styles.divider} />
          {renderRow("file-text", t('settingsTerms'), () => handleLink('https://hairconnekt.de/terms'))}
          <View style={styles.divider} />
          {renderRow("info", t('settingsImprint'), () => handleLink('https://hairconnekt.de/impressum'))}
        </View>

        <View style={styles.mainDivider} />

        {/* LOGOUT */}
        <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={20} color={colors.coral} style={{ marginRight: spacing.md }} />
          <Text style={styles.actionTextCoral}>{t('settingsLogout')}</Text>
        </TouchableOpacity>

        {/* DELETE ACCOUNT */}
        <TouchableOpacity style={styles.actionRow} onPress={openDeleteModal} activeOpacity={0.7}>
          <Feather name="trash-2" size={18} color={colors.error} style={{ marginRight: spacing.md }} />
          <Text style={styles.actionTextSmallRed}>{t('settingsDeleteAccount')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>HairConnekt v1.0.0</Text>

      </ScrollView>

      {/* DELETE ACCOUNT MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
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
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('password')}
                  secureTextEntry
                  autoCapitalize="none"
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
        </View>
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
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  scrollContent: { padding: spacing.lg, paddingBottom: 60 },

  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: '#1A1A1A', marginBottom: spacing.md, marginTop: spacing.sm },
  
  cardGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    ...shadows.card,
    marginBottom: spacing.xl,
  },
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  langPill: {
    flex: 1,
    minHeight: layout.inputHeight,
    borderRadius: borderRadius.full,
    borderWidth: 1,
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
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },

  mainDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md, marginHorizontal: spacing.xl },

  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  actionTextCoral: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.coral },
  actionTextSmallRed: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.error },

  versionText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: '#AAAAAA', textAlign: 'center', marginTop: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.xl, alignItems: 'center' },
  modalIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md },
  modalBody: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 22 },
  
  passwordInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    marginBottom: spacing.xl,
  },
  errorText: { color: colors.error, fontFamily: fonts.body, fontSize: fontSizes.sm, marginBottom: spacing.md, textAlign: 'center' },

  modalButtons: { flexDirection: 'row', width: '100%' },
  modalBtnOutline: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center', alignItems: 'center' },
  modalBtnOutlineText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textSecondary },
  modalBtnSolid: { flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.coral, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.md },
  modalBtnSolidText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.background },
});
