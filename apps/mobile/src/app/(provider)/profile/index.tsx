import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, fontSizes, spacing, shadows, borderRadius, layout } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';
import { AuthService } from '../../../services/authService';
import { apiFetch, apiJson } from '@/services/apiClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError } from '@/utils/logger';


export default function ProviderProfileHubScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [provider, setProvider] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [pData, uData] = await Promise.all([
        apiJson<any>('/providers/me', { auth: true }).catch(() => null),
        apiJson<any>('/users/me', { auth: true }).catch(() => null),
      ]);

      if (pData) setProvider(pData.data || pData);
      if (uData) setUser(uData.data || uData);
    } catch (error) {
      debugError('Provider profile hub load failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionMissingTitle'), t('photoPermissionBody'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await apiFetch('/providers/me/avatar', {
        auth: true,
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const newUrl = data.data?.avatarUrl || uri;
        setProvider((prev: any) => ({ ...prev, avatarUrl: newUrl }));
        setUser((prev: any) => ({ ...prev, avatarUrl: newUrl }));
      } else {
        Alert.alert(t('error'), t('avatarUploadFailed'));
      }
    } catch (error) {
      debugError('Provider profile avatar upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  const switchToClientMode = () => {
    Alert.alert(
      t('switchToClientTitle'),
      t('switchToClientBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('next'),
          onPress: async () => {
            await AuthService.logout();
            router.replace('/(auth)/login?role=client' as any);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('settingsLogoutConfirm'),
      t('settingsLogoutBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('logout'), 
          style: 'destructive',
          onPress: async () => {
            await tokenStorage.clear();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </SafeAreaView>
    );
  }

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const displayName = provider?.businessName || (fullName.length > 0 ? fullName : t('myProfile'));
  const avgRating = Number(provider?.avgRating);
  const totalReviews = Number(provider?.totalReviews);

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>{t('tabProfile')}</Text>
        <TouchableOpacity onPress={() => router.push('/(shared)/settings' as any)} style={styles.headerIcon}>
          <Feather name="settings" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        
        {/* TOP SECTION */}
        <View style={styles.topSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar} disabled={isUploading}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={48} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="camera" size={16} color={colors.primary} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>{displayName}</Text>
          
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>{provider?.city || t('notSpecified')}</Text>
          </View>

          {Number.isFinite(avgRating) && avgRating > 0 && (
            <Text style={styles.ratingText}>
              ⭐ {avgRating.toFixed(1)} ({Number.isFinite(totalReviews) ? totalReviews : 0} {t('providerReviewsCount')})
            </Text>
          )}

          <View style={[styles.statusBadge, provider?.status?.toLowerCase() === 'approved' ? styles.statusApproved : styles.statusPending]}>
            <Text style={[styles.statusBadgeText, provider?.status?.toLowerCase() === 'approved' ? styles.statusApprovedText : styles.statusPendingText]}>
              {provider?.status?.toLowerCase() === 'approved' ? t('providerVerified') : t('providerUnderReview')}
            </Text>
          </View>
        </View>

        {/* MENU CARDS */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/profile/edit')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>{t('providerEditTitle')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/profile/preview')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>{t('providerProfilePreview')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/services')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>{t('providerServicesPrices')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/portfolio')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>{t('providerPortfolio')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/availability')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>{t('availabilityTitle')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/reviews')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>{t('providerReviewsTitle')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(shared)/settings' as any)}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>{t('settingsTitle')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* SWITCH COMPONENT */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={[styles.menuCard, styles.switchModeCard]} onPress={switchToClientMode}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.switchModeText}>{t('providerSwitchToClient')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('logout').toUpperCase()}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.surfaceCard },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  headerIcon: { padding: spacing.xs },

  scrollContent: { flex: 1 },
  scrollInner: { paddingBottom: spacing.xl2 },

  topSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    width: layout.avatarLg,
    height: layout.avatarLg,
    borderRadius: layout.avatarMd - spacing.xs,
    borderWidth: spacing.xxxs,
    borderColor: colors.gold,
    marginBottom: spacing.md,
    position: 'relative',
  },
  avatar: { width: '100%', height: '100%', borderRadius: layout.avatarMd - spacing.sm - spacing.xxxs },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: layout.avatarMd - spacing.sm - spacing.xxxs, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -spacing.xxs,
    right: -spacing.xxs,
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
    borderWidth: spacing.unit,
    borderColor: colors.border,
  },
  displayName: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  locationText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginLeft: spacing.xxs },
  ratingText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, marginBottom: spacing.sm },
  
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs + spacing.xxxs, borderRadius: borderRadius.md, marginTop: spacing.xs },
  statusApproved: { backgroundColor: colors.tealLight },
  statusPending: { backgroundColor: colors.orangeLight },
  statusBadgeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs },
  statusApprovedText: { color: colors.teal },
  statusPendingText: { color: colors.orange },

  menuContainer: { paddingHorizontal: spacing.lg },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  menuCardLeft: { flexDirection: 'row', alignItems: 'center' },
  menuCardText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary },
  switchModeCard: { borderWidth: 1, borderColor: colors.teal, marginTop: spacing.lg },
  switchModeText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.teal },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  logoutText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.error },
});
