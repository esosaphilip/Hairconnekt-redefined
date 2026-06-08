import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout, lineHeights } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { tokenStorage } from '../../utils/token-storage';
import { API } from '../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProviderPendingScreen() {
  const router = useRouter();
  const { t } = useLanguage();
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
          setError(t('providerPendingConnectionFailed'));
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
            <Feather name="wifi-off" size={16} color={colors.error} />
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

        <Text style={styles.heading}>{t('providerPendingTitle')}</Text>
        <Text style={styles.body}>
          {t('providerPendingBody').replace('{time}', t('providerPendingProcessingValue'))}
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
              <Text style={styles.timelineTitle}>{t('providerPendingStep1Title')}</Text>
              <Text style={styles.timelineSub}>{t('providerPendingStep1Sub')}</Text>
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
              <Text style={[styles.timelineTitle, { marginTop: -spacing.xxxs }]}>{t('providerPendingStep2Title')}</Text>
              <Text style={styles.timelineSub}>{t('providerPendingStep2Sub')}</Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={[styles.timelineRow, styles.timelineRowLast]}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineIcon, styles.timelineIconGrey]}>
                <Feather name="mail" size={16} color={colors.textSecondary} />
              </View>
            </View>
            <View style={styles.timelineRight}>
              <Text style={[styles.timelineTitle, styles.timelineTitleGrey]}>{t('providerPendingStep3Title')}</Text>
              <Text style={styles.timelineSub}>{t('providerPendingStep3Sub')}</Text>
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
              <Text style={styles.infoLabel}>{t('providerPendingProcessingTime')}</Text>
              <Text style={styles.infoValue}>{t('providerPendingProcessingValue')}</Text>
            </View>
          </View>
          <Text style={styles.infoText}>
            {t('providerPendingEmailNotice')}{'\n'}
            {t('providerPendingSpamNotice')}
          </Text>
        </View>

      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <PrimaryButton 
          label={t('backToLogin')} 
          onPress={handleLogout}
          variant="filled"
        />
        <View style={{ height: spacing.md }} />
        <PrimaryButton 
          label={t('contactSupport')} 
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
    backgroundColor: colors.errorLightSolid,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  errorBannerText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.error,
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl2,
    alignItems: 'center',
  },

  iconContainer: {
    marginBottom: spacing.lg,
    position: 'relative',
  },
  iconCircle: {
    width: layout.avatarXl - layout.iconButton,
    height: layout.avatarXl - layout.iconButton,
    borderRadius: layout.iconButton,
    backgroundColor: colors.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: spacing.sm,
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
    lineHeight: lineHeights.md,
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
  timelineRowLast: { marginBottom: spacing.none },
  timelineLeft: {
    alignItems: 'center',
    width: spacing.xl,
    marginRight: spacing.md,
  },
  timelineIcon: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineIconGreen: { backgroundColor: colors.green },
  timelineIconGold: { backgroundColor: colors.gold },
  timelineIconGrey: { backgroundColor: colors.borderStrong },
  timelineLine: {
    width: 2,
    height: layout.iconButton,
    marginTop: -spacing.xxs,
    marginBottom: -spacing.xxs,
    zIndex: 1,
  },
  timelineLineGreen: { backgroundColor: colors.green },
  timelineLineGrey: { backgroundColor: colors.borderStrong },
  timelineRight: {
    flex: 1,
    paddingTop: spacing.xxs,
  },
  timelineTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  timelineTitleGrey: { color: colors.textSecondary },
  timelineSub: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: lineHeights.sm,
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
    width: layout.iconButton,
    height: layout.iconButton,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.infoLight,
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
    lineHeight: lineHeights.sm,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl2,
    backgroundColor: colors.background,
  },
});
