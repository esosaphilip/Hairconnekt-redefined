import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Switch, KeyboardAvoidingView, Platform, Keyboard, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, lineHeights, spacing, borderRadius, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { COUNTRY_CODES, isValidInternationalPhone, sanitizePhoneNumber } from '@/utils/country-codes';

export default function RegisterStep1Screen() {
  const router = useRouter();
  const { form, update } = useRegistration();
  const { t } = useLanguage();
  const initialDialCode =
    COUNTRY_CODES
      .slice()
      .sort((a, b) => b.code.length - a.code.length)
      .find((item) => (form.phone || '').startsWith(item.code))?.code ?? '+49';
  const initialPhoneNumber =
    form.phone && form.phone.startsWith(initialDialCode)
      ? form.phone.slice(initialDialCode.length)
      : '';

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [firstName, setFirstName] = useState(form.firstName || '');
  const [lastName, setLastName] = useState(form.lastName || '');
  const [email, setEmail] = useState(form.email || '');
  const [dialCode, setDialCode] = useState(initialDialCode);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState(form.password || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(form.acceptedTerms || false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = t('providerRegisterFirstNameRequired');
    if (!lastName.trim()) newErrors.lastName = t('providerRegisterLastNameRequired');
    
    if (!email.trim()) newErrors.email = t('providerRegisterEmailRequired');
    else if (!isEmailValid(email)) newErrors.email = t('providerRegisterEmailInvalid');

    if (!phoneNumber.trim()) {
      newErrors.phone = t('providerRegisterPhoneRequired');
    } else {
      const fullPhone = sanitizePhoneNumber(dialCode, phoneNumber);
      if (!isValidInternationalPhone(fullPhone)) {
        newErrors.phone = 'Bitte gib eine gültige Telefonnummer ein.';
      }
    }

    if (!password) newErrors.password = t('providerRegisterPasswordRequired');
    else if (password.length < 8) newErrors.password = t('providerRegisterPasswordTooShort');

    if (password !== confirmPassword) newErrors.confirmPassword = t('passwordsDontMatch');

    if (!acceptedTerms) newErrors.acceptedTerms = t('providerRegisterAcceptTermsRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    Keyboard.dismiss();
    if (validate()) {
      update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: sanitizePhoneNumber(dialCode, phoneNumber),
        password,
        acceptedTerms: true,
      });
      router.push('/(provider)/register/step2');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.progressText}>{t('providerRegisterProgress').replace('{step}', '1').replace('{total}', '5')}</Text>
        <View style={{ width: fontSizes.xxl }} />
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('providerRegisterStep1Title')}</Text>
          <Text style={styles.subtitle}>{t('providerRegisterStep1Subtitle')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('firstName')}</Text>
            <TextInput
              ref={firstNameRef}
              style={[styles.input, errors.firstName && styles.inputError]}
              value={firstName}
              onChangeText={(t) => { setFirstName(t); setErrors(prev => ({...prev, firstName: ''})); }}
              placeholder="Max"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('lastName')}</Text>
            <TextInput
              ref={lastNameRef}
              style={[styles.input, errors.lastName && styles.inputError]}
              value={lastName}
              onChangeText={(t) => { setLastName(t); setErrors(prev => ({...prev, lastName: ''})); }}
              placeholder="Mustermann"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('email')}</Text>
            <TextInput
              ref={emailRef}
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors(prev => ({...prev, email: ''})); }}
              placeholder="max@beispiel.de"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefonnummer</Text>
            <View style={[styles.phoneRow, errors.phone && styles.inputError]}>
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
                onChangeText={(value) => {
                  setPhoneNumber(value);
                  setErrors(prev => ({ ...prev, phone: '' }));
                }}
                placeholder="160 1234567"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                textContentType="telephoneNumber"
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('password')}</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors(prev => ({...prev, password: ''})); }}
                placeholder={t('providerRegisterPasswordPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('hidePassword') : t('showPassword')}
              >
                <Feather name={showPassword ? "eye" : "eye-off"} size={fontSizes.xl} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('passwordConfirm')}</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                ref={confirmPasswordRef}
                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrors(prev => ({...prev, confirmPassword: ''})); }}
                placeholder={t('providerRegisterPasswordConfirmPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? t('hidePassword') : t('showPassword')}
              >
                <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={fontSizes.xl} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <View style={styles.termsContainer}>
            <Switch
              value={acceptedTerms}
              onValueChange={(val) => { setAcceptedTerms(val); setErrors(prev => ({...prev, acceptedTerms: ''})); }}
              trackColor={{ true: colors.coral, false: colors.border }}
            />
            <Text style={styles.termsText}>
              {t('providerRegisterTermsPrefix')}{' '}
              <Text style={styles.linkText}>{t('providerRegisterTermsProviders')}</Text> {t('providerRegisterTermsAnd')}{' '}
              <Text style={styles.linkText}>{t('providerRegisterTermsPrivacy')}</Text>
            </Text>
          </View>
          {errors.acceptedTerms && <Text style={styles.errorText}>{errors.acceptedTerms}</Text>}

        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label={t('next')} onPress={handleNext} variant="filled" />
        </View>

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
                      setErrors(prev => ({ ...prev, phone: '' }));
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
  safeContainer: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm
  },
  backButton: { padding: spacing.xs, marginLeft: -spacing.xs },
  progressText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary },
  
  progressBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.xxs, marginBottom: spacing.md },
  progressSegment: { flex: 1, height: spacing.xxs, borderRadius: borderRadius.xs, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.coral },
  
  scrollContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xxxl, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.xl },
  
  inputGroup: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs },
  input: {
    fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textPrimary,
    backgroundColor: colors.surface, borderWidth: spacing.unit, borderColor: colors.borderStrong,
    borderRadius: borderRadius.md, height: layout.inputHeight, paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.error, marginTop: spacing.xs },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: spacing.unit,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
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
  
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: spacing.xxl },
  eyeIcon: { position: 'absolute', right: spacing.none, paddingHorizontal: spacing.md, height: '100%', justifyContent: 'center' },
  
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xs, paddingRight: spacing.xl },
  termsText: { flex: 1, marginLeft: spacing.md, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: lineHeights.sm },
  linkText: { color: colors.teal, textDecorationLine: 'underline' },
  
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: spacing.unit, borderTopColor: colors.border },
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
