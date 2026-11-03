import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../theme';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  size?: 'sm' | 'md';
}

export function IdentityVerifiedBadge({ size = 'sm' }: Props) {
  const { t } = useLanguage();
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, isSmall ? styles.badgeSm : styles.badgeMd]}>
      <Feather name="check-circle" size={isSmall ? fontSizes.sm : fontSizes.md} color={colors.teal} />
      <Text style={[styles.text, isSmall ? styles.textSm : styles.textMd]}>
        {t('identityVerifiedBadge')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.tealLight,
    borderRadius: borderRadius.sm,
  },
  badgeSm: { paddingVertical: spacing.xxxs, paddingHorizontal: spacing.xs },
  badgeMd: { paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm },
  text: { fontFamily: fonts.bodyMedium, color: colors.teal, marginLeft: spacing.xxs },
  textSm: { fontSize: fontSizes.xs },
  textMd: { fontSize: fontSizes.sm },
});
