import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRegistration } from '@/contexts/RegistrationContext';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RegisterStep4Screen() {
  const router = useRouter();
  const { form, update } = useRegistration();
  const { t } = useLanguage();

  const handlePickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      exif: false,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      update({ profilePhotoUri: result.assets[0].uri });
    }
  };

  const handlePickIdDocument = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      exif: false,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      update({ idDocumentUri: result.assets[0].uri });
    }
  };

  const handlePickPortfolio = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      exif: false,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUris = result.assets.map(a => a.uri);
      update({ portfolioUris: [...form.portfolioUris, ...newUris] });
    }
  };

  const removePortfolioImage = (uriToRemove: string) => {
    const updatedUris = form.portfolioUris.filter(uri => uri !== uriToRemove);
    update({ portfolioUris: updatedUris });
  };

  const isFormValid = form.profilePhotoUri !== '' && form.idDocumentUri !== '' && form.portfolioUris.length > 0;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.progressText}>{t('providerRegisterProgress').replace('{step}', '4').replace('{total}', '5')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={styles.progressSegment} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* SECTION 1: Profilbild */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('providerRegisterStep4ProfilePhotoTitle')}</Text>
          <View style={styles.profilePhotoContainer}>
            <TouchableOpacity style={styles.profilePhotoCircle} onPress={handlePickProfilePhoto}>
              {form.profilePhotoUri ? (
                <>
                  <Image source={{ uri: form.profilePhotoUri }} style={styles.profileImage} />
                  <View style={styles.editIconOverlay}>
                    <Feather name="edit-2" size={fontSizes.md} color={colors.background} />
                  </View>
                </>
              ) : (
                <View style={styles.profilePhotoEmpty}>
                  <Feather name="camera" size={fontSizes.hero} color={colors.textSecondary} style={{ marginBottom: spacing.xs }} />
                  <Text style={styles.emptyText}>{t('providerRegisterStep4AddPhoto')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 2: Ausweis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('providerRegisterStep4IdTitle')}</Text>
          <TouchableOpacity style={styles.documentCard} onPress={handlePickIdDocument}>
            {form.idDocumentUri ? (
              <View style={styles.documentFilled}>
                <Feather name="check-circle" size={fontSizes.xxl} color={colors.green} style={{ marginRight: spacing.sm }} />
                <Text style={styles.documentSuccessText}>{t('providerRegisterStep4IdUploaded')}</Text>
                <TouchableOpacity onPress={handlePickIdDocument} style={styles.changeDocBtn}>
                  <Text style={styles.changeDocText}>{t('providerRegisterStep4Change')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.documentEmpty}>
                <Feather name="file-text" size={fontSizes.xxl} color={colors.textSecondary} style={{ marginBottom: spacing.xs }} />
                <Text style={styles.documentEmptyTitle}>{t('providerRegisterStep4UploadId')}</Text>
                <Text style={styles.documentEmptySub}>{t('providerRegisterStep4IdSubtitle')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 3: Portfolio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('providerRegisterStep4PortfolioTitle')}</Text>
          <View style={styles.portfolioGrid}>
            {form.portfolioUris.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={styles.portfolioItemContainer}>
                <Image source={{ uri }} style={styles.portfolioImage} />
                <TouchableOpacity 
                  style={styles.portfolioRemoveBtn} 
                  onPress={() => removePortfolioImage(uri)}
                  accessibilityRole="button"
                  accessibilityLabel={t('portfolioDeleteTitle')}
                >
                  <Feather name="x" size={fontSizes.sm} color={colors.background} />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity
              style={styles.addPortfolioCard}
              onPress={handlePickPortfolio}
              accessibilityRole="button"
              accessibilityLabel={t('providerRegisterStep4AddPhoto')}
            >
              <Feather name="plus" size={fontSizes.xxl} color={colors.coral} style={{ marginBottom: spacing.xs }} />
              <Text style={styles.addPortfolioText}>{t('providerRegisterStep4AddPhoto')}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton 
          label={t('next')} 
          onPress={() => router.push('/(provider)/register/step5')} 
          disabled={!isFormValid}
          variant="filled"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm
  },
  backButton: { padding: spacing.xs, marginLeft: -spacing.xs },
  progressText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary },
  
  progressBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.xxs, marginBottom: spacing.md },
  progressSegment: { flex: 1, height: spacing.xxs, borderRadius: borderRadius.xs, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.coral },
  
  scrollContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  
  section: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.md },
  
  profilePhotoContainer: { alignItems: 'center', paddingVertical: spacing.md },
  profilePhotoCircle: {
    width: layout.avatarXl, height: layout.avatarXl, borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
    ...shadows.card,
  },
  profilePhotoEmpty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textSecondary },
  profileImage: { width: layout.avatarXl, height: layout.avatarXl, borderRadius: borderRadius.full },
  editIconOverlay: {
    position: 'absolute', bottom: spacing.none, right: spacing.none,
    backgroundColor: colors.coral, width: spacing.xl, height: spacing.xl, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: spacing.xxxs, borderColor: colors.background,
  },
  
  documentCard: {
    width: '100%', height: spacing.xxxxxl,
    borderRadius: borderRadius.md,
    borderWidth: spacing.unit, borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderStyle: 'dashed',
  },
  documentEmpty: { alignItems: 'center' },
  documentEmptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  documentEmptySub: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing.xxxs },
  documentFilled: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.greenLight, width: '100%', height: '100%', justifyContent: 'center', borderRadius: borderRadius.md, borderStyle: 'solid' },
  documentSuccessText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.green },
  changeDocBtn: { position: 'absolute', right: spacing.md, padding: spacing.xs },
  changeDocText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.primary },
  
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  portfolioItemContainer: { width: '47%', aspectRatio: 1, position: 'relative', borderRadius: borderRadius.md, overflow: 'hidden' },
  portfolioImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  portfolioRemoveBtn: { position: 'absolute', top: spacing.xs, right: spacing.xs, width: spacing.lg, height: spacing.lg, borderRadius: borderRadius.md - spacing.xxs, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  
  addPortfolioCard: {
    width: '47%', aspectRatio: 1,
    borderRadius: borderRadius.md,
    borderWidth: spacing.unit, borderColor: colors.coral, borderStyle: 'dashed',
    backgroundColor: colors.coralTint,
    justifyContent: 'center', alignItems: 'center',
  },
  addPortfolioText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.coral },
  
  footer: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: spacing.unit, borderTopColor: colors.border },
});
