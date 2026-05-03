import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../theme';
import { mapHttpError } from '../utils/error-messages';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  statusCode?: number;
  message?: string;
  visible: boolean;
  onDismiss?: () => void;
}

export function GermanErrorBanner({ statusCode, message, visible, onDismiss }: Props) {
  const { lang } = useLanguage();
  if (!visible) return null;

  const errorMessage = mapHttpError(statusCode, message, lang);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{errorMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.error,
  },
});
