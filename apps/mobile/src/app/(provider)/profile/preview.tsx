import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiJson } from '@/services/apiClient';
const { width } = Dimensions.get('window');

const safeDistance = (val: any): string =>
  typeof val === 'number' && !isNaN(val) ? `${val.toFixed(1)} km` : '';

const safeNumber = (val: any): number =>
  typeof val === 'number' && !isNaN(val) ? val : 0;

export default function ProfilePreviewScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);

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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      setErrorStatus(undefined);

      const meData = await apiJson<any>('/providers/me', { auth: true, timeoutMs: 20000, retryCount: 1 });
      
      // Use provider data directly from /providers/me response
      setProvider(meData);

      // Provider preview should mirror the public customer-facing profile.
      const [servRes, portRes, revRes] = await Promise.all([
        apiJson<any>(`/providers/${meData.id}/services`, { timeoutMs: 20000, retryCount: 1 }),
        apiJson<any>(`/providers/${meData.id}/portfolio`, { timeoutMs: 20000, retryCount: 1 }),
        apiJson<any>(`/providers/${meData.id}/reviews`, { timeoutMs: 20000, retryCount: 1 }),
      ]);

      const servArr = servRes?.data ?? servRes ?? [];
      setServices(Array.isArray(servArr) ? servArr : []);

      const portArr = portRes?.data ?? portRes ?? [];
      setPortfolio(
        (Array.isArray(portArr) ? portArr : []).filter((i: any) => i.imageUrl || i.url),
      );

      const revArr = revRes?.data ?? revRes ?? [];
      setReviews(Array.isArray(revArr) ? revArr : []);
    } catch (e: any) {
      setErrorStatus(e?.status ?? e?.response?.status);
      setErrorMessage(e?.message ?? t('errorUnknown'));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const coverImage = portfolio && portfolio.length > 0 ? portfolio[0].imageUrl || portfolio[0].url : null;

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
        <GermanErrorBanner visible={errorVisible} statusCode={errorStatus} message={errorMessage || t('errorUnknown')} actionLabel={t('appointmentsRetry')} onAction={loadData} />
      </View>
    );
  }

  // Derived properties safely extracted
  const avgRating =
    typeof provider.avgRating === 'number' && !Number.isNaN(provider.avgRating)
      ? provider.avgRating.toFixed(1)
      : t('newLabel');
  const distance = safeDistance(provider.distanceKm);
  const totalReviews = safeNumber(provider.totalReviews);
  const specialisationTags = Array.isArray(provider.specialisationTags)
    ? provider.specialisationTags
    : Array.isArray(provider.specializations)
      ? provider.specializations
      : [];

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* PREVIEW BANNER (Sticky Top) */}
      <View style={styles.previewBanner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.bannerBackButton}>
          <Feather name="arrow-left" size={20} color={colors.background} />
        </TouchableOpacity>
        <Text style={styles.bannerText}>
          {t('previewBanner')} {(provider.businessName?.charAt(0) ?? 'P')}
        </Text>
        <View style={styles.bannerIcon}>
          <FontAwesome5 
            name="heart" 
            solid={false}
            size={16} 
            color={colors.background}
          />
        </View>
        <TouchableOpacity onPress={() => router.push('/(provider)/profile/edit')}>
          <Text style={styles.bannerAction}>{t('previewEdit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxxxl }}>
        
        {/* HERO SECTION */}
        <View style={styles.heroContainer}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Feather name="image" size={40} color={colors.textTertiary} />
            </View>
          )}

          {/* Avatar Overlap */}
          <View style={styles.avatarWrapper}>
            {provider.avatarUrl ? (
              <Image source={{ uri: provider.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{provider.businessName?.charAt(0) || 'P'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* PROVIDER INFO */}
        <View style={styles.infoSection}>
          <Text style={styles.businessName}>{provider.businessName || t('providerGeneric')}</Text>
          <View style={styles.statsRow}>
            <FontAwesome5 name="star" solid size={14} color={colors.gold} />
            <Text style={styles.statsText}>{avgRating} ({provider.totalReviews || 0} {t('cardReviews')})</Text>
          </View>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>{provider.city || t('notAvailable')} {distance ? `• ${distance}` : ''}</Text>
          </View>
        </View>

        <GermanErrorBanner visible={errorVisible} statusCode={errorStatus} message={errorMessage} actionLabel={t('appointmentsRetry')} onAction={loadData} />

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
              {provider.bio && <Text style={styles.bioText}>{provider.bio}</Text>}
              
              <Text style={styles.sectionHeader}>{t('profileSpecialisations')}</Text>
              <View style={styles.tagsRow}>
                {specialisationTags.length > 0 ? specialisationTags.map((tag: string, idx: number) => (
                  <View key={idx} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                )) : (Array.isArray(services) ? services.slice(0, 6) : []).map((s: any, idx: number) => (
                  <View key={idx} style={styles.tagChip}>
                    <Text style={styles.tagText}>{s.name}</Text>
                  </View>
                ))}
                {specialisationTags.length === 0 && services.length === 0 && (
                  <Text style={styles.emptyText}>{t('profileNoSpecialisations')}</Text>
                )}
              </View>

              <Text style={styles.sectionHeader}>{t('profileInfo')}</Text>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{provider.city || t('countryDefault')}</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="star" solid size={14} color={colors.gold} />
                <Text style={styles.infoText}>{avgRating} ({provider.totalReviews || 0} {t('cardReviews')})</Text>
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
            <View>
              {(Array.isArray(services) ? services : []).map((service, idx) => (
                <View key={idx} style={styles.serviceCard}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceDetail}>{service.durationMin || service.duration} {t('appointmentsMinutes')}</Text>
                    <Text style={styles.servicePrice}>€ {service.price}</Text>
                  </View>
                  <TouchableOpacity style={styles.selectButton} onPress={() => {}}>
                    <Text style={styles.selectButtonText}>{t('profileSelectService')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {services.length === 0 && <Text style={styles.emptyText}>{t('profileNoServices')}</Text>}
            </View>
          )}

          {activeTab === 'gallery' && (
            <View style={styles.galleryGrid}>
              {(Array.isArray(portfolio) ? portfolio : []).map((img: any, idx: number) => (
                <View key={idx} style={styles.galleryImageContainer}>
                  <Image source={{ uri: img.imageUrl || img.url }} style={styles.galleryImage} />
                </View>
              ))}
              {portfolio.length === 0 && <Text style={styles.emptyText}>{t('profileNoPhotos')}</Text>}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              <View style={styles.overallRatingBox}>
                <Text style={styles.overallRatingNumber}>{avgRating}</Text>
                <View style={styles.overallStars}>
                  {[1,2,3,4,5].map(s => <FontAwesome5 key={s} name="star" solid size={16} color={s <= Math.round(safeNumber(provider.avgRating)) ? colors.gold : colors.border} style={{marginHorizontal: spacing.xxxs}} />)}
                </View>
                <Text style={styles.totalReviewsText}>{t('reviewBased')} {totalReviews} {t('cardReviews')}</Text>
              </View>

              {(Array.isArray(reviews) ? reviews : []).map((rev, idx) => (
                <View key={idx} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerAvatarText}>{rev.clientName?.charAt(0) || 'K'}</Text>
                    </View>
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{rev.clientName || t('clientNameDefault')}</Text>
                      <View style={{flexDirection: 'row'}}>{[...Array(rev.rating || 5)].map((_, i) => <FontAwesome5 key={i} name="star" solid size={10} color={colors.gold} />)}</View>
                    </View>
                    <Text style={styles.reviewDate}>{rev.createdAt ? new Date(rev.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE') : ''}</Text>
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                </View>
              ))}
              {reviews.length === 0 && <Text style={styles.emptyText}>{t('profileNoReviews')}</Text>}
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM BAR (Greyed out) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.disabledButton} activeOpacity={1}>
          <Text style={styles.disabledButtonText}>{t('previewBookDisabled')}</Text>
          <Text style={styles.disabledButtonSub}>{t('previewNote')}</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: Platform.OS === 'android' ? spacing.xl : 0,
    ...shadows.card,
    zIndex: 10,
  },
  bannerBackButton: { padding: spacing.xs },
  bannerText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.background, flex: 1, textAlign: 'center' },
  bannerAction: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.background, padding: spacing.xs },
  bannerIcon: { padding: spacing.xs },

  heroContainer: { height: layout.heroHeight, position: 'relative', marginBottom: spacing.xxl + spacing.xxxs },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroImagePlaceholder: { width: '100%', height: '100%', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
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

  tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabsContainer: { paddingHorizontal: spacing.lg, gap: spacing.md },
  tabButton: { paddingBottom: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  
  tabContentContainer: { padding: spacing.lg },
  bioText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, lineHeight: spacing.lg - spacing.xxxs, marginBottom: spacing.xl },
  sectionHeader: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  tagChip: { backgroundColor: colors.surface, borderRadius: borderRadius.sm, paddingVertical: spacing.xxs + spacing.xxxs, paddingHorizontal: spacing.sm, marginRight: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
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
  reviewComment: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },

  emptyText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl },

  bottomBar: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disabledButton: {
    backgroundColor: colors.borderStrong,
    borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs,
    height: layout.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textSecondary },
  disabledButtonSub: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing.xxxs },
});
