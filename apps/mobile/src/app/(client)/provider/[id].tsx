import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, FlatList, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { useFavourites } from '../../../contexts/FavouritesContext';
import { getDiscoveryCoordinates } from '../../../utils/discovery-location';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { apiJson } from '@/services/apiClient';

const { width } = Dimensions.get('window');


export default function ProviderProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  const { isFavourite, toggleFavourite } = useFavourites();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  const [provider, setProvider] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

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
        apiJson<any>(`/providers/${id}${locationQuery}`, { auth: true }),
        apiJson<any>(`/providers/${id}/services`, { auth: true }),
        apiJson<any>(`/providers/${id}/portfolio`, { auth: true }),
        apiJson<any>(`/providers/${id}/reviews?limit=20`, { auth: true }),
      ]);

      setProvider(provRes.data || provRes);
      setServices(servRes.data || servRes);
      
      const portData = portRes.data || portRes || [];
      console.log('Portfolio data:', JSON.stringify(portData).slice(0, 200));
      setPortfolio(portData.filter((img: any) => !!img.imageUrl));

      setReviews(revRes.data || revRes);
    } catch (err: any) {
      const status = err?.status ?? err.response?.status;
      setErrorMessage(mapHttpError(status, undefined, lang));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const coverImage = portfolio && portfolio.length > 0 ? portfolio[0].imageUrl : null;
  const providerId = id as string;
  const isFav = Boolean(providerId) && isFavourite(providerId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.loadingContainer}>
        <GermanErrorBanner visible={errorVisible} message={errorMessage} />
      </View>
    );
  }

  // Derived properties safely extracted
  const avgRating = (typeof provider.avgRating === 'number' && !isNaN(provider.avgRating)) ? provider.avgRating.toFixed(1) : t('newLabel');
  const distance = (typeof provider.distanceKm === 'number' && !isNaN(provider.distanceKm)) ? `${provider.distanceKm.toFixed(1)} km` : '';
  const totalReviews = (typeof provider.totalReviews === 'number' && !isNaN(provider.totalReviews)) ? provider.totalReviews : 0;
  const specialisationTags = Array.isArray(provider.specialisationTags) ? provider.specialisationTags : Array.isArray(provider.specializations) ? provider.specializations : [];
  const minPrice = services.length > 0 ? Math.min(...services.map((s: any) => Number(s.price))) : (provider.startingPrice || 0);

  const openChat = async (recipientUserId: string) => {
    if (!recipientUserId) return;
    try {
      const data = await apiJson<any>('/chat/conversations', {
        auth: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: recipientUserId }),
      });
      const conversationId = data?.data?.id ?? data?.id;

      if (!conversationId) {
        console.log('No conversation ID returned');
        return;
      }

      router.push(`/(shared)/chat/${conversationId}` as any);
    } catch (err) {
      console.log('openChat error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* HERO SECTION */}
        <View style={styles.heroContainer}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Feather name="image" size={40} color={colors.textTertiary} />
            </View>
          )}

          {/* Top Controls Overlay */}
          <View style={styles.heroControls}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.heroControlsRight}>
              <TouchableOpacity style={styles.iconButton}>
                <Feather name="share-2" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { marginLeft: spacing.sm }]}
                onPress={() => {
                  if (!providerId) return;
                  void toggleFavourite(providerId);
                }}
              >
                <FontAwesome5 name="heart" solid={isFav} size={20} color={isFav ? colors.coral : colors.textPrimary} />
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
            <FontAwesome5 name="star" solid size={14} color={colors.gold} />
            <Text style={styles.statsText}>{avgRating} ({totalReviews} {t('profileTabReviews')})</Text>
          </View>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
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
                )) : services.slice(0, 6).map((s: any, idx: number) => (
                  <View key={idx} style={styles.tagChip}>
                    <Text style={styles.tagText}>{s.name}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionHeader}>{t('profileInfo')}</Text>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{provider.city || t('countryDefault')}</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="star" solid size={14} color={colors.gold} />
                <Text style={styles.infoText}>{avgRating} ({totalReviews} {t('profileTabReviews')})</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="clock" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{t('profileResponseTime')} {provider.responseTime || t('responseTimeDefault')}</Text>
              </View>
              {provider.isVerified && (
                <View style={styles.infoRow}>
                  <Feather name="check-circle" size={16} color={colors.teal} />
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
                    <Image source={{ uri: imageUrl }} style={styles.galleryImage} resizeMode="cover" onError={() => console.log('Gallery image failed:', imageUrl)} />
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
                  {[1,2,3,4,5].map(s => <FontAwesome5 key={s} name="star" solid size={16} color={s <= Math.round(parseFloat(avgRating) || 0) ? colors.gold : colors.border} style={{marginHorizontal: 2}} />)}
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
                        <View style={{flexDirection: 'row'}}>{[...Array(item.rating || 5)].map((_, i) => <FontAwesome5 key={i} name="star" solid size={10} color={colors.gold} />)}</View>
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
  heroContainer: { height: 220, position: 'relative', marginBottom: 50 },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroImagePlaceholder: { width: '100%', height: '100%', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  heroControls: { position: 'absolute', top: 60, left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  heroControlsRight: { flexDirection: 'row' },
  avatarWrapper: { position: 'absolute', bottom: -48, alignSelf: 'center', width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: colors.gold, backgroundColor: colors.surface, padding: 2, ...shadows.card },
  avatarImage: { width: '100%', height: '100%', borderRadius: 44 },
  avatarPlaceholder: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.heading, fontSize: 32, color: colors.primary },
  
  infoSection: { alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  businessName: { fontFamily: fonts.heading, fontSize: 24, color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  statsText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: spacing.sm },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: 4 },

  tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabsContainer: { paddingHorizontal: spacing.lg, gap: spacing.md },
  tabButton: { paddingBottom: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  
  tabContentContainer: { padding: spacing.lg },
  bioText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl },
  sectionHeader: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  tagChip: { backgroundColor: colors.surface, borderRadius: borderRadius.sm, paddingVertical: 6, paddingHorizontal: 12, marginRight: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  tagText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  policyText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xl },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, paddingLeft: spacing.xs },
  infoText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: spacing.sm },

  serviceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.card },
  serviceInfo: { flex: 1 },
  serviceName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: 4 },
  serviceDetail: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textTertiary, marginBottom: 4 },
  servicePrice: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  selectButton: { backgroundColor: colors.primaryLight, paddingVertical: 8, paddingHorizontal: 16, borderRadius: borderRadius.sm },
  selectButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.primary },

  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  galleryImageContainer: { width: '48%', height: width * 0.48, borderRadius: borderRadius.md, overflow: 'hidden', marginBottom: spacing.md },
  galleryImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  overallRatingBox: { alignItems: 'center', backgroundColor: colors.surface, padding: spacing.xl, borderRadius: borderRadius.md, marginBottom: spacing.xl, ...shadows.card },
  overallRatingNumber: { fontFamily: fonts.heading, fontSize: 48, color: colors.primary },
  overallStars: { flexDirection: 'row', marginBottom: spacing.sm },
  totalReviewsText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  reviewCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.card },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  reviewerAvatarText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textSecondary },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, marginBottom: 2 },
  reviewDate: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary },
  reviewComment: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },

  emptyText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl },

  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 30 },
  footerPriceBlock: { marginRight: spacing.lg },
  footerPriceLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary },
  footerPriceValue: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  footerButtons: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  messageBtn: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', height: 48 },
  messageBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.primary },
  bookBtn: { flex: 1.5, backgroundColor: colors.coral, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', height: 48 },
  bookBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.surface }
});
