import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, TextInput, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { apiFetch } from '@/services/apiClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError, debugLog } from '@/utils/logger';

const PRESET_TAGS: {
  value: string;
  labelKey:
    | 'portfolioTagKnotless'
    | 'portfolioTagBoxBraids'
    | 'portfolioTagCornrows'
    | 'portfolioTagTwists'
    | 'portfolioTagLocs'
    | 'portfolioTagFades';
}[] = [
  { value: 'Knotless', labelKey: 'portfolioTagKnotless' },
  { value: 'Box Braids', labelKey: 'portfolioTagBoxBraids' },
  { value: 'Cornrows', labelKey: 'portfolioTagCornrows' },
  { value: 'Twists', labelKey: 'portfolioTagTwists' },
  { value: 'Locs', labelKey: 'portfolioTagLocs' },
  { value: 'Fades', labelKey: 'portfolioTagFades' },
];

export default function PortfolioUploadScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.7,
        exif: false,
        base64: Platform.OS === 'android',
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let uri = asset.uri;
        // Android may return content:// — React Native Image + FormData accept it
        if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
          uri = `file://${uri}`;
        }
        setImageUri(uri);
        setPreviewUri(
          Platform.OS === 'android' && asset.base64
            ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
            : uri,
        );
        setErrorVisible(false);
      }
    } catch (error) {
      debugError('Portfolio image selection failed', error);
      setErrorMessage(t('pickImageError'));
      setErrorVisible(true);
    }
  };

  const toggleTag = (tag: string) => {
    if (styleTags.includes(tag)) {
      setStyleTags(prev => prev.filter(t => t !== tag));
    } else {
      setStyleTags(prev => [...prev, tag]);
    }
  };

  const addCustomTag = () => {
    Keyboard.dismiss();
    const trimmed = customTag.trim();
    if (trimmed && !styleTags.includes(trimmed)) {
      setStyleTags(prev => [...prev, trimmed]);
      setCustomTag('');
    }
  };

  const handleUpload = async () => {
    Keyboard.dismiss();
    if (!imageUri) return;

    try {
      setIsUploading(true);
      setErrorVisible(false);

      const formData = new FormData();

      const filename = imageUri.split('/').pop() ?? 'portfolio.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

      formData.append('portfolio', {
        uri: imageUri,
        type,
        name: filename,
      } as any);

      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      if (styleTags.length > 0) {
        formData.append('styleTags', JSON.stringify(styleTags));
      }

      const res = await apiFetch('/providers/me/portfolio', {
        method: 'POST',
        auth: true,
        body: formData,
        timeoutMs: 60000,
      });

      if (!res.ok) {
        setErrorStatus(res.status);
        setErrorMessage(t('errorUnknown'));
        setErrorVisible(true);
        return;
      }

      router.replace('/(provider)/portfolio');
    } catch (err) {
      setErrorStatus((err as any)?.status ?? (err as any)?.response?.status);
      setErrorMessage((err as any)?.message ?? t('errorUnknown'));
      setErrorVisible(true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(provider)/portfolio')}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('portfolioUploadTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      <GermanErrorBanner visible={errorVisible} statusCode={errorStatus} message={errorMessage} actionLabel={t('appointmentsRetry')} onAction={handleUpload} />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={[styles.imagePickerZone, !imageUri && styles.imagePickerZoneEmpty]}
            onPress={pickImage}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={imageUri ? t('portfolioUploadChange') : t('portfolioUploadPick')}
          >
            {imageUri ? (
              <>
                <Image
                  key={previewUri ?? imageUri}
                  source={{ uri: previewUri ?? imageUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                  onError={() => debugLog('Portfolio preview failed')}
                />
                <View style={styles.changeImageOverlay}>
                  <Feather name="camera" size={fontSizes.xxl} color={colors.background} />
                  <Text style={styles.changeImageText}>{t('portfolioUploadChange')}</Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyPickerContent}>
                <Feather name="camera" size={spacing.xxl} color={colors.textTertiary} style={{ marginBottom: spacing.md }} />
                <Text style={styles.emptyPickerText}>{t('portfolioUploadPick')}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('portfolioUploadCaptionOptional')}</Text>
            <TextInput
              style={styles.textArea}
              value={caption}
              onChangeText={setCaption}
              placeholder={t('portfolioUploadCaptionPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={200}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={styles.charCount}>{caption.length}/200</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('portfolioUploadStyleTags')}</Text>
            <View style={styles.tagsContainer}>
              {PRESET_TAGS.map((tag) => {
                const isSelected = styleTags.includes(tag.value);
                return (
                  <TouchableOpacity
                    key={tag.value}
                    style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                    onPress={() => toggleTag(tag.value)}
                    accessibilityRole="button"
                    accessibilityLabel={t(tag.labelKey)}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                      {t(tag.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.customTagRow}>
              <TextInput
                style={styles.customTagInput}
                value={customTag}
                onChangeText={setCustomTag}
                placeholder={t('portfolioUploadCustomTagPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={addCustomTag}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={addCustomTag}
                accessibilityRole="button"
                accessibilityLabel={t('portfolioUploadAddTag')}
              >
                <Feather name="plus" size={fontSizes.xl} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {styleTags.filter((t) => !PRESET_TAGS.some((p) => p.value === t)).length > 0 && (
              <View style={[styles.tagsContainer, { marginTop: spacing.md }]}>
                {styleTags
                  .filter((t) => !PRESET_TAGS.some((p) => p.value === t))
                  .map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, styles.tagChipSelected]}
                      onPress={() => toggleTag(tag)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('delete')}: ${tag}`}
                    >
                      <Text style={styles.tagChipTextSelected}>
                        {tag} <Feather name="x" size={fontSizes.xs} />
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={t('portfolioUploadButton')}
            onPress={handleUpload}
            disabled={!imageUri}
            loading={isUploading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  backButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  scrollContainer: { padding: spacing.lg, paddingBottom: spacing.xl2 },

  imagePickerZone: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
  },
  imagePickerZoneEmpty: {
    borderWidth: spacing.xxxs,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: { width: '100%', height: '100%' },
  changeImageOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeImageText: { fontFamily: fonts.bodyBold, color: colors.background, marginLeft: spacing.xs },
  emptyPickerContent: { alignItems: 'center', justifyContent: 'center' },
  emptyPickerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.lg, color: colors.textSecondary },

  inputGroup: { marginBottom: spacing.xl },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.sm },
  
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs,
    padding: spacing.md,
    height: layout.textAreaHeight - spacing.lg,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  charCount: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xxs },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surface,
    borderWidth: spacing.unit,
    borderColor: colors.border,
  },
  tagChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagChipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  tagChipTextSelected: { color: colors.background },

  customTagRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  customTagInput: {
    flex: 1,
    height: layout.inputHeight - spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg - borderRadius.xs,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  addTagButton: {
    width: layout.inputHeight - spacing.xxs,
    height: layout.inputHeight - spacing.xxs,
    borderRadius: borderRadius.lg - borderRadius.xs,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: spacing.unit,
    borderTopColor: colors.border,
  }
});
