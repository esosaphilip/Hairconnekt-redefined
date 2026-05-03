import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { tokenStorage } from '../../utils/token-storage';
import { colors, fonts, fontSizes, layout, spacing } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormInput } from '../../components/FormInput';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { API } from '../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { lang } = useLanguage();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+49');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorVisible, setErrorVisible] = useState(false);

  const showError = (message: string, status?: number) => {
    setErrorMessage(message);
    setErrorStatus(status);
    setErrorVisible(true);
  }

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword || !phone) {
      showError(mapHttpError(422, undefined, lang));
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwörter stimmen nicht überein.');
      return;
    }
    if (!acceptedTerms) {
      showError('Bitte akzeptiere die AGB und die Datenschutzerklärung.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorVisible(false);
      
      const response = await axios.post(`${API}/auth/register`, {
        firstName, lastName, email, phone, password, role: 'client', acceptedTerms
      });

      const { accessToken, refreshToken, user } = response.data;

      await tokenStorage.save(accessToken, refreshToken, user.role as 'client' | 'provider');
      await tokenStorage.setUser(user);

      const targetEmail = user?.email ?? email;
      router.replace(`/(auth)/verify-email?email=${encodeURIComponent(targetEmail)}` as any);
    } catch (err: any) {
      const status = err.response?.status;
      showError(mapHttpError(status, undefined, lang), status);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Image
          source={require('../../../assets/logo-full.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.heading}>Kundenkonto erstellen</Text>
        
        <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

        <FormInput label="Vorname" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <FormInput label="Nachname" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <FormInput label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <FormInput label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <FormInput label="Passwort" value={password} onChangeText={setPassword} secureText />
        <FormInput label="Passwort bestätigen" value={confirmPassword} onChangeText={setConfirmPassword} secureText />

        <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAcceptedTerms(!acceptedTerms)}>
          <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]} />
          <Text style={styles.checkboxText}>Ich akzeptiere die AGB und Datenschutzerklärung</Text>
        </TouchableOpacity>

        <PrimaryButton label="Konto erstellen" onPress={handleRegister} loading={isLoading} />

        <TouchableOpacity style={styles.footer} onPress={() => router.push('/(auth)/login?role=client' as any)}>
          <Text style={styles.footerText}>Bereits registriert? Anmelden</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.xl },
  logo: { width: spacing.xxl * 4 + spacing.xs, height: layout.avatarMd, alignSelf: 'center', marginBottom: spacing.xl },
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary, marginBottom: spacing.xl, textAlign: 'center' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginRight: spacing.md, backgroundColor: colors.surface },
  checkboxChecked: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkboxText: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  footer: { alignItems: 'center', marginTop: spacing.xl },
  footerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
});
