import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RegisterStep2Screen() {
  const router = useRouter();
  const { form, update } = useRegistration();
  const { t } = useLanguage();

  const businessNameRef = useRef<TextInput>(null);
  const streetRef = useRef<TextInput>(null);
  const houseNumberRef = useRef<TextInput>(null);
  const postalCodeRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);

  const [businessName, setBusinessName] = useState(form.businessName || '');
  const [street, setStreet] = useState(form.street || '');
  const [houseNumber, setHouseNumber] = useState(form.houseNumber || '');
  const [postalCode, setPostalCode] = useState(form.postalCode || '');
  const [city, setCity] = useState(form.city || '');
  const [serviceRadius, setServiceRadius] = useState(form.serviceRadius || 10);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!businessName.trim()) newErrors.businessName = t('providerRegisterBusinessNameRequired');
    if (!street.trim()) newErrors.street = t('providerRegisterStreetRequired');
    if (!houseNumber.trim()) newErrors.houseNumber = t('providerRegisterHouseNumberRequired');
    if (!postalCode.trim()) newErrors.postalCode = t('providerRegisterPostalCodeRequired');
    if (!city.trim()) newErrors.city = t('providerRegisterCityRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    Keyboard.dismiss();
    if (validate()) {
      update({
        businessName: businessName.trim(),
        street: street.trim(),
        houseNumber: houseNumber.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        serviceRadius,
      });
      router.push('/(provider)/register/step3');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.progressText}>{t('providerRegisterProgress').replace('{step}', '2').replace('{total}', '5')}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
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
          <Text style={styles.title}>{t('providerRegisterStep2Title')}</Text>
          <Text style={styles.subtitle}>{t('providerRegisterStep2Subtitle')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('providerEditName')}</Text>
            <TextInput
              ref={businessNameRef}
              style={[styles.input, errors.businessName && styles.inputError]}
              value={businessName}
              onChangeText={(t) => { setBusinessName(t); setErrors(prev => ({...prev, businessName: ''})); }}
              placeholder={t('providerRegisterBusinessNamePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => streetRef.current?.focus()}
            />
            {errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2, marginRight: spacing.sm }]}>
              <Text style={styles.label}>{t('providerEditStreet')}</Text>
              <TextInput
                ref={streetRef}
                style={[styles.input, errors.street && styles.inputError]}
                value={street}
                onChangeText={(t) => { setStreet(t); setErrors(prev => ({...prev, street: ''})); }}
                placeholder={t('providerRegisterStreetPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => houseNumberRef.current?.focus()}
              />
              {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t('providerEditHouseNumber')}</Text>
              <TextInput
                ref={houseNumberRef}
                style={[styles.input, errors.houseNumber && styles.inputError]}
                value={houseNumber}
                onChangeText={(t) => { setHouseNumber(t); setErrors(prev => ({...prev, houseNumber: ''})); }}
                placeholder="1"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => postalCodeRef.current?.focus()}
              />
              {errors.houseNumber && <Text style={styles.errorText}>{errors.houseNumber}</Text>}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>{t('providerEditPostalCode')}</Text>
              <TextInput
                ref={postalCodeRef}
                style={[styles.input, errors.postalCode && styles.inputError]}
                value={postalCode}
                onChangeText={(t) => { setPostalCode(t); setErrors(prev => ({...prev, postalCode: ''})); }}
                placeholder="10115"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => cityRef.current?.focus()}
              />
              {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
            </View>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>{t('providerEditCity')}</Text>
              <TextInput
                ref={cityRef}
                style={[styles.input, errors.city && styles.inputError]}
                value={city}
                onChangeText={(t) => { setCity(t); setErrors(prev => ({...prev, city: ''})); }}
                placeholder="Berlin"
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('providerEditRadius')}</Text>
            <Text style={styles.radiusText}>{t('providerRegisterRadiusLabel').replace('{km}', String(serviceRadius))}</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={50}
              step={1}
              value={serviceRadius}
              onValueChange={setServiceRadius}
              minimumTrackTintColor={colors.coral}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.coral}
            />
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton label={t('next')} onPress={handleNext} variant="filled" />
        </View>
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
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.coral },
  
  scrollContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xxxl, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.xl },
  
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs },
  input: {
    fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textPrimary,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: borderRadius.md, height: layout.inputHeight, paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.error, marginTop: spacing.xs },
  
  radiusText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary, marginBottom: spacing.xs },
  slider: { width: '100%', height: layout.inputHeight },
  
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
