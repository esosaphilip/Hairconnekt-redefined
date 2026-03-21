import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';

export default function RegisterStep2Screen() {
  const router = useRouter();
  const { form, update } = useRegistration();

  const [businessName, setBusinessName] = useState(form.businessName || '');
  const [street, setStreet] = useState(form.street || '');
  const [houseNumber, setHouseNumber] = useState(form.houseNumber || '');
  const [postalCode, setPostalCode] = useState(form.postalCode || '');
  const [city, setCity] = useState(form.city || '');
  const [serviceRadius, setServiceRadius] = useState(form.serviceRadius || 10);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!businessName.trim()) newErrors.businessName = 'Business-Name ist erforderlich';
    if (!street.trim()) newErrors.street = 'Straße ist erforderlich';
    if (!houseNumber.trim()) newErrors.houseNumber = 'Nr. ist erforderlich';
    if (!postalCode.trim()) newErrors.postalCode = 'PLZ ist erforderlich';
    if (!city.trim()) newErrors.city = 'Stadt ist erforderlich';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
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
        <Text style={styles.progressText}>Schritt 2 / 5</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Business Profil</Text>
        <Text style={styles.subtitle}>Gib die Details deines Geschäfts ein</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business-Name</Text>
          <TextInput
            style={[styles.input, errors.businessName && styles.inputError]}
            value={businessName}
            onChangeText={(t) => { setBusinessName(t); setErrors(prev => ({...prev, businessName: ''})); }}
            placeholder="Mein Salon"
          />
          {errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2, marginRight: spacing.sm }]}>
            <Text style={styles.label}>Straße</Text>
            <TextInput
              style={[styles.input, errors.street && styles.inputError]}
              value={street}
              onChangeText={(t) => { setStreet(t); setErrors(prev => ({...prev, street: ''})); }}
              placeholder="Hauptstraße"
            />
            {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Hausnummer</Text>
            <TextInput
              style={[styles.input, errors.houseNumber && styles.inputError]}
              value={houseNumber}
              onChangeText={(t) => { setHouseNumber(t); setErrors(prev => ({...prev, houseNumber: ''})); }}
              placeholder="1"
            />
            {errors.houseNumber && <Text style={styles.errorText}>{errors.houseNumber}</Text>}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
            <Text style={styles.label}>PLZ</Text>
            <TextInput
              style={[styles.input, errors.postalCode && styles.inputError]}
              value={postalCode}
              onChangeText={(t) => { setPostalCode(t); setErrors(prev => ({...prev, postalCode: ''})); }}
              placeholder="10115"
              keyboardType="number-pad"
            />
            {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
          </View>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.label}>Stadt</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              value={city}
              onChangeText={(t) => { setCity(t); setErrors(prev => ({...prev, city: ''})); }}
              placeholder="Berlin"
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service-Radius</Text>
          <Text style={styles.radiusText}>Radius: {serviceRadius} km</Text>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={serviceRadius}
            onValueChange={setServiceRadius}
            minimumTrackTintColor={colors.coral}
            maximumTrackTintColor={colors.borderStrong || '#EEEEEE'}
            thumbTintColor={colors.coral}
          />
        </View>

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
  
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xs },
  input: {
    fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textPrimary,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong || '#EEEEEE',
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.error, marginTop: spacing.xs },
  
  radiusText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary, marginBottom: spacing.xs },
  
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
