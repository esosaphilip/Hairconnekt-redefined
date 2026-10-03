import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Image, Keyboard, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, colors, fonts, fontSizes, layout, spacing } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormInput } from '../../components/FormInput';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { tokenStorage } from '../../utils/token-storage';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiJson } from '@/services/apiClient';
import {
  groupForRole,
  loginRoutingDecision,
  loginTabInitial,
  providerDestinationFromError,
  providerDestinationFromStatus,
  providerDestinationRoute,
  type LoginTab,
} from '@/utils/roleRouting';
import { dismissAllThenReplace } from '@/utils/useGroupRoleGuard';

export default function LoginScreen() {
  const router = useRouter();
  const { role: urlRole, returnTo } = useLocalSearchParams<{ role: 'client' | 'provider'; returnTo?: string }>();
  const { lang, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { tab: initialTab, urlRolePresent } = loginTabInitial(urlRole);
  const [role, setRole] = useState<LoginTab>(initialTab);
  const userTappedTabRef = useRef(false);

  const changeRole = (next: LoginTab) => {
    userTappedTabRef.current = true;
    setRole(next);
  };

  useEffect(() => {
    let mounted = true;
    if (urlRolePresent) return;
    void (async () => {
      const remembered = await tokenStorage.getLastLoginSide();
      if (!mounted) return;
      if (userTappedTabRef.current) return;
      setRole((current) => {
        if (userTappedTabRef.current) return current;
        if (remembered === 'client' || remembered === 'provider') return remembered;
        return current;
      });
    })();
    return () => {
      mounted = false;
    };
  }, [urlRole, urlRolePresent]);

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
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!identifier || !password) {
      showError(mapHttpError(400, undefined, lang));
      return;
    }

    const selectedTab = role;
    let authData: any;

    try {
      setIsLoading(true);
      setErrorVisible(false);

      authData = await apiJson<any>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const token = authData.accessToken;
      const accountRole = authData.user.role;

      await tokenStorage.save(token, authData.refreshToken, accountRole);
      await tokenStorage.setUser(authData.user);

      const accountGroup = groupForRole(accountRole);
      if (accountGroup) {
        await tokenStorage.setLastLoginSide(accountGroup);
      }

      let providerStatus: any = undefined;
      let providerStatusError: any = undefined;

      if (accountGroup === 'provider') {
        try {
          providerStatus = await apiJson<any>('/providers/me', { auth: true });
        } catch (err: any) {
          providerStatusError =
            err instanceof ApiError
              ? { status: err.status }
              : err ?? { status: undefined };
        }
      }

      const decision = loginRoutingDecision({
        accountRole,
        selectedTab,
        returnTo: typeof returnTo === 'string' ? returnTo : undefined,
        providerStatus,
        providerStatusError,
      });

      if (!decision) {
        setIsLoading(false);
        return;
      }

      if (decision.resetHistory) {
        dismissAllThenReplace(router, decision.destination);
      } else {
        router.replace(decision.destination as any);
      }

      if (decision.noticeSide === 'provider') {
        setTimeout(() => {
          Alert.alert(t('loginNoticeProviderTitle'), t('loginNoticeProviderBody'), [
            { text: t('loginNoticeButton') },
          ]);
        }, 300);
      } else if (decision.noticeSide === 'client') {
        setTimeout(() => {
          Alert.alert(t('loginNoticeClientTitle'), t('loginNoticeClientBody'), [
            { text: t('loginNoticeButton') },
          ]);
        }, 300);
      }
      return;
    } catch (err: any) {
      const status = err?.status ?? err.response?.status;
      const body = err?.body ?? err?.response?.data;
      if (body?.errorCode === 'EMAIL_NOT_VERIFIED' && typeof body?.email === 'string') {
        const targetEmail = body.email;
        const targetRole = body?.role === 'provider' ? 'provider' : 'client';
        const screen =
          targetRole === 'provider'
            ? `/(auth)/provider-verify-email?email=${encodeURIComponent(targetEmail)}`
            : `/(auth)/verify-email?email=${encodeURIComponent(targetEmail)}`;
        router.replace(screen as any);
        return;
      }
      showError(mapHttpError(status, err?.message, lang), status);
    } finally {
      setIsLoading(false);
    }
  };

  const hasReturnTo = typeof returnTo === 'string' && returnTo.length > 0;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {hasReturnTo && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(client)' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Text style={styles.backText}>{'← ' + t('back')}</Text>
        </TouchableOpacity>
      )}
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
              onPress={() => changeRole('client')}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleToggleText, role === 'client' && styles.roleToggleTextActive]}>
                {t('roleClient')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleTogglePill, role === 'provider' && styles.roleTogglePillActive]}
              onPress={() => changeRole('provider')}
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

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <PrimaryButton label={t('login')} onPress={handleLogin} loading={isLoading} />
          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => {
              const returnQuery = typeof returnTo === 'string' && returnTo.length > 0
                ? `?returnTo=${encodeURIComponent(returnTo)}`
                : '';
              if (role === 'provider') {
                router.push(`/(auth)/provider-register/type${returnQuery}` as any);
              } else {
                router.push(`/(auth)/register${returnQuery}` as any);
              }
            }}
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
  backButton: { position: 'absolute', top: spacing.xl, left: spacing.lg, zIndex: 10, padding: spacing.sm },
  backText: { fontFamily: fonts.bodyMedium, color: colors.textSecondary, fontSize: fontSizes.md },
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
