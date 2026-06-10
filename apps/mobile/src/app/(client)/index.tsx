import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, SafeAreaView, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '@/theme';
import { ProviderCard, ProviderProps } from '../../components/ProviderCard';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { useFavourites } from '../../contexts/FavouritesContext';
import { DiscoveryCoordinates, getDiscoveryCoordinates, getDiscoveryOverride, setDiscoveryOverride } from '../../utils/discovery-location';
import { NoBraidersNearby } from '../../components/NoBraidersNearby';
import * as Location from 'expo-location';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiJson } from '../../services/apiClient';

interface PopularStyle {
  id: string;
  name: string;
  imageUrl: string | null;
  emoji: string;
  colorHex: string;
  sortOrder: number;
  searchQuery?: string;
}

const getFallbackPopularStyles = (lang: 'de' | 'en'): PopularStyle[] => {
  const names =
    lang === 'en'
      ? ['Knotless Braids', 'Box Braids', 'Cornrows', 'Goddess Locs', 'Twists', 'Fades']
      : ['Knotless Zöpfe', 'Box Braids', 'Cornrows', 'Goddess Locs', 'Twists', 'Fades'];

  return [
    {
      id: '1',
      name: names[0],
      searchQuery: 'Knotless Braids',
      imageUrl: null,
      colorHex: colors.gold,
      emoji: '✨',
      sortOrder: 1,
    },
    {
      id: '2',
      name: names[1],
      searchQuery: 'Box Braids',
      imageUrl: null,
      colorHex: colors.primary,
      emoji: '💫',
      sortOrder: 2,
    },
    {
      id: '3',
      name: names[2],
      searchQuery: 'Cornrows',
      imageUrl: null,
      colorHex: colors.teal,
      emoji: '🌿',
      sortOrder: 3,
    },
    {
      id: '4',
      name: names[3],
      searchQuery: 'Goddess Locs',
      imageUrl: null,
      colorHex: colors.coral,
      emoji: '👑',
      sortOrder: 4,
    },
    {
      id: '5',
      name: names[4],
      searchQuery: 'Twists',
      imageUrl: null,
      colorHex: colors.primaryDark,
      emoji: '🌀',
      sortOrder: 5,
    },
    {
      id: '6',
      name: names[5],
      searchQuery: 'Fades',
      imageUrl: null,
      colorHex: colors.green,
      emoji: '✂️',
      sortOrder: 6,
    },
  ];
};

const isFallbackPopularStyles = (styles: PopularStyle[]): boolean =>
  styles.length === 6 &&
  styles.every((style, index) => style.id === String(index + 1) && style.imageUrl === null);

