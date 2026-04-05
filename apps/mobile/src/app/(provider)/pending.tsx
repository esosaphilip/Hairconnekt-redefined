import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { tokenStorage } from '../../utils/token-storage';
import { API } from '../../utils/api';

export default function ProviderPendingScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const consecutiveErrors = useRef(0);

  // Clear any lingering registration navigation state on mount
  useEffect(() => {
    // If we got here, registration is complete.
    // Ensure we cannot navigate back to registration.
    if (router.canGoBack()) {
      // Clear the back stack by replacing history
      router.replace('/(provider)/pending');
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        router.replace('/(auth)/login?role=provider');
        return;
      }
      try {
        const res = await fetch(
          `${API}/providers/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status === 404) {
          router.replace('/(provider)/register/type');
          return;
        }
        if (!res.ok) return;
        const provider = await res.json();
        consecutiveErrors.current = 0; // reset on success
        if (provider.status?.toLowerCase() === 'approved') {
          router.replace('/(provider)');
        }
      } catch (err) {
        consecutiveErrors.current += 1;
        if (consecutiveErrors.current >= 5) {
          setError('Verbindung zum Server fehlgeschlagen. Bitte starte die App neu.');
          clearInterval(intervalRef.current);
        }
      }
    };

    const intervalRef = { current: 0 as any };
    check();
    intervalRef.current = setInterval(check, 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleLogout = async () => {
    await tokenStorage.clear();
    router.replace('/(auth)/login');
  };

  const handleSupport = () => {
    Linking.openURL('mailto:support@hairconnekt.de');
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Error Banner */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Feather name="wifi-off" size={16} color="#C62828" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Header Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Feather name="clock" size={40} color={colors.primary} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>!</Text>
          </View>
        </View>

        <Text style={styles.heading}>Registrierung wird geprüft</Text>
        <Text style={styles.body}>
          Deine Registrierung wird gerade von unserem Team überprüft.{'\n'}
          Dies dauert in der Regel 1-3 Werktage.
        </Text>


        {/* Timeline Card */}
        <View style={styles.timelineCard}>
          {/* Step 1 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineIcon, styles.timelineIconGreen]}>
                <Feather name="check" size={16} color={colors.background} />
              </View>
              <View style={[styles.timelineLine, styles.timelineLineGreen]} />
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineTitle}>Registrierung eingereicht</Text>
              <Text style={styles.timelineSub}>Deine Daten wurden erfolgreich übermittelt</Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineIcon, styles.timelineIconGold]}>
                <Feather name="clock" size={16} color={colors.background} />
              </View>
              <View style={[styles.timelineLine, styles.timelineLineGrey]} />
            </View>
            <View style={styles.timelineRight}>
              <Text style={[styles.timelineTitle, { marginTop: -2 }]}>Überprüfung läuft</Text>
              <Text style={styles.timelineSub}>Unser Team prüft deine Angaben</Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={[styles.timelineRow, { marginBottom: 0 }]}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineIcon, styles.timelineIconGrey]}>
                <Feather name="mail" size={16} color={colors.textSecondary} />
              </View>
            </View>
            <View style={styles.timelineRight}>
              <Text style={[styles.timelineTitle, styles.timelineTitleGrey]}>Freischaltung</Text>
              <Text style={styles.timelineSub}>Du erhältst eine Bestätigungs-E-Mail</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeaderRow}>
            <View style={styles.infoIconContainer}>
              <Feather name="clock" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Bearbeitungszeit</Text>
              <Text style={styles.infoValue}>1-3 Werktage</Text>
            </View>
          </View>
          <Text style={styles.infoText}>
            Du erhältst eine E-Mail sobald dein Account freigeschaltet wurde.{'\n'}
            Prüfe auch deinen Spam-Ordner.
          </Text>
        </View>

      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <PrimaryButton 
          label="Zurück zum Login" 
          onPress={handleLogout}
          variant="filled"
        />
        <View style={{ height: spacing.md }} />
        <PrimaryButton 
          label="Support kontaktieren" 
          onPress={handleSupport}
          variant="outline"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 8,
  },
  errorBannerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: '#C62828',
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: 40,
    alignItems: 'center',
  },

  iconContainer: {
    marginBottom: spacing.lg,
    position: 'relative',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    color: colors.background,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
  },

  heading: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xxxl,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },

  timelineCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 32,
    marginRight: spacing.md,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineIconGreen: { backgroundColor: colors.green },
  timelineIconGold: { backgroundColor: colors.gold },
  timelineIconGrey: { backgroundColor: colors.borderStrong },
  timelineLine: {
    width: 2,
    height: 40,
    marginTop: -4,
    marginBottom: -4,
    zIndex: 1,
  },
  timelineLineGreen: { backgroundColor: colors.green },
  timelineLineGrey: { backgroundColor: colors.borderStrong },
  timelineRight: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  timelineTitleGrey: { color: colors.textSecondary },
  timelineSub: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  infoCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD', // light blue from design
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  infoLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
    backgroundColor: colors.background,
  },
});
