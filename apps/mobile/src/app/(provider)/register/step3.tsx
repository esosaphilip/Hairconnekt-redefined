import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';

export default function RegisterStep3Screen() {
  const router = useRouter();
  const { form, update } = useRegistration();

  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>(form.serviceIds || []);
  const [experienceYears, setExperienceYears] = useState(form.experienceYears || 1);
  const [languages, setLanguages] = useState<string[]>(form.languages || ['Deutsch']);
  
  const policyValues = ['24h', '48h', '72h'] as const;
  type PolicyType = typeof policyValues[number];
  
  const initialPolicy = form.cancellationPolicy && policyValues.includes(form.cancellationPolicy as any) 
    ? (form.cancellationPolicy as PolicyType) 
    : '24h';
    
  const [cancellationPolicy, setCancellationPolicy] = useState<PolicyType>(initialPolicy);
  const [bio, setBio] = useState(form.bio || '');

  const availableLanguages = ['Deutsch', 'Englisch', 'Französisch', 'Arabisch', 'Türkisch'];

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/services/categories`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setAvailableCategories(data || []);
      } catch (err) {
        setServicesError(true);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  const toggleService = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (lang: string) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]
    );
  };

  const handleNext = () => {
    if (languages.length === 0) return;
    update({ serviceIds: selectedIds, experienceYears, languages, cancellationPolicy, bio: bio.trim() });
    router.push('/(provider)/register/step4');
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.progressText}>Schritt 3 / 5</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={styles.progressSegment} />
        <View style={styles.progressSegment} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spezialisierungen</Text>
          <Text style={styles.sectionSubtitle}>Welche Services bietest du an?</Text>
          
          {loadingServices ? (
            <ActivityIndicator size="small" color={colors.coral} style={{ marginVertical: spacing.md }} />
          ) : servicesError ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>Dienste konnten nicht geladen werden.</Text>
            </View>
          ) : (
            <View style={styles.chipsRow}>
              {availableCategories.map((cat) => {
                const isSelected = selectedIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => toggleService(cat.id)}
                    style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                  >
                    <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* SECTION 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Erfahrung</Text>
          <Text style={styles.experienceLabel}>{experienceYears} Jahre Erfahrung</Text>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={20}
            step={1}
            value={experienceYears}
            onValueChange={setExperienceYears}
            minimumTrackTintColor={colors.coral}
            maximumTrackTintColor={colors.borderStrong || '#EEEEEE'}
            thumbTintColor={colors.coral}
          />
        </View>

        {/* SECTION 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sprachen</Text>
          <View style={styles.chipsRow}>
            {availableLanguages.map((lang) => {
              const isSelected = languages.includes(lang);
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => toggleLanguage(lang)}
                  style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
                >
                  <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {languages.length === 0 && (
            <Text style={[styles.errorText, { marginTop: spacing.xs, marginLeft: 0 }]}>Bitte wähle mindestens eine Sprache aus.</Text>
          )}
        </View>

        {/* SECTION 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stornierungsrichtlinie</Text>
          <View style={styles.pillsRow}>
            {policyValues.map((policy) => {
              const isSelected = cancellationPolicy === policy;
              return (
                <TouchableOpacity
                  key={policy}
                  onPress={() => setCancellationPolicy(policy)}
                  style={[styles.pill, isSelected ? styles.pillSelected : styles.pillUnselected]}
                >
                  <Text style={[styles.pillText, isSelected ? styles.pillTextSelected : styles.pillTextUnselected]}>
                    {policy}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 5 */}
        <View style={[styles.section, { borderBottomWidth: 0 }]}>
          <Text style={styles.sectionTitle}>Über mich (optional)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            maxLength={500}
            value={bio}
            onChangeText={setBio}
            placeholder="Erzähle Kunden von dir und deiner Arbeit..."
            textAlignVertical="top"
          />
          <Text style={styles.charCounter}>{bio.length}/500</Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
          label="Weiter" 
          onPress={handleNext} 
          variant="filled" 
          disabled={languages.length === 0}
        />
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
  
  section: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xs },
  sectionSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
  
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: spacing.sm, borderRadius: borderRadius.sm, marginBottom: spacing.sm },
  errorText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.error, marginLeft: spacing.sm },
  
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1 },
  chipSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipUnselected: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm },
  chipTextSelected: { color: colors.background },
  chipTextUnselected: { color: colors.textPrimary },
  
  experienceLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.sm },
  
  pillsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  pill: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  pillSelected: { backgroundColor: colors.coral },
  pillUnselected: { backgroundColor: '#F5F5F5' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md },
  pillTextSelected: { color: colors.background },
  pillTextUnselected: { color: colors.textSecondary },
  
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong || '#EEEEEE',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    height: 120,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  charCounter: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, textAlign: 'right', marginTop: spacing.xs },
  
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});