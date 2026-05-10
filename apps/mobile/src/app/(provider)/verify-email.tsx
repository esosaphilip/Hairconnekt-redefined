import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '../../theme';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { API } from '../../utils/api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(120);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  const otpRefs = useRef<Array<TextInput | null>>([]);

  const isCounting = resendCountdown > 0;
  useEffect(() => {
    if (!isCounting) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCounting]);

  useEffect(() => {
    setTimeout(() => otpRefs.current[0]?.focus(), 150);
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');

    if (cleaned.length === 6 && /^\d{6}$/.test(cleaned)) {
      const digits = cleaned.split('');
      setOtp(digits);
      otpRefs.current[5]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned.slice(-1);
    setOtp(newOtp);

    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async () => {
    Keyboard.dismiss();
    const code = otp.join('');
    if (code.length < 6) {
      setErrorMessage('Bitte gib den vollständigen 6-stelligen Code ein.');
      setErrorVisible(true);
      return;
    }

    try {
      setIsLoading(true);
      setErrorVisible(false);

      const res = await fetch(`${API}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(email ?? ''), code }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as any)?.message;
        setErrorMessage(typeof msg === 'string' ? msg : mapHttpError(res.status));
        setErrorVisible(true);
        return;
      }

      router.replace('/(provider)/pending');
    } catch {
      setErrorMessage(mapHttpError(500));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    Keyboard.dismiss();
    if (resendCountdown > 0) return;
    try {
      setIsResending(true);
      setErrorVisible(false);
      setOtp(Array(6).fill(''));
      otpRefs.current[0]?.focus();

      const res = await fetch(`${API}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(email ?? '') }),
      });

      if (res.status === 429) {
        setErrorMessage('Bitte warte 2 Minuten vor dem erneuten Senden.');
        setErrorVisible(true);
        return;
      }

      if (!res.ok) {
        setErrorMessage(mapHttpError(res.status));
        setErrorVisible(true);
        return;
      }

      setResendCountdown(120);
    } catch {
      setErrorMessage('Code konnte nicht gesendet werden.');
      setErrorVisible(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Feather name="mail" size={layout.inputHeight} color={colors.coral} />
            <Text style={styles.title}>E-Mail bestätigen</Text>
            <Text style={styles.subtitle}>
              Wir haben einen 6-stelligen Code an{'\n'}
              <Text style={styles.emailText}>{String(email ?? '')}</Text>
              {'\n'}gesendet. Bitte prüfe auch deinen Spam-Ordner.
            </Text>
          </View>

          <GermanErrorBanner
            visible={errorVisible}
            message={errorMessage}
            onDismiss={() => setErrorVisible(false)}
          />

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  otpRefs.current[index] = ref;
                }}
                style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleOtpKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={6}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.verifyButton,
              otp.join('').length < 6 && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={isLoading || otp.join('').length < 6}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.verifyButtonText}>E-Mail bestätigen</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={resendCountdown > 0 || isResending}
          >
            <Text
              style={[
                styles.resendText,
                resendCountdown > 0 && styles.resendTextDisabled,
              ]}
            >
              {resendCountdown > 0
                ? `Code erneut senden (${resendCountdown}s)`
                : 'Code erneut senden'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  keyboardContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xxxl,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: spacing.lg,
  },
  emailText: {
    fontFamily: fonts.bodyBold,
    color: colors.textPrimary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  otpInput: {
    width: layout.inputHeight,
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: fontSizes.xl,
    fontFamily: fonts.bodyBold,
    color: colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: colors.coral,
    backgroundColor: colors.background,
  },
  verifyButton: {
    backgroundColor: colors.coral,
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  verifyButtonDisabled: {
    backgroundColor: colors.border,
  },
  verifyButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.background,
  },
  resendButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  resendText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.teal,
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    color: colors.textTertiary,
    textDecorationLine: 'none',
  },
});
