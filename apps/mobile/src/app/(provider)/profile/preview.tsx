import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { tokenStorage } from '../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const { width } = Dimensions.get('window');

export default function ProfilePreviewScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  const [provider, setProvider] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState('Überblick');
  const tabs = ['Überblick', 'Services', 'Galerie', 'Bewertungen'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);

      const token = await tokenStorage.getAccessToken();
      if (!token) {
        setErrorMessage(mapHttpError(401));
        setErrorVisible(true);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const meRes = await fetch(`${API_URL}/providers/me`, { headers });
      if (!meRes.ok) {
        setErrorMessage(mapHttpError(meRes.status));
        setErrorVisible(true);
        return;
      }
      const meData = await meRes.json();
      const ownId = meData?.data?.id ?? meData?.id;
      if (!ownId) {
        setErrorMessage(mapHttpError(404));
        setErrorVisible(true);
        return;
      }
      const [provRes, servRes, portRes, revRes] = await Promise.all([
        fetch(`${API_URL}/providers/${ownId}`, { headers }),
        fetch(`${API_URL}/providers/${ownId}/services`, { headers }),
        fetch(`${API_URL}/providers/${ownId}/portfolio`, { headers }),
        fetch(`${API_URL}/providers/${ownId}/reviews`, { headers }),
      ]);

      if (!provRes.ok) {
        setErrorMessage(mapHttpError(provRes.status));
        setErrorVisible(true);
        return;
      }

      const provJson = await provRes.json();
      setProvider(provJson?.data ?? provJson);

      const servJson = await servRes.json().catch(() => ({}));
      const servArr = servJson?.data ?? servJson ?? [];
      setServices(Array.isArray(servArr) ? servArr : []);

      const portJson = await portRes.json().catch(() => ({}));
      const portArr = portJson?.data ?? portJson ?? [];
      setPortfolio(
        (Array.isArray(portArr) ? portArr : []).filter((i: any) => i.imageUrl || i.url),
      );

      const revJson = await revRes.json().catch(() => ({}));
      const revArr = revJson?.data ?? revJson ?? [];
      setReviews(Array.isArray(revArr) ? revArr : []);
    } catch {
      setErrorMessage(mapHttpError(500));
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
        <GermanErrorBanner visible={errorVisible} message={errorMessage || 'Fehler beim Laden.'} />
      </View>
    );
  }

  // Derived properties safely extracted
  const avgRating = provider.avgRating ? provider.avgRating.toFixed(1) : 'NEU';
  const distance = provider.distanceKm !== null && provider.distanceKm !== undefined ? `${provider.distanceKm.toFixed(1)} km` : '';
  const specialisationTags = provider.specialisationTags || provider.specializations || [];

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* PREVIEW BANNER (Sticky Top) */}
      <View style={styles.previewBanner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.bannerBackButton}>
          <Feather name="arrow-left" size={20} color={colors.background} />
        </TouchableOpacity>
        <Text style={styles.bannerText}>👁 Vorschau-Modus</Text>
        <TouchableOpacity onPress={() => router.push('/(provider)/profile/edit')}>
          <Text style={styles.bannerAction}>Bearbeiten</Text>
        </TouchableOpacity>
      </View>

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
          <Text style={styles.businessName}>{provider.businessName || 'Business Name'}</Text>
          <View style={styles.statsRow}>
            <FontAwesome5 name="star" solid size={14} color={colors.gold} />
            <Text style={styles.statsText}>{avgRating} ({provider.totalReviews || 0} Bewertungen)</Text>
          </View>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>{provider.city || 'Stadt'} {distance ? `• ${distance}` : ''}</Text>
          </View>
        </View>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        {/* TABS HEADER */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* TABS CONTENT */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'Überblick' && (
            <View>
              {provider.bio && <Text style={styles.bioText}>{provider.bio}</Text>}
              
              <Text style={styles.sectionHeader}>Spezialisierungen</Text>
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
                {specialisationTags.length === 0 && services.length === 0 && (
                  <Text style={styles.emptyText}>Keine Spezialisierungen angegeben.</Text>
                )}
              </View>

              <Text style={styles.sectionHeader}>Informationen</Text>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{provider.city || 'Deutschland'}</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="star" solid size={14} color={colors.gold} />
                <Text style={styles.infoText}>{avgRating} ({provider.totalReviews || 0} Bewertungen)</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="clock" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>Antwortet in {provider.responseTime || '< 1 Stunde'}</Text>
              </View>
              {provider.isVerified && (
                <View style={styles.infoRow}>
                  <Feather name="check-circle" size={16} color={colors.teal} />
                  <Text style={[styles.infoText, { color: colors.teal }]}>Verifiziert</Text>
                </View>
              )}

              <Text style={[styles.sectionHeader, { marginTop: spacing.xl }]}>Stornierungsbedingungen</Text>
              <Text style={styles.policyText}>Kostenlose Stornierung bis {provider.cancellationPolicy || '24 Stunden vor dem Termin'}</Text>
            </View>
          )}

          {activeTab === 'Services' && (
            <View>
              {services.map((service, idx) => (
                <View key={idx} style={styles.serviceCard}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceDetail}>{service.durationMin || service.duration} Min.</Text>
                    <Text style={styles.servicePrice}>€ {service.price}</Text>
                  </View>
                  <TouchableOpacity style={styles.selectButton} onPress={() => {}}>
                    <Text style={styles.selectButtonText}>Auswählen</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {services.length === 0 && <Text style={styles.emptyText}>Keine Services gelistet.</Text>}
            </View>
          )}

          {activeTab === 'Galerie' && (
            <View style={styles.galleryGrid}>
              {portfolio.map((img: any, idx: number) => (
                <View key={idx} style={styles.galleryImageContainer}>
                  <Image source={{ uri: img.imageUrl || img.url }} style={styles.galleryImage} />
                </View>
              ))}
              {portfolio.length === 0 && <Text style={styles.emptyText}>Noch keine Fotos</Text>}
            </View>
          )}

          {activeTab === 'Bewertungen' && (
            <View>
              <View style={styles.overallRatingBox}>
                <Text style={styles.overallRatingNumber}>{avgRating}</Text>
                <View style={styles.overallStars}>
                  {[1,2,3,4,5].map(s => <FontAwesome5 key={s} name="star" solid size={16} color={s <= Math.round(provider.avgRating || 0) ? colors.gold : colors.border} style={{marginHorizontal: 2}} />)}
                </View>
                <Text style={styles.totalReviewsText}>Basierend auf {provider.totalReviews || 0} Bewertungen</Text>
              </View>

              {reviews.map((rev, idx) => (
                <View key={idx} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerAvatarText}>{rev.clientName?.charAt(0) || 'K'}</Text>
                    </View>
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{rev.clientName || 'Kunde'}</Text>
                      <View style={{flexDirection: 'row'}}>{[...Array(rev.rating || 5)].map((_, i) => <FontAwesome5 key={i} name="star" solid size={10} color={colors.gold} />)}</View>
                    </View>
                    <Text style={styles.reviewDate}>{rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('de-DE') : ''}</Text>
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                </View>
              ))}
              {reviews.length === 0 && <Text style={styles.emptyText}>Keine Bewertungen vorhanden.</Text>}
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM BAR (Greyed out) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.disabledButton} activeOpacity={1}>
          <Text style={styles.disabledButtonText}>Termin buchen</Text>
          <Text style={styles.disabledButtonSub}>(Vorschau — Kunden buchen hier)</Text>
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

  heroContainer: { height: 220, position: 'relative', marginBottom: 50 },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroImagePlaceholder: { width: '100%', height: '100%', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
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

  bottomBar: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disabledButton: {
    backgroundColor: colors.borderStrong,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textSecondary },
  disabledButtonSub: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 2 },
});
