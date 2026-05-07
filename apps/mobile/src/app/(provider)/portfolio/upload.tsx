import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { apiFetch } from '@/services/apiClient';
import { useLanguage } from '@/contexts/LanguageContext';

const PRESET_TAGS = ['Knotless', 'Box Braids', 'Cornrows', 'Twists', 'Locs', 'Fades'];

export default function PortfolioUploadScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [imageUri, setImageUri] = useState<string | null>(null);
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
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let uri = asset.uri;
        // Android may return content:// — React Native Image + FormData accept it
        if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
          uri = `file://${uri}`;
        }
        setImageUri(uri);
        setErrorVisible(false);
      }
    } catch (error) {
      console.log('Error picking image', error);
      setErrorMessage('Fehler beim Auswählen des Bildes.');
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
    const trimmed = customTag.trim();
    if (trimmed && !styleTags.includes(trimmed)) {
      setStyleTags(prev => [...prev, trimmed]);
      setCustomTag('');
    }
  };

  const handleUpload = async () => {
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
        <TouchableOpacity onPress={() => router.replace('/(provider)/portfolio')} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Foto hochladen</Text>
        <View style={{ width: 40 }} />
      </View>

      <GermanErrorBanner visible={errorVisible} statusCode={errorStatus} message={errorMessage} actionLabel={t('appointmentsRetry')} onAction={handleUpload} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* Image Picker Zone */}
        <TouchableOpacity 
          style={[styles.imagePickerZone, !imageUri && styles.imagePickerZoneEmpty]} 
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" onError={(e) => console.log('Preview error:', e.nativeEvent.error)} />
              <View style={styles.changeImageOverlay}>
                <Feather name="camera" size={24} color={colors.background} />
                <Text style={styles.changeImageText}>Ändern</Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyPickerContent}>
              <Feather name="camera" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.md }} />
              <Text style={styles.emptyPickerText}>Foto auswählen</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Caption Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Caption (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={caption}
            onChangeText={setCaption}
            placeholder="Beschreibe diesen Style..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{caption.length}/200</Text>
        </View>

        {/* Style Tags */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Style-Tags</Text>
          <View style={styles.tagsContainer}>
            {PRESET_TAGS.map(tag => {
              const isSelected = styleTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Tag Input */}
          <View style={styles.customTagRow}>
            <TextInput
              style={styles.customTagInput}
              value={customTag}
              onChangeText={setCustomTag}
              placeholder="Eigener Tag..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={addCustomTag}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addCustomTag}>
              <Feather name="plus" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Custom Tags Display */}
          {styleTags.filter(t => !PRESET_TAGS.includes(t)).length > 0 && (
            <View style={[styles.tagsContainer, { marginTop: spacing.md }]}>
              {styleTags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, styles.tagChipSelected]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={styles.tagChipTextSelected}>{tag} <Feather name="x" size={12} /></Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton 
          label="Hochladen" 
          onPress={handleUpload}
          disabled={!imageUri}
          loading={isUploading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  scrollContainer: { padding: spacing.lg, paddingBottom: 40 },

  imagePickerZone: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    marginBottom: spacing.xl,
  },
  imagePickerZoneEmpty: {
    borderWidth: 2,
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
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeImageText: { fontFamily: fonts.bodyBold, color: colors.background, marginLeft: spacing.xs },
  emptyPickerContent: { alignItems: 'center', justifyContent: 'center' },
  emptyPickerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.lg, color: colors.textSecondary },

  inputGroup: { marginBottom: spacing.xl },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.sm },
  
  textArea: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: spacing.md,
    height: 100,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  charCount: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: 4 },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagChipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  tagChipTextSelected: { color: colors.background },

  customTagRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  customTagInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  }
});
