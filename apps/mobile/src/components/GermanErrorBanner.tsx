import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../theme';
import { mapHttpError } from '../utils/error-messages';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  statusCode?: number;
  message?: string;
  visible: boolean;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function GermanErrorBanner({ statusCode, message, visible, onDismiss, actionLabel, onAction }: Props) {
  const { lang } = useLanguage();
  if (!visible) return null;

  const errorMessage = mapHttpError(statusCode, message, lang);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{errorMessage}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
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
  action: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.error,
    textDecorationLine: 'underline',
  },
});
