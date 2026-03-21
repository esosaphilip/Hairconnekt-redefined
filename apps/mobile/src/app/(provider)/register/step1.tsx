import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';

export default function RegisterStep1Screen() {
  const router = useRouter();
  const { form, update } = useRegistration();

  const [firstName, setFirstName] = useState(form.firstName || '');
  const [lastName, setLastName] = useState(form.lastName || '');
  const [email, setEmail] = useState(form.email || '');
  const [phone, setPhone] = useState(form.phone || '');
  const [password, setPassword] = useState(form.password || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(form.acceptedTerms || false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatPhone = (raw: string): string => {
    let cleaned = raw.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
    if (cleaned.startsWith('0')) cleaned = '+49' + cleaned.slice(1);
    if (cleaned.startsWith('49') && !cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
  };

  const isPhoneValid = (p: string) => /^\+49\d{9,12}$/.test(p);
  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'Vorname ist erforderlich';
    if (!lastName.trim()) newErrors.lastName = 'Nachname ist erforderlich';
    
    if (!email.trim()) newErrors.email = 'E-Mail ist erforderlich';
    else if (!isEmailValid(email)) newErrors.email = 'Bitte gib eine gültige E-Mail-Adresse ein';

    if (!phone.trim()) newErrors.phone = 'Telefonnummer ist erforderlich';
    else if (!isPhoneValid(formatPhone(phone))) newErrors.phone = 'Bitte gib eine gültige deutsche Telefonnummer ein. (+49...)';

    if (!password) newErrors.password = 'Passwort ist erforderlich';
    else if (password.length < 8) newErrors.password = 'Passwort muss mindestens 8 Zeichen lang sein';

    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwörter stimmen nicht überein.';

    if (!acceptedTerms) newErrors.acceptedTerms = 'Bitte akzeptiere die AGB.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: formatPhone(phone),
        password,
        acceptedTerms: true,
      });
      router.push('/(provider)/register/step2');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.progressText}>Schritt 1 / 5</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Persönliche Daten</Text>
        <Text style={styles.subtitle}>Bitte gib deine Daten ein</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vorname</Text>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            value={firstName}
            onChangeText={(t) => { setFirstName(t); setErrors(prev => ({...prev, firstName: ''})); }}
            placeholder="Max"
          />
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nachname</Text>
          <TextInput
            style={[styles.input, errors.lastName && styles.inputError]}
            value={lastName}
            onChangeText={(t) => { setLastName(t); setErrors(prev => ({...prev, lastName: ''})); }}
            placeholder="Mustermann"
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-Mail</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors(prev => ({...prev, email: ''})); }}
            placeholder="max@beispiel.de"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefon (+49...)</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={phone}
            onChangeText={(t) => { setPhone(t); setErrors(prev => ({...prev, phone: ''})); }}
            placeholder="+49 160 1234567"
            keyboardType="phone-pad"
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Passwort</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors(prev => ({...prev, password: ''})); }}
              placeholder="Mindestens 8 Zeichen"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Passwort bestätigen</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrors(prev => ({...prev, confirmPassword: ''})); }}
              placeholder="Passwort wiederholen"
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <View style={styles.termsContainer}>
          <Switch
            value={acceptedTerms}
            onValueChange={(val) => { setAcceptedTerms(val); setErrors(prev => ({...prev, acceptedTerms: ''})); }}
            trackColor={{ true: colors.coral, false: colors.borderStrong || '#EEEEEE' }}
          />
          <Text style={styles.termsText}>
            Ich akzeptiere die <Text style={styles.linkText}>AGB für Anbieter</Text> und <Text style={styles.linkText}>Datenschutzerklärung</Text>
          </Text>
        </View>
        {errors.acceptedTerms && <Text style={styles.errorText}>{errors.acceptedTerms}</Text>}

      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Weiter" onPress={handleNext} variant="filled" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm
  },
  backButton: { padding: spacing.xs, marginLeft: -spacing.xs },
  progressText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary },
  
  progressBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: 4, marginBottom: spacing.md },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.coral },
  
  scrollContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xxxl, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.xl },
  
  inputGroup: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs },
  input: {
    fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textPrimary,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong || '#EEEEEE',
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.error, marginTop: spacing.xs },
  
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 0, padding: 15 },
  
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xs, paddingRight: spacing.xl },
  termsText: { flex: 1, marginLeft: spacing.md, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },
  linkText: { color: colors.teal, textDecorationLine: 'underline' },
  
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
