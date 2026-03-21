import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';

export default function ProviderTypeScreen() {
  const router = useRouter();
  const { update } = useRegistration();
  const [selected, setSelected] = useState('');

  const types = [
    { value: 'freelancer', emoji: '🧑', title: 'Einzelperson / Freelancer', subtitle: 'Ich arbeite selbstständig' },
    { value: 'salon', emoji: '🏢', title: 'Salon / Barbershop', subtitle: 'Ich habe ein Geschäft' },
    { value: 'mobile', emoji: '📍', title: 'Mobiler Service', subtitle: 'Ich komme zu meinen Kunden' },
    { value: 'barber', emoji: '✂️', title: 'Barber', subtitle: 'Haar- und Bartpflege' }
  ];

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/account-type')}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Was beschreibt dich am besten?</Text>
        <Text style={styles.subtitle}>Wähle deine Kontoart aus</Text>

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
                  <Text style={styles.cardTitle}>{type.title}</Text>
                  <Text style={styles.cardSubtitle}>{type.subtitle}</Text>
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
          label="Weiter" 
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
    borderColor: '#E05A4E', // coral
    backgroundColor: '#FFF5F4',
  },
  cardUnselected: {
    borderColor: '#EEEEEE',
  },
  emoji: { fontSize: 32, marginRight: spacing.md },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: 2 },
  cardSubtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  
  radioButton: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: colors.borderStrong || '#EEEEEE', justifyContent: 'center', alignItems: 'center'
  },
  radioButtonSelected: { borderColor: '#E05A4E' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E05A4E' },
  
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
