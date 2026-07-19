import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Image, SafeAreaView, Keyboard, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokenStorage } from '../../utils/token-storage';
import { colors, fonts, fontSizes, layout, spacing, borderRadius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormInput } from '../../components/FormInput';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { API } from '../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { COUNTRY_CODES, isValidInternationalPhone, sanitizePhoneNumber } from '@/utils/country-codes';

export default function RegisterScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const insets = useSafeAreaInsets();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dialCode, setDialCode] = useState('+49');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
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
    if (!firstName || !lastName || !email || !password || !confirmPassword || !phoneNumber.trim()) {
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

    const fullPhone = sanitizePhoneNumber(dialCode, phoneNumber);
    if (!isValidInternationalPhone(fullPhone)) {
      showError('Bitte gib eine gültige Telefonnummer ein.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorVisible(false);
      
      const response = await axios.post(`${API}/auth/register`, {
        firstName,
        lastName,
        email,
        phone: fullPhone,
        password,
        role: 'client',
        acceptedTerms,
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
          <Text style={styles.fieldLabel}>{t('phone')}</Text>
          <View style={styles.phoneRow}>
            <TouchableOpacity
              style={styles.dialCodeBtn}
              onPress={() => setShowCountryPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dialCodeText}>
                {COUNTRY_CODES.find(c => c.code === dialCode)?.flag} {dialCode}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
              ref={phoneRef}
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              inputMode="tel"
              placeholder="160 1234567"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              textContentType="telephoneNumber"
            />
          </View>
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

          <PrimaryButton label={t('registerCreateAccount')} onPress={handleRegister} loading={isLoading} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          onPress={() => router.push('/(auth)/login?role=client' as any)}
        >
          <Text style={styles.footerText}>Bereits registriert?</Text>
          <Text style={[styles.footerText, styles.footerLinkText]}> Anmelden</Text>
        </TouchableOpacity>

        <Modal
          visible={showCountryPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerOverlay}
            onPress={() => setShowCountryPicker(false)}
            activeOpacity={1}
          >
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerTitle}>Ländervorwahl</Text>
              <ScrollView>
                {COUNTRY_CODES.map((item) => (
                  <TouchableOpacity
                    key={item.iso}
                    style={styles.pickerRow}
                    onPress={() => {
                      setDialCode(item.code);
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={styles.pickerFlag}>{item.flag}</Text>
                    <Text style={styles.pickerCountry}>{item.country}</Text>
                    <Text style={styles.pickerCode}>{item.code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
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
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: spacing.unit,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  dialCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRightWidth: spacing.unit,
    borderRightColor: colors.border,
    gap: spacing.xxs,
    minWidth: 96,
  },
  dialCodeText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textPrimary },
  phoneInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.sm },
  checkbox: { width: spacing.lg, height: spacing.lg, borderRadius: borderRadius.sm - spacing.xxs, borderWidth: spacing.unit, borderColor: colors.border, marginRight: spacing.md, backgroundColor: colors.surface },
  checkboxChecked: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkboxText: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.sm + spacing.xxs,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  footerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  footerLinkText: { color: colors.primary },
  pickerOverlay: { flex: 1, backgroundColor: colors.overlaySoft, justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing.md,
    maxHeight: '70%',
  },
  pickerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  pickerFlag: { fontSize: fontSizes.xxl },
  pickerCountry: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textPrimary },
  pickerCode: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
});
