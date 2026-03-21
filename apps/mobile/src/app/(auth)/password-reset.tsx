import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../theme';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { mapHttpError } from '../../utils/error-messages';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.2.85:3000';

export default function PasswordResetScreen() {
  const router = useRouter();
  
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

  const showError = (message: string, status?: number) => {
    setErrorMessage(message);
    setErrorStatus(status);
    setErrorVisible(true);
  }

  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else {
      setStep((prev) => (prev - 1) as 1 | 2);
      setErrorVisible(false);
    }
  };

  const handleSendCode = async () => {
    if (!email) {
      showError(mapHttpError(400, 'Bitte gib deine E-Mail-Adresse ein.'));
      return;
    }
    try {
      setIsLoading(true);
      setErrorVisible(false);
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setStep(2);
    } catch (err: any) {
      const status = err.response?.status;
      showError(mapHttpError(status), status);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showError('Bitte gib den 6-stelligen Code ein.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorVisible(false);
      const res = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp: code });
      setResetToken(res.data.resetToken);
      setStep(3);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400 || status === 401) {
        showError('Ungültiger Code. Bitte versuche es erneut.');
      } else if (status === 410) {
        showError('Code abgelaufen. Bitte fordere einen neuen an.');
      } else {
        showError(mapHttpError(status), status);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      showError('Passwörter stimmen nicht überein.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorVisible(false);
      await axios.post(`${API_URL}/auth/reset-password`, { resetToken, password: newPassword });
      router.replace('/(auth)/login' as any);
    } catch (err: any) {
      const status = err.response?.status;
      showError(mapHttpError(status), status);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text !== '' && index < 5) {
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
          <Text style={styles.backText}>{'<- Zurück'}</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[styles.progressSegment, { backgroundColor: step >= s ? colors.coral : colors.border }]} />
          ))}
        </View>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.heading}>Passwort vergessen?</Text>
            <Text style={styles.bodyText}>Gib deine E-Mail-Adresse ein, um einen Code zu erhalten.</Text>
            
            <FormInput label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
            
            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton label="Code senden" onPress={handleSendCode} loading={isLoading} />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.heading}>Code eingeben</Text>
            <Text style={styles.bodyText}>Bitte gib den 6-stelligen Code ein, der an deine E-Mail gesendet wurde.</Text>
            
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
              <Text style={styles.resendText}>Code erneut senden</Text>
            </TouchableOpacity>

            <PrimaryButton label="Bestätigen" onPress={handleVerifyOtp} loading={isLoading} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.heading}>Neues Passwort</Text>
            <Text style={styles.bodyText}>Bitte gib ein sicheres neues Passwort ein.</Text>
            
            <FormInput label="Neues Passwort" value={newPassword} onChangeText={setNewPassword} secureText />
            <FormInput label="Passwort bestätigen" value={confirmPassword} onChangeText={setConfirmPassword} secureText />

            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton label="Passwort speichern" onPress={handleResetPassword} loading={isLoading} />
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
