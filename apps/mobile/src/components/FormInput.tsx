import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardTypeOptions, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borderRadius, colors, fonts, fontSizes, layout, spacing } from '../theme';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  secureText?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  multiline?: boolean;
  maxLength?: number;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  blurOnSubmit?: TextInputProps['blurOnSubmit'];
  autoCorrect?: TextInputProps['autoCorrect'];
  textContentType?: TextInputProps['textContentType'];
  inputMode?: TextInputProps['inputMode'];
}

export const FormInput = React.forwardRef<TextInput, Props>(function FormInput(
  {
    label,
    value,
    onChangeText,
    placeholder,
    error,
    secureText,
    keyboardType,
    autoCapitalize = 'none',
    editable = true,
    multiline,
    maxLength,
    returnKeyType,
    onSubmitEditing,
    blurOnSubmit,
    autoCorrect,
    textContentType,
    inputMode,
  },
  ref
) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(!secureText);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureText && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize as any}
          editable={editable}
          multiline={multiline}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          autoCorrect={autoCorrect}
          textContentType={textContentType}
          inputMode={inputMode}
        />
        {secureText && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? t('hidePassword') : t('showPassword')}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    height: layout.inputHeight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  eyeIcon: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    height: '100%',
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.coral,
    marginTop: spacing.xs,
  },
});
