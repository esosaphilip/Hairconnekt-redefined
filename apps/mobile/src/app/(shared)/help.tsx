import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, layout, shadows } from '@/theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError } from '@/utils/logger';
import { buildMailtoUrl, openMailto, SUPPORT_EMAIL } from '@/utils/mailto';

const INSTAGRAM_URL = 'https://www.instagram.com/hairconnekt/';
const WEBSITE_URL = 'https://hairconnekt.de';

export default function HelpScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleEmail = () => {
    void openMailto(buildMailtoUrl(SUPPORT_EMAIL, t('helpEmailSubject')), SUPPORT_EMAIL, t);
  };

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      debugError('openLink failed', err);
      Alert.alert(t('error'), t('errorOpenLink'));
    }
  };

  const renderRow = (
    icon: keyof typeof Feather.glyphMap,
    label: string,
    value: string,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.rowLeft}>
        <Feather name={icon} size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
        <View>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settingsHelp')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{t('helpIntro')}</Text>

        <View style={styles.cardGroup}>
          {renderRow('mail', t('helpEmailLabel'), SUPPORT_EMAIL, handleEmail)}
          {renderRow('instagram', t('helpInstagramLabel'), '@hairconnekt', () => void openLink(INSTAGRAM_URL))}
          {renderRow('globe', t('helpWebsiteLabel'), 'hairconnekt.de', () => void openLink(WEBSITE_URL))}
        </View>
      </ScrollView>
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

  intro: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, lineHeight: spacing.lg - spacing.xxxs, marginBottom: spacing.xl },

  cardGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  rowValue: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: spacing.xxxs },
});
