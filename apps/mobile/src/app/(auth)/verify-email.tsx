import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import type {
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '../../theme';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { PrimaryButton } from '../../components/PrimaryButton';
import { mapHttpError } from '../../utils/error-messages';
import { tokenStorage } from '../../utils/token-storage';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiJson } from '@/services/apiClient';
import type { User } from '@/types/user';

type CurrentUserResponse = Pick<
  User,
  'id' | 'email' | 'role' | 'firstName' | 'lastName'
>;

type ProviderProfileResponse = {
  status?: string | null;
};

const normalizeProviderStatus = (status?: string | null): string =>
  status?.trim().toLowerCase() ?? '';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email, returnTo, deliveryFailed } = useLocalSearchParams<{ email?: string; returnTo?: string; deliveryFailed?: string }>();
  const { lang, t } = useLanguage();
  const emailString = typeof email === 'string' ? email : '';

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorVisible, setErrorVisible] = useState(false);

  const otpRefs = useRef<Array<TextInput | null>>([]);

  const showError = (message: string, status?: number) => {
    setErrorMessage(message);
    setErrorStatus(status);
    setErrorVisible(true);
  };

  const resetOtpAndFocusFirst = () => {
    setOtp(Array(6).fill(''));
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

  useEffect(() => {
    setTimeout(() => otpRefs.current[0]?.focus(), 150);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = await tokenStorage.getAccessToken();
      const role = await tokenStorage.getUserRole();
      if (cancelled) return;

      // If we have an email in params, the user just arrived here from a fresh registration.
      // Client register legitimately has no token yet — don't force a redirect away.
      // Only redirect if no token AND no email param (means: deep-link or stale nav with no context).
      if (!token && !emailString) {
        const roleParam = role === 'provider' ? 'provider' : 'client';
        const params = new URLSearchParams({ role: roleParam });
        if (typeof returnTo === 'string' && returnTo.length > 0) {
          params.set('returnTo', returnTo);
        }
        router.replace(`/(auth)/login?${params.toString()}` as any);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailString, router, returnTo]);

  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6 - index).split('');
      const newOtp = [...otp];
      for (let i = 0; i < chars.length; i++) {
        newOtp[index + i] = chars[i];
      }
      setOtp(newOtp);

      const lastFilledIndex = Math.min(index + chars.length - 1, 5);
      setTimeout(() => otpRefs.current[lastFilledIndex]?.focus(), 0);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    if (cleaned !== '' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showError(t('otpEnter6Digits'));
      return;
    }

    try {
      setIsLoading(true);
      setErrorVisible(false);

      const verifyResponse = await apiJson<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; firstName: string; lastName?: string; role: string };
      } & { success: true; alreadyVerified?: boolean }>('/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailString, code }),
      });

      if (verifyResponse.accessToken && verifyResponse.refreshToken) {
        await tokenStorage.save(
          verifyResponse.accessToken,
          verifyResponse.refreshToken,
          (verifyResponse.user.role as 'client' | 'provider') ?? 'client',
        );
      }
      if (verifyResponse.user) {
        await tokenStorage.setUser(verifyResponse.user);
      }

      let role = verifyResponse.user?.role as 'client' | 'provider';
      if (!role) {
        const storedRole = await tokenStorage.getUserRole();
        if (storedRole && storedRole !== 'admin') {
          role = storedRole;
        } else {
          role = 'client';
        }
      }
      if (role === 'provider') {
        try {
          const provider = await apiJson<ProviderProfileResponse>('/providers/me', {
            auth: true,
          });
          if (normalizeProviderStatus(provider.status) === 'approved') {
            router.replace('/(provider)' as any);
          } else {
            router.replace('/(provider)/pending' as any);
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            router.replace('/(auth)/provider-register/type' as any);
          } else {
            const params = new URLSearchParams({ role: 'provider' });
            if (typeof returnTo === 'string' && returnTo.length > 0) {
              params.set('returnTo', returnTo);
            }
            router.replace(`/(auth)/login?${params.toString()}` as any);
          }
        }
      } else {
        if (typeof returnTo === 'string' && returnTo.length > 0) {
          router.replace(returnTo as any);
        } else {
          router.replace('/(client)' as any);
        }
      }
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 401) {
        const role = await tokenStorage.getUserRole();
        const roleParam = role === 'provider' ? 'provider' : 'client';
        const params = new URLSearchParams({ role: roleParam });
        if (typeof returnTo === 'string' && returnTo.length > 0) {
          params.set('returnTo', returnTo);
        }
        router.replace(`/(auth)/login?${params.toString()}` as any);
      } else if (status === 400) {
        showError(t('verifyEmailInvalidCode'), status);
      } else if (status === 410) {
        showError(t('verifyEmailExpiredCode'), status);
      } else if (status === 429) {
        showError(t('verifyEmailTooManyRequests'), status);
      } else {
        if (error instanceof Error) Sentry.captureException(error);
        showError(mapHttpError(status, error instanceof Error ? error.message : undefined, lang), status);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    resetOtpAndFocusFirst();
    try {
      setIsLoading(true);
      setErrorVisible(false);

      await apiJson<unknown>('/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailString }),
      });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 429) {
        showError(t('verifyEmailTooManyRequests'), status);
      } else if (status === 410) {
        showError(t('verifyEmailExpiredCode'), status);
      } else {
        if (error instanceof Error) Sentry.captureException(error);
        showError(mapHttpError(status, error instanceof Error ? error.message : undefined, lang), status);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const subtitleEmail = emailString.length > 0 ? emailString : t('yourEmailAddress');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

        <View style={styles.stepContainer}>
          {deliveryFailed === '1' && (
            <View style={styles.deliveryWarning}>
              <Text style={styles.deliveryWarningText}>
                {lang === 'de'
                  ? 'Wir konnten die Bestätigungs-E-Mail nicht senden. Tippe auf "Code erneut senden", um es noch einmal zu versuchen.'
                  : 'We couldn\'t send your verification email. Tap "Resend code" to try again.'}
              </Text>
            </View>
          )}
          <Text style={styles.heading}>{t('verifyEmailTitle')}</Text>
          <Text style={styles.bodyText}>{t('verifyEmailBody').replace('{email}', subtitleEmail)}</Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { otpRefs.current[index] = ref; }}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleOtpKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.resendLink} onPress={handleResend} disabled={isLoading}>
            <Text style={styles.resendText}>{t('verifyEmailResend')}</Text>
          </TouchableOpacity>

          <PrimaryButton label={t('confirm')} onPress={handleVerify} loading={isLoading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  stepContainer: { flex: 1, justifyContent: 'center', marginBottom: spacing.xxl },
  deliveryWarning: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.35)',
  },
  deliveryWarningText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: '#7a5500',
    textAlign: 'center',
  },
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary, marginBottom: spacing.sm, textAlign: 'center' },
  bodyText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  otpInput: { width: layout.inputHeight, height: layout.buttonHeight - spacing.unit, backgroundColor: colors.surface, borderRadius: borderRadius.sm, borderWidth: spacing.unit, borderColor: 'transparent', textAlign: 'center', fontSize: fontSizes.lg, fontFamily: fonts.bodyMedium, color: colors.textPrimary },
  resendLink: { alignSelf: 'center', marginBottom: spacing.xl },
  resendText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal, textDecorationLine: 'underline' },
});
