import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, FlatList, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { useFavourites } from '../../../contexts/FavouritesContext';
import { getDiscoveryCoordinates } from '../../../utils/discovery-location';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { ApiError, apiJson } from '@/services/apiClient';
import { debugLog } from '@/utils/logger';

const { width } = Dimensions.get('window');

type ProviderServiceItem = {
  id: string;
  name: string;
  price: number | string;
  durationMin?: number | null;
  duration?: number | null;
};

type ProviderPortfolioItem = {
  id?: string;
  imageUrl?: string | null;
};

type ProviderReviewItem = {
  id?: string;
  rating?: number | null;
  comment?: string | null;
  createdAt?: string | null;
  clientName?: string | null;
};

type ProviderProfileData = {
  id: string;
  businessName?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  avgRating?: number | null;
  totalReviews?: number | null;
  distanceKm?: number | null;
  specialisationTags?: string[] | null;
  specializations?: string[] | null;
  startingPrice?: number | null;
  bio?: string | null;
  responseTime?: string | null;
  cancellationPolicy?: string | null;
  isVerified?: boolean | null;
  userId?: string | null;
  user?: { id?: string | null } | null;
};

type ProviderDetailResponse = ProviderProfileData | { data?: ProviderProfileData | null };
type ProviderServicesResponse = ProviderServiceItem[] | { data?: ProviderServiceItem[] | null };
type ProviderPortfolioResponse = ProviderPortfolioItem[] | { data?: ProviderPortfolioItem[] | null };
type ProviderReviewsResponse = ProviderReviewItem[] | { data?: ProviderReviewItem[] | null };
type ConversationCreateResponse = { id?: string | null } | { data?: { id?: string | null } | null };

const extractList = <T,>(payload: T[] | { data?: T[] | null } | null | undefined): T[] => {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
};

const extractObject = <T extends object>(
  payload: T | { data?: T | null } | null | undefined,
): T | null => {
  if (!payload) return null;
  const withData = payload as { data?: T | null };
  return withData.data ?? (payload as T);
};

