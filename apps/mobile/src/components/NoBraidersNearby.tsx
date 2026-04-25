import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../theme';

type Props = {
  radiusKm: number;
  onChangeRadius: () => void;
};

export function NoBraidersNearby({ radiusKm, onChangeRadius }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name="map-pin" size={22} color={colors.coral} />
      </View>
      <Text style={styles.title}>Keine Braider in deiner Nähe</Text>
      <Text style={styles.subtitle}>
        Im Umkreis von {radiusKm} km wurden aktuell keine Anbieter gefunden.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onChangeRadius} activeOpacity={0.9}>
        <Feather name="sliders" size={16} color={colors.background} />
        <Text style={styles.buttonText}>Suchradius ändern</Text>
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

