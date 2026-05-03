import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../theme';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { PrimaryButton } from '../../components/PrimaryButton';
import { mapHttpError } from '../../utils/error-messages';
import { API } from '../../utils/api';
import { tokenStorage } from '../../utils/token-storage';
import { useLanguage } from '@/contexts/LanguageContext';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { lang } = useLanguage();

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

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const getAuthHeaders = async () => {
    const accessToken = await tokenStorage.getAccessToken();
    if (!accessToken) return null;
    return { Authorization: `Bearer ${accessToken}` };
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showError('Bitte gib den 6-stelligen Code ein.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorVisible(false);

      const headers = await getAuthHeaders();
      if (!headers) {
        const role = await tokenStorage.getUserRole();
        router.replace((role ? `/(auth)/login?role=${role}` : '/(auth)/login') as any);
        return;
      }

      await axios.post(`${API}/auth/verify-email`, { otp: code }, { headers });

      try {
        const res = await fetch(`${API}/users/me`, { headers });
        if (res.ok) {
          const me = await res.json();
          await tokenStorage.setUser(me);
        }
      } catch {}

      const role = await tokenStorage.getUserRole();
      if (role === 'provider') {
        try {
          const res = await fetch(`${API}/providers/me`, { headers });
          if (res.ok) {
            const provider = await res.json();
            if (provider.status?.toLowerCase() === 'approved') {
              router.replace('/(provider)' as any);
            } else {
              router.replace('/(provider)/pending' as any);
            }
          } else if (res.status === 404) {
            router.replace('/(provider)/register/type' as any);
          } else {
            router.replace('/(auth)/login?role=provider' as any);
          }
        } catch {
          router.replace('/(auth)/login?role=provider' as any);
        }
      } else {
        router.replace('/(client)' as any);
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 401) {
        showError('Ungültiger Code. Bitte versuche es erneut.', status);
      } else if (status === 410) {
        showError('Code abgelaufen. Bitte fordere einen neuen an.', status);
      } else if (status === 429) {
        showError('Du hast zu oft einen Code angefordert. Bitte versuche es später erneut.', status);
      } else {
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

      const headers = await getAuthHeaders();
      if (!headers) {
        const role = await tokenStorage.getUserRole();
        router.replace((role ? `/(auth)/login?role=${role}` : '/(auth)/login') as any);
        return;
      }

      await axios.post(`${API}/auth/resend-verification`, {}, { headers });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429) {
        showError('Du hast zu oft einen Code angefordert. Bitte versuche es später erneut.', status);
      } else {
        showError(mapHttpError(status, undefined, lang), status);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const subtitleEmail = typeof email === 'string' && email.length > 0 ? email : 'deine E-Mail-Adresse';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

        <View style={styles.stepContainer}>
          <Text style={styles.heading}>E-Mail bestätigen</Text>
          <Text style={styles.bodyText}>Wir haben dir einen Code an {subtitleEmail} gesendet.</Text>

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
            <Text style={styles.resendText}>Code erneut senden</Text>
          </TouchableOpacity>

          <PrimaryButton label="Bestätigen" onPress={handleVerify} loading={isLoading} />
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
  otpInput: { width: 48, height: 55, backgroundColor: colors.surface, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: 'transparent', textAlign: 'center', fontSize: fontSizes.lg, fontFamily: fonts.bodyMedium, color: colors.textPrimary },
  resendLink: { alignSelf: 'center', marginBottom: spacing.xl },
  resendText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal, textDecorationLine: 'underline' },
});
