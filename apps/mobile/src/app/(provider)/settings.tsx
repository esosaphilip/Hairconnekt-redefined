import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows } from '../../theme';
import { tokenStorage } from '../../utils/token-storage';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function ProviderSettingsScreen() {
  const router = useRouter();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Fehler', 'Konnte den Link nicht öffnen.');
    });
  };

  const handlePauseAccount = () => {
    Alert.alert(
      "Account wirklich pausieren?",
      "Du kannst deinen Account jederzeit wieder aktivieren.",
      [
        { text: "Abbrechen", style: "cancel" },
        { 
          text: "Pausieren", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await tokenStorage.getAccessToken();
              await fetch(`${API}/providers/me`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isOnline: false })
              });
              router.back();
            } catch (error) {
              console.log('Error pausing account:', error);
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Wirklich abmelden?",
      "Möchtest du dich wirklich ausloggen?",
      [
        { text: "Abbrechen", style: "cancel" },
        { 
          text: "Abmelden", 
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
                }).catch(() => {});
              }
            } catch (error) {
              console.log('Error pausing account:', error);
              setDeleteError('Fehler beim Pausieren. Bitte versuche es erneut.');
            } finally {
              await tokenStorage.clear();
              router.replace('/(auth)/login?role=provider');
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
      setDeleteError('Bitte Passwort eingeben');
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
      router.replace('/(auth)/login?role=provider');

    } catch (error: any) {
      setDeleteError(mapHttpError(error?.response?.status));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderRow = (icon: any, label: string, onPress: () => void, color = colors.textPrimary) => (
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
        <Text style={styles.headerTitle}>Einstellungen</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* SECTION: PROFIL */}
        <Text style={styles.sectionTitle}>Profil</Text>
        <View style={styles.cardGroup}>
          {renderRow("edit-2", "Profil bearbeiten", () => router.push('/(provider)/profile/edit'))}
          <View style={styles.divider} />
          {renderRow("eye", "Profilvorschau", () => router.push('/(provider)/profile/preview'))}
          <View style={styles.divider} />
          {renderRow("image", "Portfolio", () => router.push('/(provider)/portfolio'))}
          <View style={styles.divider} />
          {renderRow("briefcase", "Services & Preise", () => router.push('/(provider)/services'))}
        </View>

        {/* SECTION: GESCHÄFT */}
        <Text style={styles.sectionTitle}>Geschäft</Text>
        <View style={styles.cardGroup}>
          {renderRow("clock", "Verfügbarkeit", () => router.push('/(provider)/availability'))}
          <View style={styles.divider} />
          {renderRow("star", "Bewertungen", () => router.push('/(provider)/reviews'))}
        </View>

        {/* SECTION: KONTO */}
        <Text style={styles.sectionTitle}>Konto</Text>
        <View style={styles.cardGroup}>
          {renderRow("bell", "Benachrichtigungen", () => router.push('/(shared)/notifications'))}
        </View>

        <View style={styles.mainDivider} />

        {/* LOGOUT */}
        <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={20} color={colors.error} style={{ marginRight: spacing.md }} />
          <Text style={styles.actionTextRed}>Abmelden</Text>
        </TouchableOpacity>

        {/* DELETE ACCOUNT */}
        <TouchableOpacity style={styles.actionRow} onPress={openDeleteModal} activeOpacity={0.7}>
          <Feather name="trash-2" size={18} color={colors.error} style={{ marginRight: spacing.md }} />
          <Text style={styles.actionTextSmallRed}>Account löschen</Text>
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
                <Text style={styles.modalTitle}>Möchtest du deinen Account wirklich löschen?</Text>
                <Text style={styles.modalBody}>
                  Alle deine Daten, Bewertungen und der Verlauf werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                </Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalBtnOutline} onPress={() => setDeleteModalVisible(false)}>
                    <Text style={styles.modalBtnOutlineText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnSolid} onPress={() => setDeleteStep(2)}>
                    <Text style={styles.modalBtnSolidText}>Weiter</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Gib dein Passwort ein</Text>
                <Text style={styles.modalBody}>
                  Bitte bestätige die Löschung mit deinem aktuellen Passwort.
                </Text>
                
                {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
                
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Passwort"
                  secureTextEntry
                  autoCapitalize="none"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalBtnOutline} onPress={() => setDeleteModalVisible(false)}>
                    <Text style={styles.modalBtnOutlineText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <PrimaryButton 
                      label="Endgültig löschen" 
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },

  mainDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md, marginHorizontal: spacing.xl },

  pauseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  pauseTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: '#E65100' },
  pauseSub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: '#F57C00', marginTop: 2 },

  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  actionTextRed: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.error },
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
