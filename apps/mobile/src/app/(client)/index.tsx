import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, SafeAreaView, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../theme';
import { ProviderCard, ProviderProps } from '../../components/ProviderCard';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { tokenStorage } from '../../utils/token-storage';
import { getFavouriteIds, addFavourite, removeFavourite } from '../../utils/favourites';
import { API } from '../../utils/api';
import { DiscoveryCoordinates, getDiscoveryCoordinates, getDiscoveryOverride, setDiscoveryOverride } from '../../utils/discovery-location';
import { NoBraidersNearby } from '../../components/NoBraidersNearby';
import * as Location from 'expo-location';
import { useLanguage } from '@/contexts/LanguageContext';


const BELIEBTE_STYLES = [
  {
    id: '1',
    name: 'Knotless Braids',
    color: '#C8860A',      // gold warm tone
    emoji: '✨',
  },
  {
    id: '2',
    name: 'Box Braids',
    color: '#8B4513',      // colors.primary brown
    emoji: '💫',
  },
  {
    id: '3',
    name: 'Cornrows',
    color: '#1A8C85',      // colors.teal
    emoji: '🌿',
  },
  {
    id: '4',
    name: 'Goddess Locs',
    color: '#E05A4E',      // colors.coral
    emoji: '👑',
  },
  {
    id: '5',
    name: 'Twists',
    color: '#5C2D00',      // colors.primaryDark
    emoji: '🌀',
  },
  {
    id: '6',
    name: 'Fades',
    color: '#2E7D32',      // colors.green
    emoji: '✂️',
  },
];

