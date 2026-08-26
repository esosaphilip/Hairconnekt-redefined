import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '@/theme';

type LanguageSelectorVariant = 'row' | 'compact' | 'minimal';

interface LanguageSelectorProps {
  variant?: LanguageSelectorVariant;
  style?: ViewStyle;
  pillStyle?: ViewStyle;
  pillTextStyle?: TextStyle;
}

export function LanguageSelector({
  variant = 'row',
  style,
  pillStyle,
  pillTextStyle,
}: LanguageSelectorProps) {
  const { lang, setLang, t } = useLanguage();

  const deLabel = t('settingsLanguageDe');
  const enLabel = t('settingsLanguageEn');

  if (variant === 'compact') {
    return (
      <View style={[styles.compactRow, style]}>
        <TouchableOpacity
          style={[
            styles.compactPill,
            lang === 'de' && styles.compactPillActive,
            pillStyle,
          ]}
          onPress={() => setLang('de')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Deutsch"
          accessibilityState={{ selected: lang === 'de' }}
        >
          <Text
            style={[
              styles.compactPillText,
              lang === 'de' && styles.compactPillTextActive,
              pillTextStyle,
            ]}
          >
            {deLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.compactPill,
            lang === 'en' && styles.compactPillActive,
            pillStyle,
          ]}
          onPress={() => setLang('en')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="English"
          accessibilityState={{ selected: lang === 'en' }}
        >
          <Text
            style={[
              styles.compactPillText,
              lang === 'en' && styles.compactPillTextActive,
              pillTextStyle,
            ]}
          >
            {enLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (variant === 'minimal') {
    return (
      <View style={[styles.minimalRow, style]}>
        <TouchableOpacity
          style={[
            styles.minimalPill,
            lang === 'de' && styles.minimalPillActive,
            pillStyle,
          ]}
          onPress={() => setLang('de')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Deutsch"
          accessibilityState={{ selected: lang === 'de' }}
        >
          <Text
            style={[
              styles.minimalPillText,
              lang === 'de' && styles.minimalPillTextActive,
              pillTextStyle,
            ]}
          >
            {deLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.minimalPill,
            lang === 'en' && styles.minimalPillActive,
            pillStyle,
          ]}
          onPress={() => setLang('en')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="English"
          accessibilityState={{ selected: lang === 'en' }}
        >
          <Text
            style={[
              styles.minimalPillText,
              lang === 'en' && styles.minimalPillTextActive,
              pillTextStyle,
            ]}
          >
            {enLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.langRow, style]}>
      <TouchableOpacity
        style={[styles.langPill, lang === 'de' && styles.langPillActive, pillStyle]}
        onPress={() => setLang('de')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={deLabel}
        accessibilityState={{ selected: lang === 'de' }}
      >
        <Text
          style={[
            styles.langPillText,
            lang === 'de' && styles.langPillTextActive,
            pillTextStyle,
          ]}
        >
          {deLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.langPill, lang === 'en' && styles.langPillActive, pillStyle]}
        onPress={() => setLang('en')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={enLabel}
        accessibilityState={{ selected: lang === 'en' }}
      >
        <Text
          style={[
            styles.langPillText,
            lang === 'en' && styles.langPillTextActive,
            pillTextStyle,
          ]}
        >
          {enLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  langPill: {
    flex: 1,
    minHeight: layout.inputHeight,
    borderRadius: borderRadius.full,
    borderWidth: spacing.unit,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  langPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  langPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  langPillTextActive: {
    color: colors.primary,
  },
  compactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  compactPill: {
    minHeight: layout.inputHeightMd,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: spacing.unit,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  compactPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  compactPillTextActive: {
    color: colors.primary,
  },
  minimalRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  minimalPill: {
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: spacing.unit,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  minimalPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  minimalPillTextActive: {
    color: colors.primary,
  },
});
