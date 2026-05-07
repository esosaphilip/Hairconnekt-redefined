import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, fonts, fontSizes, layout, spacing } from '../../theme';
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
  const { lang } = useLanguage();
  const [role, setRole] = useState<'client' | 'provider'>(urlRole || 'client');
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorVisible, setErrorVisible] = useState(false);

  const showError = (message: string, status?: number) => {
    setErrorMessage(message);
    setErrorStatus(status);
    setErrorVisible(true);
  }

  const handleLogin = async () => {
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              Kunde
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleTogglePill, role === 'provider' && styles.roleTogglePillActive]}
            onPress={() => setRole('provider')}
            activeOpacity={0.8}
          >
            <Text style={[styles.roleToggleText, role === 'provider' && styles.roleToggleTextActive]}>
              Anbieter
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heading}>Willkommen zurück!</Text>
        
        <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

        <FormInput label="E-Mail / Telefon" value={identifier} onChangeText={setIdentifier} keyboardType="email-address" />
        <FormInput label="Passwort" value={password} onChangeText={setPassword} secureText />
        
        <TouchableOpacity onPress={() => router.push('/(auth)/password-reset' as any)}>
          <Text style={styles.forgotPassword}>Passwort vergessen?</Text>
        </TouchableOpacity>

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton label="Anmelden" onPress={handleLogin} loading={isLoading} />
        </View>

        <TouchableOpacity style={styles.footer} onPress={() => router.push(role === 'provider' ? '/(provider)/register/type' as any : '/(auth)/register' as any)}>
          <Text style={styles.footerText}>
            {role === 'client' ? 'Noch kein Konto? Als Kunde registrieren' : 'Noch kein Konto? Als Anbieter registrieren'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.lg, justifyContent: 'center', flexGrow: 1, paddingBottom: spacing.xxl },
  logo: { width: spacing.xxl * 4 + spacing.xs, height: layout.avatarMd, alignSelf: 'center', marginBottom: spacing.xl },
  roleToggleContainer: { flexDirection: 'row', backgroundColor: '#F5F5F5', borderRadius: 999, padding: 4, marginBottom: spacing.xl },
  roleTogglePill: { flex: 1, height: 44, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  roleTogglePillActive: { backgroundColor: colors.primary },
  roleToggleText: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary },
  roleToggleTextActive: { fontFamily: fonts.bodyBold, color: '#FFFFFF' },
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.xxxl, color: colors.primary, marginBottom: spacing.xl, textAlign: 'center' },
  forgotPassword: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal, textAlign: 'right', marginTop: spacing.xs },
  footer: { alignItems: 'center', marginTop: spacing.xl },
  footerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
});
