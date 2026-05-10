import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../theme';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { mapHttpError } from '../../utils/error-messages';
import { API } from '../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PasswordResetScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorVisible, setErrorVisible] = useState(false);

  const otpRefs = useRef<Array<TextInput | null>>([]);
  const emailRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const showError = (message: string, status?: number) => {
    setErrorMessage(message);
    setErrorStatus(status);
    setErrorVisible(true);
  }

  const resetOtpAndFocusFirst = () => {
    setOtp(Array(6).fill(''));
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else {
      setStep((prev) => (prev - 1) as 1 | 2);
      setErrorVisible(false);
    }
  };

  const handleSendCode = async () => {
    Keyboard.dismiss();
    if (!email) {
      showError(mapHttpError(400, t('enterYourEmail'), lang));
      return;
    }
    resetOtpAndFocusFirst();
    try {
      setIsLoading(true);
      setErrorVisible(false);
      await axios.post(`${API}/auth/forgot-password`, { email });
      setStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      const status = err.response?.status;
      showError(mapHttpError(status, undefined, lang), status);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    const code = otp.join('');
    if (code.length < 6) {
      showError(t('otpEnter6Digits'));
      return;
    }
    try {
      setIsLoading(true);
      setErrorVisible(false);
      const res = await axios.post(`${API}/auth/verify-otp`, { email, otp: code });
      const token = res.data?.resetToken ?? res.data?.data?.resetToken;
      setResetToken(token);
      setStep(3);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 401) {
        showError(t('verifyEmailInvalidCode'));
      } else if (status === 410) {
        showError(t('verifyEmailExpiredCode'));
      } else {
        showError(mapHttpError(status, undefined, lang), status);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    if (!resetToken) {
      showError(t('resetVerificationFailed'));
      setStep(1);
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      showError(t('passwordsDontMatch'));
      return;
    }
    try {
      setIsLoading(true);
      setErrorVisible(false);
      await axios.post(`${API}/auth/reset-password`, { resetToken, password: newPassword });
      router.replace('/(auth)/login' as any);
    } catch (err: any) {
      const status = err.response?.status;
      showError(mapHttpError(status, undefined, lang), status);
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backText}>{'<- ' + t('back')}</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[styles.progressSegment, { backgroundColor: step >= s ? colors.coral : colors.border }]} />
          ))}
        </View>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.heading}>{t('passwordResetTitle')}</Text>
            <Text style={styles.bodyText}>{t('passwordResetBody')}</Text>
            
            <FormInput
              ref={emailRef}
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
              textContentType="emailAddress"
            />
            
            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton label={t('passwordResetSendCode')} onPress={handleSendCode} loading={isLoading} />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.heading}>{t('passwordResetEnterCodeTitle')}</Text>
            <Text style={styles.bodyText}>{t('passwordResetEnterCodeBody')}</Text>
            
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

            <TouchableOpacity style={styles.resendLink} onPress={handleSendCode}>
              <Text style={styles.resendText}>{t('verifyEmailResend')}</Text>
            </TouchableOpacity>

            <PrimaryButton label={t('confirm')} onPress={handleVerifyOtp} loading={isLoading} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.heading}>{t('passwordResetNewPasswordTitle')}</Text>
            <Text style={styles.bodyText}>{t('passwordResetNewPasswordBody')}</Text>
            
            <FormInput
              ref={newPasswordRef}
              label={t('passwordResetNewPasswordLabel')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureText
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              textContentType="newPassword"
            />
            <FormInput
              ref={confirmPasswordRef}
              label={t('passwordConfirm')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureText
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
              textContentType="newPassword"
            />

            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton label={t('passwordResetSavePassword')} onPress={handleResetPassword} loading={isLoading} />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  backButton: { position: 'absolute', top: spacing.xl, left: spacing.lg, zIndex: 10, padding: spacing.sm },
  backText: { fontFamily: fonts.bodyMedium, color: colors.textSecondary, fontSize: fontSizes.md },
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl, marginTop: spacing.xxl * 2 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  stepContainer: { flex: 1, justifyContent: 'center', marginBottom: spacing.xxl },
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary, marginBottom: spacing.sm, textAlign: 'center' },
  bodyText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  otpInput: { width: 48, height: 55, backgroundColor: colors.surface, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: 'transparent', textAlign: 'center', fontSize: fontSizes.lg, fontFamily: fonts.bodyMedium, color: colors.textPrimary },
  resendLink: { alignSelf: 'center', marginBottom: spacing.xl },
  resendText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal, textDecorationLine: 'underline' },
});
