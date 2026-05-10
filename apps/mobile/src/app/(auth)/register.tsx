import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Image, SafeAreaView, Keyboard, TextInput } from 'react-native';
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
  const { lang, t } = useLanguage();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+49');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  
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
    Keyboard.dismiss();
    if (!firstName || !lastName || !email || !password || !confirmPassword || !phone) {
      showError(mapHttpError(422, undefined, lang));
      return;
    }
    if (password !== confirmPassword) {
      showError(t('passwordsDontMatch'));
      return;
    }
    if (!acceptedTerms) {
      showError(t('acceptTermsRequired'));
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require('../../../assets/logo-full.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.heading}>{t('registerClientTitle')}</Text>

          <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

          <FormInput
            ref={firstNameRef}
            label={t('firstName')}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => lastNameRef.current?.focus()}
          />
          <FormInput
            ref={lastNameRef}
            label={t('lastName')}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <FormInput
            ref={emailRef}
            label={t('email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => phoneRef.current?.focus()}
            textContentType="emailAddress"
          />
          <FormInput
            ref={phoneRef}
            label={t('phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            inputMode="tel"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            textContentType="telephoneNumber"
          />
          <FormInput
            ref={passwordRef}
            label={t('password')}
            value={password}
            onChangeText={setPassword}
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
            onSubmitEditing={handleRegister}
            textContentType="newPassword"
          />

          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAcceptedTerms(!acceptedTerms)}>
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]} />
            <Text style={styles.checkboxText}>{t('acceptTerms')}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label={t('registerCreateAccount')} onPress={handleRegister} loading={isLoading} />
          <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/(auth)/login?role=client' as any)}>
            <Text style={styles.footerText}>{t('registerAlreadyHaveAccount')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  logo: { width: spacing.xxl * 4 + spacing.xs, height: layout.avatarMd, alignSelf: 'center', marginBottom: spacing.xl },
  heading: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary, marginBottom: spacing.xl, textAlign: 'center' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginRight: spacing.md, backgroundColor: colors.surface },
  checkboxChecked: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkboxText: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  footerLink: { alignItems: 'center', marginTop: spacing.md },
  footerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
});
