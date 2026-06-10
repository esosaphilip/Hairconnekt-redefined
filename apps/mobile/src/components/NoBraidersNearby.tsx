import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../theme';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  radiusKm: number;
  onChangeRadius: () => void;
};

export function NoBraidersNearby({ radiusKm, onChangeRadius }: Props) {
  const { t } = useLanguage();
  const title = t('noBraidersNearbyTitle');
  const subtitle = t('noBraidersNearbySubtitle').replace('{radius}', String(radiusKm));
  const buttonLabel = t('noBraidersNearbyChangeRadius');
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name="map-pin" size={22} color={colors.coral} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <TouchableOpacity style={styles.button} onPress={onChangeRadius} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={buttonLabel}>
        <Feather name="sliders" size={16} color={colors.background} />
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.coralLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.background,
  },
});
