import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, spacing, shadows, borderRadius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AccountTypeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<'client' | 'provider' | null>(null);

  const handleContinue = () => {
    if (selectedRole === 'client') {
      router.push('/(auth)/register' as any);
    } else if (selectedRole === 'provider') {
      router.push('/(provider)/register/type' as any);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.heading}>{t('accountTypeTitle')}</Text>

        <TouchableOpacity 
          style={[styles.card, selectedRole === 'client' && styles.cardSelected]} 
          onPress={() => setSelectedRole('client')}
        >
          <Text style={[styles.cardTitle, selectedRole === 'client' && styles.cardTitleSelected]}>
            {t('accountTypeClientTitle')}
          </Text>
          <Text style={[styles.cardSubtitle, selectedRole === 'client' && styles.cardTitleSelected]}>
            {t('accountTypeClientSubtitle')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, selectedRole === 'provider' && styles.cardSelected]} 
          onPress={() => setSelectedRole('provider')}
        >
          <Text style={[styles.cardTitle, selectedRole === 'provider' && styles.cardTitleSelected]}>
            {t('accountTypeProviderTitle')}
          </Text>
          <Text style={[styles.cardSubtitle, selectedRole === 'provider' && styles.cardTitleSelected]}>
            {t('accountTypeProviderSubtitle')}
          </Text>
        </TouchableOpacity>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
          <PrimaryButton 
            label={t('next')} 
            onPress={handleContinue} 
            disabled={!selectedRole} 
          />
          <TouchableOpacity style={styles.loginLink} onPress={() => router.push(`/(auth)/login?role=${selectedRole || 'client'}` as any)}>
            <Text style={styles.loginText}>{t('registerAlreadyHaveAccount')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary, marginBottom: spacing.xxl, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.xl, marginBottom: spacing.lg, borderWidth: spacing.xxxs, borderColor: 'transparent', ...shadows.card },
  cardSelected: { borderColor: colors.coral, backgroundColor: colors.coralLight },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center' },
  cardTitleSelected: { color: colors.coral },
  cardSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  footer: { marginTop: 'auto', paddingBottom: spacing.xl },
  loginLink: { marginTop: spacing.xl, alignItems: 'center' },
  loginText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.teal },
});
