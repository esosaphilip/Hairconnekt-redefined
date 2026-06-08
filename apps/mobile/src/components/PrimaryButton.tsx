import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, fontSizes, shadows, borderRadius, layout } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
}

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'filled' }: Props) {
  const isOutline = variant === 'outline';
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutline ? styles.outline : styles.filled,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.coral : colors.background} />
      ) : (
        <Text style={[styles.text, isOutline ? styles.textOutline : styles.textFilled]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  filled: {
    backgroundColor: colors.coral,
    ...shadows.button,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.coral,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
  },
  textFilled: {
    color: colors.background,
  },
  textOutline: {
    color: colors.coral,
  },
});