export default function ClientHome() {
  const router = useRouter();
  const { language } = useLanguage();
  const isEn = language === 'en';
  
  const [firstName, setFirstName] = useState('');
  const [profileCity, setProfileCity] = useState<string>('Deutschland');
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [discoveryLocation, setDiscoveryLocation] = useState<DiscoveryCoordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState(100);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locationError, setLocationError] = useState('');
  const [isSavingLocation, setIsSavingLocation] = useState(false);

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
    getFavouriteIds().then(setFavouriteIds);
    bootstrapDiscovery();
  }, []);

  const bootstrapDiscovery = async () => {
    const coords = await getDiscoveryCoordinates();
    setDiscoveryLocation(coords);
    await fetchProviders(coords);
  };

  const loadUser = async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) return;
      const res = await fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const u = await res.json();
      const user = u.data ?? u;
      setFirstName(user.firstName ?? 'Kunde');
      const city = user.city ?? 'Deutschland';
      setProfileCity(city);
      const override = await getDiscoveryOverride().catch(() => null);
      setUserCity(override?.city ?? city);
      setUserAvatar(user.avatarUrl ?? null);
    } catch {
      /* keep defaults */
    }
  };

  const openLocationModal = () => {
    setLocationError('');
    setLocationInput(userCity ?? profileCity ?? '');
    setLocationModalVisible(true);
  };

  const handleSaveLocation = async () => {
    const city = locationInput.trim();
    setLocationError('');
    setIsSavingLocation(true);
    try {
      if (!city) {
        await setDiscoveryOverride(null);
        const coords = await getDiscoveryCoordinates(true);
        setDiscoveryLocation(coords);
        setUserCity(profileCity);
        await fetchProviders(coords);
        setLocationModalVisible(false);
        return;
      }

      const results = await Location.geocodeAsync(city);
      const first = Array.isArray(results) ? results[0] : null;
      const lat = first?.latitude;
      const lng = first?.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        setLocationError(isEn ? 'City not found.' : 'Stadt nicht gefunden.');
        return;
      }

      await setDiscoveryOverride({ city, lat, lng });
      const coords = { lat, lng };
      setDiscoveryLocation(coords);
      setUserCity(city);
      await fetchProviders(coords);
      setLocationModalVisible(false);
    } catch {
      setLocationError(isEn ? 'Could not update location.' : 'Standort konnte nicht aktualisiert werden.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const fetchProviders = async (coords?: DiscoveryCoordinates | null) => {
    try {
      setIsLoading(true);
      setErrorVisible(false);

      const token = await tokenStorage.getAccessToken();
      if (!token) return;
      
      const locationParams = coords
        ? `&lat=${encodeURIComponent(String(coords.lat))}&lng=${encodeURIComponent(String(coords.lng))}&sort=entfernung`
        : '';

      const res = await fetch(`${API}/providers?limit=20${locationParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        setErrorMessage(mapHttpError(res.status));
        setErrorVisible(true);
        return;
      }

      const data = await res.json();
      setProviders(data.data || data);
    } catch (err: any) {
      const status = err.response?.status;
      setErrorMessage(mapHttpError(status));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderPress = (id: string) => {
    router.push(`/(client)/provider/${id}` as any);
  };

  const handleToggleFavourite = async (providerId: string) => {
    const isCurrentlyFav = favouriteIds.includes(providerId);

    // Optimistic update
    setFavouriteIds(prev =>
      isCurrentlyFav
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );

    const success = isCurrentlyFav
      ? await removeFavourite(providerId)
      : await addFavourite(providerId);

    // Revert if API failed
    if (!success) {
      setFavouriteIds(prev =>
        isCurrentlyFav
          ? [...prev, providerId]
          : prev.filter(id => id !== providerId)
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatarRing} />
            ) : (
              <View style={styles.avatarRing}>
                {firstName ? (
                  <Text style={{ fontFamily: fonts.heading, fontSize: 24, color: colors.primary }}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                ) : (
                  <Feather name="user" size={24} color={colors.primary} />
                )}
              </View>
            )}
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.greeting}>{isEn ? 'Hello' : 'Hallo'}, {firstName || (isEn ? 'Client' : 'Kunde')}!</Text>
            <TouchableOpacity style={styles.locationRow} onPress={openLocationModal} activeOpacity={0.7}>
              <Feather name="map-pin" size={14} color={colors.textSecondary} />
              <Text style={styles.locationText}>{userCity ?? 'Deutschland'}</Text>
              <Feather name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/(shared)/notifications')}>
            <Feather name="bell" size={24} color={colors.primary} />
            <View style={styles.bellBadge} />
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
          <Text style={styles.searchText}>Suche nach Styles, Braiders, Salons...</Text>
          <Feather name="sliders" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* ── Beliebte Styles ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Beliebte Styles</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(client)/search',
                params: discoveryLocation ? { sort: 'entfernung' } : {},
              } as any)
            }
          >
            <Text style={styles.seeAllText}>Alle anzeigen</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stylesGallery}
          contentContainerStyle={{ paddingRight: spacing.lg }}
        >
          {BELIEBTE_STYLES.map(style => (
            <TouchableOpacity
              key={style.id}
              style={styles.styleCard}
              activeOpacity={0.85}
              onPress={() => router.push({
                pathname: '/(client)/search',
                params: {
                  query: style.name,
                  ...(discoveryLocation ? { sort: 'entfernung' } : {}),
                },
              } as any)}
            >
              {/* Gradient-style background using solid colour */}
              <View style={[
                styles.styleImagePlaceholder,
                { backgroundColor: style.color }
              ]}>
                <Text style={{ fontSize: 36 }}>{style.emoji}</Text>
              </View>
              <Text style={styles.styleName} numberOfLines={2}>
                {style.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        {/* Braiders Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Braiders in deiner Nähe</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(client)/search',
                params: discoveryLocation ? { sort: 'entfernung' } : {},
              } as any)
            }
          >
            <Text style={styles.seeAllText}>Alle anzeigen</Text>
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
                isFavourited: favouriteIds.includes(provider.id)
              }}
              onPress={() => handleProviderPress(provider.id)}
              onFavourite={() => handleToggleFavourite(provider.id)}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={locationModalVisible} transparent animationType="fade" onRequestClose={() => setLocationModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{isEn ? 'Change location' : 'Standort ändern'}</Text>
            <Text style={styles.modalBody}>{isEn ? 'Enter a city to browse providers and book there.' : 'Gib eine Stadt ein, um dort Anbieter zu sehen und zu buchen.'}</Text>
            <TextInput
              style={styles.modalInput}
              value={locationInput}
              onChangeText={setLocationInput}
              placeholder={isEn ? 'City (e.g. Dortmund)' : 'Stadt (z.B. Dortmund)'}
              autoCapitalize="words"
            />
            {locationError ? <Text style={styles.modalError}>{locationError}</Text> : null}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalButtonOutline} onPress={() => setLocationModalVisible(false)} disabled={isSavingLocation}>
                <Text style={styles.modalButtonOutlineText}>{isEn ? 'Cancel' : 'Abbrechen'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonSolid} onPress={handleSaveLocation} disabled={isSavingLocation}>
                <Text style={styles.modalButtonSolidText}>{isSavingLocation ? (isEn ? 'Saving…' : 'Speichern…') : (isEn ? 'Save' : 'Speichern')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalResetRow} onPress={() => { setLocationInput(''); handleSaveLocation(); }} disabled={isSavingLocation}>
              <Text style={styles.modalResetText}>{isEn ? 'Use current location' : 'Aktuellen Standort nutzen'}</Text>
            </TouchableOpacity>
          </View>
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
  avatarRing: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  headerTitles: { flex: 1 },
  greeting: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: 4 },
  bellButton: { position: 'relative', padding: spacing.xs },
  bellBadge: { position: 'absolute', top: 4, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.coral },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, height: 50, paddingHorizontal: spacing.md, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
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
    width: 130,
    height: 170,
    borderRadius: 16,
    marginRight: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  styleImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleName: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: '#FFFFFF',
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  modalError: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.error,
    textAlign: 'center',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButtonOutline: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonOutlineText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  modalButtonSolid: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSolidText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.sm,
    color: colors.surface,
  },
  modalResetRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  modalResetText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
