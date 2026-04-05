import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { colors, fonts, fontSizes, spacing, shadows } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { FormInput } from '../../../components/FormInput';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { tokenStorage } from '../../../utils/token-storage';
import { mapHttpError } from '../../../utils/error-messages';
import { API } from '../../../utils/api';

const AVAILABLE_LANGUAGES = ['Deutsch', 'Englisch', 'Französisch', 'Arabisch', 'Türkisch', 'Hausa', 'Yoruba', 'Igbo'];

type CancellationPolicy = '24h' | '48h' | '72h';

export default function EditProfileScreen() {
  const router = useRouter();

  const [form, setForm] = useState({
    businessName: '',
    bio: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    cancellationPolicy: '24h' as CancellationPolicy,
    languages: [] as string[],
    serviceRadius: 15,
  });

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  // BUG 4: bump after upload to force Image re-render
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API}/providers/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setForm({
          businessName: data.businessName || '',
          bio: data.bio || '',
          street: data.street || '',
          houseNumber: data.houseNumber || '',
          postalCode: data.postalCode || '',
          city: data.city || '',
          cancellationPolicy: (data.cancellationPolicy as CancellationPolicy) || '24h',
          languages: data.languages || [],
          serviceRadius: data.serviceRadius || 15,
        });
        if (data.avatarUrl) {
          setAvatarUri(data.avatarUrl);
        }
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorVisible(false);
      const token = await tokenStorage.getAccessToken();

      const response = await fetch(`${API}/providers/me`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw { response: { status: response.status } };
      }

      router.back();
    } catch (error: any) {
      setErrorMessage(mapHttpError(error?.response?.status));
      setErrorVisible(true);
    } finally {
      setIsSaving(false);
    }
  };

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking avatar', error);
      setErrorMessage('Fehler beim Auswählen des Bildes.');
      setErrorVisible(true);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setIsUploadingAvatar(true);
      setErrorVisible(false);
      
      // Optimistically show it
      setAvatarUri(uri);

      const token = await tokenStorage.getAccessToken();
      const formData = new FormData();
      
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const response = await fetch(`${API}/providers/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // BUG 8: do NOT set Content-Type; RN sets it with the boundary
        },
        body: formData,
      });

      if (!response.ok) {
        throw { response: { status: response.status } };
      }
      // BUG 4: bust cache so Image re-renders with new photo
      setAvatarVersion(Date.now());
    } catch (error: any) {
      console.log('Avatar upload error', error);
      setErrorMessage(mapHttpError(error?.response?.status));
      setErrorVisible(true);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setForm(prev => {
      if (prev.languages.includes(lang)) {
        return { ...prev, languages: prev.languages.filter(l => l !== lang) };
      } else {
        return { ...prev, languages: [...prev.languages, lang] };
      }
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil bearbeiten</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={styles.headerSaveText}>Speichern</Text>
        </TouchableOpacity>
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image key={`avatar-${avatarVersion}`} source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={48} color={colors.primaryLight} />
              </View>
            )}
            
            {isUploadingAvatar && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color={colors.background} />
              </View>
            )}

            <View style={styles.cameraIconContainer}>
              <Feather name="camera" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Basic Info */}
        <FormInput 
          label="Business-Name / Dein Name" 
          value={form.businessName} 
          onChangeText={(val) => setForm({ ...form, businessName: val })} 
          placeholder="Dein Anzeigename"
          maxLength={100}
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Über mich (Bio)</Text>
          <TextInput
            style={styles.bioInput}
            value={form.bio}
            onChangeText={(val) => setForm({ ...form, bio: val })}
            placeholder="Erzähle deinen Kunden etwas über dich..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{form.bio.length}/500</Text>
        </View>

        {/* Address */}
        <View style={styles.rowInputs}>
          <View style={{ flex: 2, marginRight: spacing.md }}>
            <FormInput 
              label="Straße" 
              value={form.street} 
              onChangeText={(val) => setForm({ ...form, street: val })} 
              placeholder="Musterstr."
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput 
              label="Nr." 
              value={form.houseNumber} 
              onChangeText={(val) => setForm({ ...form, houseNumber: val })} 
              placeholder="12a"
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <FormInput 
              label="PLZ" 
              value={form.postalCode} 
              onChangeText={(val) => setForm({ ...form, postalCode: val })} 
              placeholder="10115"
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 2 }}>
            <FormInput 
              label="Stadt" 
              value={form.city} 
              onChangeText={(val) => setForm({ ...form, city: val })} 
              placeholder="Berlin"
            />
          </View>
        </View>

        {/* Radius */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service-Radius: {form.serviceRadius} km</Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={50}
            step={5}
            value={form.serviceRadius}
            onValueChange={(val) => setForm({ ...form, serviceRadius: val })}
            minimumTrackTintColor={colors.coral}
            maximumTrackTintColor={colors.borderStrong}
            thumbTintColor={colors.coral}
          />
        </View>

        {/* Languages */}
        <View style={styles.inputGroup}>
          <Text style={styles.sectionTitle}>Sprachen</Text>
          <View style={styles.chipContainer}>
            {AVAILABLE_LANGUAGES.map(lang => {
              const isSelected = form.languages.includes(lang);
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleLanguage(lang)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.inputGroup}>
          <Text style={styles.sectionTitle}>Stornierungsrichtlinie</Text>
          
          <TouchableOpacity 
            style={[styles.radioCard, form.cancellationPolicy === '24h' && styles.radioCardSelected]}
            onPress={() => setForm({ ...form, cancellationPolicy: '24h' })}
            activeOpacity={0.8}
          >
            <View style={styles.radioHeader}>
              <Text style={[styles.radioTitle, form.cancellationPolicy === '24h' && styles.radioTitleSelected]}>24 Stunden</Text>
              <View style={[styles.radioCircle, form.cancellationPolicy === '24h' && styles.radioCircleSelected]}>
                {form.cancellationPolicy === '24h' && <View style={styles.radioInnerCircle} />}
              </View>
            </View>
            <Text style={styles.radioDesc}>Kostenlose Stornierung bis 24h vorher</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.radioCard, form.cancellationPolicy === '48h' && styles.radioCardSelected]}
            onPress={() => setForm({ ...form, cancellationPolicy: '48h' })}
            activeOpacity={0.8}
          >
            <View style={styles.radioHeader}>
              <Text style={[styles.radioTitle, form.cancellationPolicy === '48h' && styles.radioTitleSelected]}>48 Stunden</Text>
              <View style={[styles.radioCircle, form.cancellationPolicy === '48h' && styles.radioCircleSelected]}>
                {form.cancellationPolicy === '48h' && <View style={styles.radioInnerCircle} />}
              </View>
            </View>
            <Text style={styles.radioDesc}>Kostenlose Stornierung bis 48h vorher</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.radioCard, form.cancellationPolicy === '72h' && styles.radioCardSelected]}
            onPress={() => setForm({ ...form, cancellationPolicy: '72h' })}
            activeOpacity={0.8}
          >
            <View style={styles.radioHeader}>
              <Text style={[styles.radioTitle, form.cancellationPolicy === '72h' && styles.radioTitleSelected]}>72 Stunden</Text>
              <View style={[styles.radioCircle, form.cancellationPolicy === '72h' && styles.radioCircleSelected]}>
                {form.cancellationPolicy === '72h' && <View style={styles.radioInnerCircle} />}
              </View>
            </View>
            <Text style={styles.radioDesc}>Kostenlose Stornierung bis 72h vorher</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton 
          label="Änderungen speichern" 
          onPress={handleSave}
          loading={isSaving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: { minWidth: 60, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  headerSaveText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.teal, textAlign: 'right' },

  scrollContainer: { padding: spacing.lg, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 60 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },

  inputGroup: { marginBottom: spacing.xl },
  label: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.sm },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.md },
  
  bioInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 120,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  charCount: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: 4 },

  slider: { width: '100%', height: 40 },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
  chipTextSelected: { color: colors.background },

  radioCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#EEEEEE',
    ...shadows.card,
  },
  radioCardSelected: { borderColor: colors.coral, backgroundColor: '#FFF9F8' },
  radioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  radioTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  radioTitleSelected: { color: colors.coral },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: { borderColor: colors.coral },
  radioInnerCircle: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.coral },
  radioDesc: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }
});