export default function ClientHome() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { isFavourite, toggleFavourite } = useFavourites();
  
  const [firstName, setFirstName] = useState('');
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderProps[]>([]);
  const [popularStyles, setPopularStyles] = useState<PopularStyle[]>(() => getFallbackPopularStyles(lang));
  const [failedPopularStyleImages, setFailedPopularStyleImages] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [discoveryLocation, setDiscoveryLocation] = useState<DiscoveryCoordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState(100);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const filteredProviders = providers.filter((p) => {
    const name = (p.businessName ?? '').toLowerCase();
    if (name.includes('test') || name.includes('accept')) return false;
    if (discoveryLocation) {
      const d = p.distanceKm;
      if (typeof d !== 'number' || Number.isNaN(d)) return false;
      return d <= radiusKm;
    }
    return true;
  });

  const handleChangeRadius = () => {
    setRadiusKm((r) => (r === 100 ? 200 : r === 200 ? 300 : 100));
  };

  useEffect(() => {
    loadUser();
    bootstrapDiscovery();
    fetchPopularStyles();
  }, []);

  useEffect(() => {
    setPopularStyles((prev) => (isFallbackPopularStyles(prev) ? getFallbackPopularStyles(lang) : prev));
  }, [lang]);

  const bootstrapDiscovery = async () => {
    const coords = await getDiscoveryCoordinates();
    setDiscoveryLocation(coords);
    await fetchProviders(coords);
  };

  const loadUser = async () => {
    try {
      const u = await apiJson<any>('/users/me', { auth: true });
      const user = u.data ?? u;
      setFirstName(user.firstName ?? '');
      const city = user.city ?? t('countryDefault');
      const override = await getDiscoveryOverride().catch(() => null);
      setUserCity(override?.city ?? city);
      setUserAvatar(user.avatarUrl ?? null);
    } catch {
      /* keep defaults */
    }
  };

  const fetchPopularStyles = async () => {
    try {
      const data = await apiJson<any>('/popular-styles');
      if (Array.isArray(data)) {
        setPopularStyles(data);
      }
    } catch {
      setPopularStyles(getFallbackPopularStyles(lang));
    }
  };

  const fetchProviders = async (coords?: DiscoveryCoordinates | null) => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      
      const locationParams = coords
        ? `&lat=${encodeURIComponent(String(coords.lat))}&lng=${encodeURIComponent(String(coords.lng))}&sort=entfernung`
        : '';
      const data = await apiJson<any>(`/providers?limit=20${locationParams}`, { auth: true });
      setProviders(data.data || data);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      setErrorMessage(mapHttpError(status, undefined, lang));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderPress = (id: string) => {
    router.push(`/(client)/provider/${id}` as any);
  };

  const handleApplyCity = async () => {
    Keyboard.dismiss();
    if (cityInput.trim()) {
      const city = cityInput.trim();
      setUserCity(city);
      try {
        const results = await Location.geocodeAsync(city);
        const first = Array.isArray(results) ? results[0] : null;
        const lat = first?.latitude;
        const lng = first?.longitude;
        if (typeof lat === 'number' && typeof lng === 'number') {
          await setDiscoveryOverride({ city, lat, lng });
          const coords = { lat, lng };
          setDiscoveryLocation(coords);
          await fetchProviders(coords);
        }
      } catch (error) {
        Sentry.captureException(error);
        setErrorMessage(mapHttpError(undefined, undefined, lang));
        setErrorVisible(true);
      }
    }
    setShowLocationModal(false);
  };

  const refreshUnreadNotifications = async () => {
    try {
      const res: any = await apiJson('/notifications?page=1&limit=20', { auth: true });
      const list = Array.isArray(res?.data) ? res.data : [];
      setUnreadNotificationsCount(list.filter((n: any) => n && n.isRead === false).length);
    } catch (error) {
      Sentry.captureException(error);
      setUnreadNotificationsCount(0);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshUnreadNotifications();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatarRing} />
            ) : (
              <View style={styles.avatarRing}>
                {firstName ? (
                  <Text style={{ fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary }}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                ) : (
                  <Feather name="user" size={24} color={colors.primary} />
                )}
              </View>
            )}
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.greeting}>{t('homeGreeting')}, {firstName || t('clientNameDefault')}!</Text>
            <TouchableOpacity
              style={styles.locationPill}
              onPress={() => {
                setCityInput(userCity ?? '');
                setShowLocationModal(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={styles.locationPillText}>{userCity ?? t('countryDefault')}</Text>
              <Feather name="chevron-down" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => router.push('/(shared)/notifications')}
            accessibilityRole="button"
            accessibilityLabel={
              unreadNotificationsCount > 0
                ? `${t('notificationsTitle')} (${unreadNotificationsCount})`
                : t('notificationsTitle')
            }
          >
            <Feather name="bell" size={24} color={colors.primary} />
            {unreadNotificationsCount > 0 && <View style={styles.bellBadge} />}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: '/(client)/search',
              params: discoveryLocation ? { sort: 'entfernung' } : {},
            } as any)
          }
        >
          <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <Text style={styles.searchText}>{t('homeSearchPlaceholder')}</Text>
          <Feather name="sliders" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* ── Beliebte Styles ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('homePopular')}</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(client)/search',
                params: discoveryLocation ? { sort: 'entfernung' } : {},
              } as any)
            }
          >
            <Text style={styles.seeAllText}>{t('homeViewAll')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stylesGallery}
          contentContainerStyle={{ paddingRight: spacing.lg }}
        >
          {popularStyles.map(style => (
            <TouchableOpacity
              key={style.id}
              style={styles.styleCard}
              activeOpacity={0.85}
              onPress={() => router.push({
                pathname: '/(client)/search',
                params: {
                  query: style.searchQuery ?? style.name,
                  ...(discoveryLocation ? { sort: 'entfernung' } : {}),
                },
              } as any)}
            >
              {style.imageUrl && !failedPopularStyleImages[style.id] ? (
                <View style={[styles.styleImageContainer, { backgroundColor: style.colorHex }]}>
                  <Image
                    source={{ uri: style.imageUrl }}
                    style={styles.styleBackgroundImage}
                    resizeMode="cover"
                    onError={() =>
                      setFailedPopularStyleImages((prev) => ({
                        ...prev,
                        [style.id]: true,
                      }))
                    }
                  />
                </View>
              ) : (
                <View style={[styles.styleImagePlaceholder, { backgroundColor: style.colorHex }]}>
                  <Text style={{ fontSize: fontSizes.hero + borderRadius.sm }}>{style.emoji}</Text>
                </View>
              )}
              <Text style={styles.styleName} numberOfLines={2}>
                {style.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        {/* Braiders Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('homeNearby')}</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(client)/search',
                params: discoveryLocation ? { sort: 'entfernung' } : {},
              } as any)
            }
          >
            <Text style={styles.seeAllText}>{t('homeViewAll')}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.coral} style={styles.loader} />
        ) : filteredProviders.length === 0 ? (
          <View style={styles.emptyState}>
            <NoBraidersNearby radiusKm={radiusKm} onChangeRadius={handleChangeRadius} />
          </View>
        ) : (
          filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={{
                ...provider,
                isFavourited: isFavourite(provider.id)
              }}
              onPress={() => handleProviderPress(provider.id)}
              onFavourite={() => toggleFavourite(provider.id)}
            />
          ))
        )}

        <View style={{ height: layout.iconButton }} />
      </ScrollView>

      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.locationModal}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.locationModalTitle}>{t('homeLocationModal')}</Text>

              <TextInput
                style={styles.locationInput}
                value={cityInput}
                onChangeText={setCityInput}
                placeholder={t('homeLocationPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleApplyCity}
              />

              <TouchableOpacity
                style={styles.locationApplyBtn}
                onPress={handleApplyCity}
              >
                <Text style={styles.locationApplyText}>{t('homeLocationApply')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.locationGpsBtn}
                onPress={async () => {
                  Keyboard.dismiss();
                  setShowLocationModal(false);
                  await setDiscoveryOverride(null);
                  const coords = await getDiscoveryCoordinates(true);
                  setDiscoveryLocation(coords);
                  await fetchProviders(coords);
                  setUserCity(t('countryDefault'));
                }}
              >
                <Feather name="navigation" size={16} color={colors.teal} />
                <Text style={styles.locationGpsText}>{t('homeLocationGps')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.locationCancelBtn} onPress={() => {
                Keyboard.dismiss();
                setShowLocationModal(false);
              }}>
                <Text style={styles.locationCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  avatarContainer: { marginRight: spacing.md },
  avatarRing: { width: layout.iconButton + spacing.s, height: layout.iconButton + spacing.s, borderRadius: (layout.iconButton + spacing.s) / 2, borderWidth: spacing.xxxs, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  headerTitles: { flex: 1 },
  greeting: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary, marginBottom: spacing.xxxs },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  locationPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  bellButton: { position: 'relative', padding: spacing.xs },
  bellBadge: { position: 'absolute', top: spacing.xxs, right: spacing.sm / 2, width: spacing.s, height: spacing.s, borderRadius: spacing.s / 2, backgroundColor: colors.coral },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, height: layout.inputHeightMd, paddingHorizontal: spacing.md, marginBottom: spacing.xl, borderWidth: spacing.unit, borderColor: colors.border },
  searchIcon: { marginRight: spacing.md },
  searchText: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, marginTop: spacing.md },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary },
  seeAllText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal },
  loader: { marginVertical: spacing.xxl },
  emptyState: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyStateText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary },
  stylesGallery: {
    marginBottom: spacing.xl,
    marginHorizontal: -spacing.lg,
    paddingLeft: spacing.lg,
  },
  styleCard: {
    width: layout.avatarXl + spacing.s,
    height: layout.avatarXl + spacing.xl2 + spacing.s,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  styleImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleImageContainer: {
    flex: 1,
    position: 'relative',
  },
  styleBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  styleEmojiOverlay: {
    position: 'absolute',
    top: spacing.none,
    left: spacing.none,
    right: spacing.none,
    bottom: spacing.l + spacing.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleName: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.background,
    padding: spacing.sm,
    backgroundColor: colors.overlaySoft,
    position: 'absolute',
    bottom: spacing.none,
    width: '100%',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  locationModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xl + spacing.xs,
  },
  locationModalTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.xl,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  locationInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  locationApplyBtn: {
    backgroundColor: colors.coral,
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  locationApplyText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.md,
    color: colors.background,
  },
  locationGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: layout.inputHeight,
    marginBottom: spacing.sm,
  },
  locationGpsText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
    color: colors.teal,
  },
  locationCancelBtn: {
    alignItems: 'center',
    height: layout.inputHeight,
    justifyContent: 'center',
  },
  locationCancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
});
