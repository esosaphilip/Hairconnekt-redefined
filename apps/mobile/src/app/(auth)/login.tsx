import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { colors, fonts, fontSizes, spacing } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormInput } from '../../components/FormInput';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { tokenStorage } from '../../utils/token-storage';
import { API } from '../../utils/api';

export default function LoginScreen() {
  const router = useRouter();
  const { role: urlRole } = useLocalSearchParams<{ role: 'client' | 'provider' }>();
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
      showError(mapHttpError(400));
      return;
    }

    try {
      setIsLoading(true);
      setErrorVisible(false);
      
      const response = await axios.post(`${API}/auth/login`, { identifier, password });
      const authData = response.data;
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
          const pRes = await fetch(
            `${API}/providers/me`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (pRes.ok) {
            const provider = await pRes.json();
            if (provider.status?.toLowerCase() === 'approved') {
              router.replace('/(provider)');    // ← goes straight to dashboard
            } else {
              router.replace('/(provider)/pending');
            }
          } else if (pRes.status === 404) {
            // User is provider but no profile yet
            router.replace('/(provider)/register/type' as any);
          } else {
            router.replace('/(provider)/pending');
          }
        } catch {
          router.replace('/(provider)/pending');
        }
        return;
      }
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
  logoContainer: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.xl },
  logoText: { fontFamily: fonts.heading, fontSize: fontSizes.hero, color: colors.primary },
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