export default function ProviderProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  const { isFavourite, toggleFavourite } = useFavourites();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  const [provider, setProvider] = useState<ProviderProfileData | null>(null);
  const [services, setServices] = useState<ProviderServiceItem[]>([]);
  const [portfolio, setPortfolio] = useState<ProviderPortfolioItem[]>([]);
  const [reviews, setReviews] = useState<ProviderReviewItem[]>([]);

  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'gallery' | 'reviews'>('overview');
  const tabs = [
    { key: 'overview' as const, label: t('profileTabOverview') },
    { key: 'services' as const, label: t('profileTabServices') },
    { key: 'gallery' as const, label: t('profileTabGallery') },
    { key: 'reviews' as const, label: t('profileTabReviews') },
  ];

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);

      const coords = await getDiscoveryCoordinates();
      const locationQuery = coords
        ? `?lat=${encodeURIComponent(String(coords.lat))}&lng=${encodeURIComponent(String(coords.lng))}`
        : '';

      const [provRes, servRes, portRes, revRes] = await Promise.all([
        apiJson<ProviderDetailResponse>(`/providers/${id}${locationQuery}`, { auth: true }),
        apiJson<ProviderServicesResponse>(`/providers/${id}/services`, { auth: true }),
        apiJson<ProviderPortfolioResponse>(`/providers/${id}/portfolio`, { auth: true }),
        apiJson<ProviderReviewsResponse>(`/providers/${id}/reviews?limit=20`, { auth: true }),
      ]);

      setProvider(extractObject(provRes));
      setServices(extractList(servRes));

      const portData = extractList(portRes);
      setPortfolio(portData.filter((img) => Boolean(img.imageUrl)));

      setReviews(extractList(revRes));
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      setErrorMessage(mapHttpError(status, undefined, lang));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const coverImage = portfolio && portfolio.length > 0 ? portfolio[0].imageUrl : null;
  const providerId = id as string;
  const isFav = Boolean(providerId) && isFavourite(providerId);
  const backLabel = t('back');
  const shareLabel = t('shareProfileAction');
  const favouriteLabel = isFav
    ? t('favouritesRemoveAction')
    : t('favouritesAddAction');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorHeader}>
          <TouchableOpacity
            style={styles.errorHeaderButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <Feather name="arrow-left" size={fontSizes.xxl} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.errorHeaderTitle}>{t('providerProfile')}</Text>
          <View style={styles.errorHeaderButton} />
        </View>
        <View style={styles.loadingContainer}>
          <GermanErrorBanner visible={errorVisible} message={errorMessage} />
          <TouchableOpacity style={styles.retryFallbackButton} onPress={fetchData}>
            <Text style={styles.retryFallbackText}>{t('appointmentsRetry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Derived properties safely extracted
  const avgRating = (typeof provider.avgRating === 'number' && !isNaN(provider.avgRating)) ? provider.avgRating.toFixed(1) : t('newLabel');
  const distance = (typeof provider.distanceKm === 'number' && !isNaN(provider.distanceKm)) ? `${provider.distanceKm.toFixed(1)} km` : '';
  const totalReviews = (typeof provider.totalReviews === 'number' && !isNaN(provider.totalReviews)) ? provider.totalReviews : 0;
  const specialisationTags = Array.isArray(provider.specialisationTags) ? provider.specialisationTags : Array.isArray(provider.specializations) ? provider.specializations : [];
  const minPrice = services.length > 0 ? Math.min(...services.map((s) => Number(s.price))) : (provider.startingPrice || 0);

  const openChat = async (recipientUserId: string) => {
    if (!recipientUserId) return;
    try {
      const response = await apiJson<ConversationCreateResponse>('/chat/conversations', {
        auth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: recipientUserId }),
      });
      const withData = response as { data?: { id?: string | null } | null };
      const direct = response as { id?: string | null };
      const conversationId = withData.data?.id ?? direct.id;

      if (!conversationId) {
        debugLog('No conversation ID returned');
        return;
      }

      router.push(`/(shared)/chat/${conversationId}` as any);
    } catch (err) {
      debugLog('openChat error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxxxl }}>
        
        {/* HERO SECTION */}
        <View style={styles.heroContainer}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Feather name="image" size={layout.iconButton} color={colors.textTertiary} />
            </View>
          )}

          {/* Top Controls Overlay */}
          <View style={styles.heroControls}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
            >
              <Feather name="arrow-left" size={fontSizes.xxl} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.heroControlsRight}>
              <TouchableOpacity
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={shareLabel}
              >
                <Feather name="share-2" size={fontSizes.xl} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { marginLeft: spacing.sm }]}
                onPress={() => {
                  if (!providerId) return;
                  void toggleFavourite(providerId);
                }}
                accessibilityRole="button"
                accessibilityLabel={favouriteLabel}
              >
                <FontAwesome5 name="heart" solid={isFav} size={fontSizes.xl} color={isFav ? colors.coral : colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar Overlap */}
          <View style={styles.avatarWrapper}>
            {provider.avatarUrl ? (
              <Image source={{ uri: provider.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{provider.businessName?.charAt(0)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* PROVIDER INFO */}
        <View style={styles.infoSection}>
          <Text style={styles.businessName}>{provider.businessName}</Text>
          <View style={styles.statsRow}>
            <FontAwesome5 name="star" solid size={fontSizes.sm} color={colors.gold} />
            <Text style={styles.statsText}>{avgRating} ({totalReviews} {t('profileTabReviews')})</Text>
          </View>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={fontSizes.sm} color={colors.textSecondary} />
            <Text style={styles.locationText}>{provider.city || t('countryDefault')} {distance ? `• ${distance}` : ''}</Text>
          </View>
        </View>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        {/* TABS HEADER */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab.key} style={[styles.tabButton, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* TABS CONTENT */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'overview' && (
            <View>
              {!!provider.bio && <Text style={styles.bioText}>{provider.bio}</Text>}
              
              <Text style={styles.sectionHeader}>{t('profileSpecialisations')}</Text>
              <View style={styles.tagsRow}>
                {specialisationTags.length > 0 ? specialisationTags.map((tag: string, idx: number) => (
                  <View key={idx} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                )) : services.slice(0, 6).map((s, idx: number) => (
                  <View key={idx} style={styles.tagChip}>
                    <Text style={styles.tagText}>{s.name}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionHeader}>{t('profileInfo')}</Text>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={fontSizes.md} color={colors.textSecondary} />
                <Text style={styles.infoText}>{provider.city || t('countryDefault')}</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="star" solid size={fontSizes.sm} color={colors.gold} />
                <Text style={styles.infoText}>{avgRating} ({totalReviews} {t('profileTabReviews')})</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="clock" size={fontSizes.md} color={colors.textSecondary} />
                <Text style={styles.infoText}>{t('profileResponseTime')} {provider.responseTime || t('responseTimeDefault')}</Text>
              </View>
              {provider.isVerified && (
                <View style={styles.infoRow}>
                  <Feather name="check-circle" size={fontSizes.md} color={colors.teal} />
                  <Text style={[styles.infoText, { color: colors.teal }]}>{t('profileVerified')}</Text>
                </View>
              )}

              <Text style={[styles.sectionHeader, { marginTop: spacing.xl }]}>{t('profileCancellation')}</Text>
              <Text style={styles.policyText}>{t('freeCancellationUntil')} {provider.cancellationPolicy || t('cancellationDefault')}</Text>
            </View>
          )}

          {activeTab === 'services' && (
            <FlatList
              data={services}
              keyExtractor={(_, i) => i.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.serviceCard}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <Text style={styles.serviceDetail}>{item.durationMin ?? item.duration} {t('appointmentsMinutes')}</Text>
                    <Text style={styles.servicePrice}>€ {formatAmount(item.price, lang)}</Text>
                  </View>
                  <TouchableOpacity style={styles.selectButton} onPress={() => router.push({ pathname: '/(client)/booking/services', params: { providerId: id } } as any)}>
                    <Text style={styles.selectButtonText}>{t('profileSelectService')}</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>{t('profileNoServices')}</Text>}
            />
          )}

          {activeTab === 'gallery' && (
            <FlatList
              data={portfolio}
              keyExtractor={(_, i) => i.toString()}
              scrollEnabled={false}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              renderItem={({ item }) => {
                const imageUrl = item.imageUrl;
                if (!imageUrl) return null;
                return (
                  <View style={styles.galleryImageContainer}>
                    <Image source={{ uri: imageUrl }} style={styles.galleryImage} resizeMode="cover" onError={() => debugLog('Provider gallery image failed')} />
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>{t('profileNoPhotos')}</Text>}
            />
          )}

          {activeTab === 'reviews' && (
            <View>
              <View style={styles.overallRatingBox}>
                <Text style={styles.overallRatingNumber}>{avgRating}</Text>
                <View style={styles.overallStars}>
                  {[1,2,3,4,5].map(s => <FontAwesome5 key={s} name="star" solid size={fontSizes.md} color={s <= Math.round(parseFloat(avgRating) || 0) ? colors.gold : colors.border} style={{marginHorizontal: spacing.xxxs}} />)}
                </View>
                <Text style={styles.totalReviewsText}>{t('reviewBased')} {totalReviews} {t('profileTabReviews')}</Text>
              </View>

              <FlatList
                data={reviews}
                keyExtractor={(_, i) => i.toString()}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerAvatarText}>{item.clientName?.charAt(0) || 'K'}</Text>
                      </View>
                      <View style={styles.reviewerInfo}>
                        <Text style={styles.reviewerName}>{item.clientName || t('clientNameDefault')}</Text>
                        <View style={{flexDirection: 'row'}}>{[...Array(item.rating || 5)].map((_, i) => <FontAwesome5 key={i} name="star" solid size={fontSizes.xxs} color={colors.gold} />)}</View>
                      </View>
                      <Text style={styles.reviewDate}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString(locale) : ''}</Text>
                    </View>
                    <Text style={styles.reviewComment}>{item.comment}</Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>{t('profileNoReviews')}</Text>}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* STICKY BOTTOM BAR */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerPriceBlock}>
          <Text style={styles.footerPriceLabel}>{t('profilePrices')}</Text>
          <Text style={styles.footerPriceValue}>{t('cardFrom')} €{formatAmount(minPrice, lang)}</Text>
        </View>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.messageBtn}
            onPress={() => {
              const recipientId = provider?.userId ?? provider?.user?.id;
              openChat(recipientId);
            }}
          >
            <Text style={styles.messageBtnText}>{t('profileMessage')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bookBtn} onPress={() => router.push({ pathname: '/(client)/booking/services', params: { providerId: id } } as any)}>
            <Text style={styles.bookBtnText}>{t('profileBookNow')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  errorHeaderButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center', alignItems: 'center' },
  errorHeaderTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  retryFallbackButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryFallbackText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.primary },
  heroContainer: { height: layout.heroHeight, position: 'relative', marginBottom: spacing.xxl + spacing.xxxs },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroImagePlaceholder: { width: '100%', height: '100%', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  heroControls: { position: 'absolute', top: layout.headerHeight, left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { width: layout.iconButton, height: layout.iconButton, borderRadius: borderRadius.pill, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  heroControlsRight: { flexDirection: 'row' },
  avatarWrapper: { position: 'absolute', bottom: -spacing.xxl, alignSelf: 'center', width: layout.avatarLg, height: layout.avatarLg, borderRadius: layout.avatarMd - spacing.xs, borderWidth: spacing.xxs, borderColor: colors.gold, backgroundColor: colors.surface, padding: spacing.xxxs, ...shadows.card },
  avatarImage: { width: '100%', height: '100%', borderRadius: layout.avatarMd - spacing.lg },
  avatarPlaceholder: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.heading, fontSize: fontSizes.hero, color: colors.primary },
  
  infoSection: { alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  businessName: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  statsText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: spacing.sm },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: spacing.xxs },

  tabsScroll: { flexGrow: 0, borderBottomWidth: spacing.unit, borderBottomColor: colors.border },
  tabsContainer: { paddingHorizontal: spacing.lg, gap: spacing.md },
  tabButton: { paddingBottom: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: spacing.xxxs, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  
  tabContentContainer: { padding: spacing.lg },
  bioText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, lineHeight: spacing.lg - spacing.xxxs, marginBottom: spacing.xl },
  sectionHeader: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  tagChip: { backgroundColor: colors.surface, borderRadius: borderRadius.sm, paddingVertical: spacing.xxs + spacing.xxxs, paddingHorizontal: spacing.sm, marginRight: spacing.sm, marginBottom: spacing.sm, borderWidth: spacing.unit, borderColor: colors.border },
  tagText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  policyText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xl },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, paddingLeft: spacing.xs },
  infoText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: spacing.sm },

  serviceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.card },
  serviceInfo: { flex: 1 },
  serviceName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xxs },
  serviceDetail: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textTertiary, marginBottom: spacing.xxs },
  servicePrice: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  selectButton: { backgroundColor: colors.primaryLight, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.sm },
  selectButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.primary },

  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  galleryImageContainer: { width: '48%', height: width * 0.48, borderRadius: borderRadius.md, overflow: 'hidden', marginBottom: spacing.md },
  galleryImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  overallRatingBox: { alignItems: 'center', backgroundColor: colors.surface, padding: spacing.xl, borderRadius: borderRadius.md, marginBottom: spacing.xl, ...shadows.card },
  overallRatingNumber: { fontFamily: fonts.heading, fontSize: layout.inputHeight, color: colors.primary },
  overallStars: { flexDirection: 'row', marginBottom: spacing.sm },
  totalReviewsText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  reviewCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.card },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  reviewerAvatar: { width: layout.iconButton, height: layout.iconButton, borderRadius: borderRadius.pill, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  reviewerAvatarText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textSecondary },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: spacing.xxxs },
  reviewDate: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary },
  reviewComment: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: spacing.l },

  emptyText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl },

  stickyFooter: { position: 'absolute', bottom: spacing.none, left: spacing.none, right: spacing.none, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: spacing.unit, borderTopColor: colors.border, paddingBottom: spacing.lg + spacing.xxs + spacing.xxxs },
  footerPriceBlock: { marginRight: spacing.lg },
  footerPriceLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary },
  footerPriceValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  footerButtons: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  messageBtn: { flex: 1, borderWidth: spacing.unit, borderColor: colors.primary, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', height: layout.inputHeight },
  messageBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.primary },
  bookBtn: { flex: 1.5, backgroundColor: colors.coral, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', height: layout.inputHeight },
  bookBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.surface }
});
