import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Image, SafeAreaView, Keyboard, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { borderRadius, colors, fonts, fontSizes, layout, spacing } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormInput } from '../../components/FormInput';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { tokenStorage } from '../../utils/token-storage';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiJson } from '@/services/apiClient';

export default function LoginScreen() {
  const router = useRouter();
  const { role: urlRole } = useLocalSearchParams<{ role: 'client' | 'provider' }>();
  const { lang, t } = useLanguage();
  const [role, setRole] = useState<'client' | 'provider'>(urlRole || 'client');
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorVisible, setErrorVisible] = useState(false);
  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const showError = (message: string, status?: number) => {
    setErrorMessage(message);
    setErrorStatus(status);
    setErrorVisible(true);
  }

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!identifier || !password) {
      showError(mapHttpError(400, undefined, lang));
      return;
    }

    try {
      setIsLoading(true);
      setErrorVisible(false);
      
      const authData = await apiJson<any>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const token = authData.accessToken;
      const role = authData.user.role;

      // FIX: Use the tokenStorage utility to save tokens correctly
      await tokenStorage.save(token, authData.refreshToken, role);
      // Also save user info for future use if needed
      await tokenStorage.setUser(authData.user);

      if (role === 'client') {
        router.replace('/(client)');
        return;
      }

      if (role === 'provider') {
        try {
          const provider = await apiJson<any>('/providers/me', { auth: true });
          if (provider.status?.toLowerCase() === 'approved') {
            router.replace('/(provider)');
          } else {
            router.replace('/(provider)/pending');
          }
        } catch (err: any) {
          if (err?.status === 404) {
            router.replace('/(provider)/register/type' as any);
            return;
          }
          router.replace('/(provider)/pending');
        }
        return;
      }
    } catch (err: any) {
      const status = err?.status ?? err.response?.status;
      showError(mapHttpError(status, undefined, lang), status);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require('../../../assets/logo-full.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.roleToggleContainer}>
            <TouchableOpacity
              style={[styles.roleTogglePill, role === 'client' && styles.roleTogglePillActive]}
              onPress={() => setRole('client')}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleToggleText, role === 'client' && styles.roleToggleTextActive]}>
                {t('roleClient')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleTogglePill, role === 'provider' && styles.roleTogglePillActive]}
              onPress={() => setRole('provider')}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleToggleText, role === 'provider' && styles.roleToggleTextActive]}>
                {t('roleProvider')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heading}>{t('welcomeBack')}</Text>

          <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

          <FormInput
            ref={identifierRef}
            label={t('loginIdentifier')}
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            inputMode="email"
          />
          <FormInput
            ref={passwordRef}
            label={t('password')}
            value={password}
            onChangeText={setPassword}
            secureText
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            textContentType="password"
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/password-reset' as any)}>
            <Text style={styles.forgotPassword}>{t('forgotPassword')}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label={t('login')} onPress={handleLogin} loading={isLoading} />
          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => router.push(role === 'provider' ? '/(provider)/register/type' as any : '/(auth)/register' as any)}
          >
            <Text style={styles.footerText}>
              {role === 'client' ? t('loginNoAccountClient') : t('loginNoAccountProvider')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, justifyContent: 'center', flexGrow: 1, paddingVertical: spacing.lg },
  logo: { width: spacing.xxl * 4 + spacing.xs, height: layout.avatarMd, alignSelf: 'center', marginBottom: spacing.xl },
  roleToggleContainer: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.full, padding: spacing.xxs, marginBottom: spacing.xl },
  roleTogglePill: { flex: 1, height: layout.inputHeight - spacing.xxs, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center' },
  roleTogglePillActive: { backgroundColor: colors.primary },
  roleToggleText: { fontFamily: fonts.body, fontSize: fontSizes.sm + spacing.unit, color: colors.textSecondary },
  roleToggleTextActive: { fontFamily: fonts.bodyBold, color: colors.background },
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.xxxl, color: colors.primary, marginBottom: spacing.xl, textAlign: 'center' },
  forgotPassword: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal, textAlign: 'right', marginTop: spacing.xs },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg, borderTopWidth: spacing.unit, borderTopColor: colors.border, backgroundColor: colors.background },
  footerLink: { alignItems: 'center', marginTop: spacing.md },
  footerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
});
