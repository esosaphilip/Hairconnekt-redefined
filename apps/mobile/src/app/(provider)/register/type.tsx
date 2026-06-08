import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProviderTypeScreen() {
  const router = useRouter();
  const { update } = useRegistration();
  const { t } = useLanguage();
  const [selected, setSelected] = useState('');

  const types = [
    { value: 'freelancer', emoji: '🧑', titleKey: 'providerTypeFreelancerTitle', subtitleKey: 'providerTypeFreelancerSub' },
    { value: 'salon', emoji: '🏢', titleKey: 'providerTypeSalonTitle', subtitleKey: 'providerTypeSalonSub' },
    { value: 'mobile', emoji: '📍', titleKey: 'providerTypeMobileTitle', subtitleKey: 'providerTypeMobileSub' },
    { value: 'barber', emoji: '✂️', titleKey: 'providerTypeBarberTitle', subtitleKey: 'providerTypeBarberSub' },
  ];

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/account-type')}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>{t('providerTypeTitle')}</Text>
        <Text style={styles.subtitle}>{t('providerTypeSubtitle')}</Text>

        <View style={styles.cardsContainer}>
          {types.map((type) => {
            const isSelected = selected === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.card,
                  isSelected ? styles.cardSelected : styles.cardUnselected
                ]}
                onPress={() => setSelected(type.value)}
              >
                <Text style={styles.emoji}>{type.emoji}</Text>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>{t(type.titleKey)}</Text>
                  <Text style={styles.cardSubtitle}>{t(type.subtitleKey)}</Text>
                </View>
                <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
          label={t('next')} 
          onPress={() => {
            update({ providerType: selected });
            router.push('/(provider)/register/step1');
          }}
          disabled={!selected}
          variant="filled"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backButton: { padding: spacing.xs, marginLeft: -spacing.xs },
  
  scrollContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xxxl, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.xl },
  
  cardsContainer: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    backgroundColor: colors.background,
  },
  cardSelected: {
    borderColor: colors.coral,
    backgroundColor: colors.coralTint,
  },
  cardUnselected: {
    borderColor: colors.border,
  },
  emoji: { fontSize: 32, marginRight: spacing.md },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xxxs },
  cardSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  
  radioButton: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: colors.borderStrong, justifyContent: 'center', alignItems: 'center'
  },
  radioButtonSelected: { borderColor: colors.coral },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.coral },
  
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
