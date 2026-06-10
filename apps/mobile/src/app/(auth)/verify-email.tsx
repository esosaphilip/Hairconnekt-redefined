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
  const { email } = useLocalSearchParams<{ email?: string }>();
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

      if (!token || !emailString) {
        const roleParam = role === 'provider' ? 'provider' : 'client';
        router.replace(`/(auth)/login?role=${roleParam}` as any);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [emailString, router]);

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

      await apiJson<unknown>('/auth/verify-email', {
        auth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailString, code }),
      });

      try {
        const me = await apiJson<CurrentUserResponse>('/users/me', { auth: true });
        await tokenStorage.setUser(me);
      } catch (error) {
        Sentry.captureException(error);
      }

      const role = await tokenStorage.getUserRole();
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
            router.replace('/(provider)/register/type' as any);
          } else {
            router.replace('/(auth)/login?role=provider' as any);
          }
        }
      } else {
        router.replace('/(client)' as any);
      }
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 401) {
        const role = await tokenStorage.getUserRole();
        const roleParam = role === 'provider' ? 'provider' : 'client';
        router.replace(`/(auth)/login?role=${roleParam}` as any);
      } else if (status === 400) {
        showError(t('verifyEmailInvalidCode'), status);
      } else if (status === 410) {
        showError(t('verifyEmailExpiredCode'), status);
      } else if (status === 429) {
        showError(t('verifyEmailTooManyRequests'), status);
      } else {
        if (error instanceof Error) Sentry.captureException(error);
        showError(mapHttpError(status, undefined, lang), status);
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
        auth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailString }),
      });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 401) {
        const role = await tokenStorage.getUserRole();
        const roleParam = role === 'provider' ? 'provider' : 'client';
        router.replace(`/(auth)/login?role=${roleParam}` as any);
      } else if (status === 429) {
        showError(t('verifyEmailTooManyRequests'), status);
      } else if (status === 410) {
        showError(t('verifyEmailExpiredCode'), status);
      } else {
        if (error instanceof Error) Sentry.captureException(error);
        showError(mapHttpError(status, undefined, lang), status);
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
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary, marginBottom: spacing.sm, textAlign: 'center' },
  bodyText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  otpInput: { width: layout.inputHeight, height: layout.buttonHeight - spacing.unit, backgroundColor: colors.surface, borderRadius: borderRadius.sm, borderWidth: spacing.unit, borderColor: 'transparent', textAlign: 'center', fontSize: fontSizes.lg, fontFamily: fonts.bodyMedium, color: colors.textPrimary },
  resendLink: { alignSelf: 'center', marginBottom: spacing.xl },
  resendText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal, textDecorationLine: 'underline' },
});
