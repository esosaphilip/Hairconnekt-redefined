import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { tokenStorage } from '../../utils/token-storage';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormInput } from '../../components/FormInput';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { FontAwesome5 } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function RegisterScreen() {
  const router = useRouter();
  
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
      showError(mapHttpError(422));
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwörter stimmen nicht überein.');
      return;
    }
    if (!acceptedTerms) {
      showError('Bitte akzeptiere die AGB.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorVisible(false);
      
      const response = await axios.post(`${API_URL}/auth/register`, {
        firstName, lastName, email, phone, password, role: 'client', acceptedTerms
      });

      const { accessToken, refreshToken, user } = response.data;

      await tokenStorage.save(accessToken, refreshToken, user.role as 'client' | 'provider');
      await AsyncStorage.setItem('hc_user', JSON.stringify(user));

      router.replace('/(client)/' as any);
    } catch (err: any) {
      const status = err.response?.status;
      showError(mapHttpError(status), status);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>HC</Text>
        </View>
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

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Oder</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={() => {}} disabled={isLoading}>
          <FontAwesome5 name="google" size={20} color={colors.textPrimary} style={styles.googleIcon} />
          <Text style={styles.googleText}>Mit Google fortfahren</Text>
        </TouchableOpacity>

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
  logoContainer: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.lg },
  logoText: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary, marginBottom: spacing.xl, textAlign: 'center' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginRight: spacing.md, backgroundColor: colors.surface },
  checkboxChecked: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkboxText: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginHorizontal: spacing.md },
  footer: { alignItems: 'center', marginTop: spacing.xl },
  footerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  googleButton: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, width: '100%' },
  googleIcon: { marginRight: spacing.sm },
  googleText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
});
