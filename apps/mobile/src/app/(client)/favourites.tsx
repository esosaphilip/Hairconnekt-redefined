import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { colors, fonts, spacing, borderRadius, shadows } from '../../theme';
import { useFavourites } from '../../contexts/FavouritesContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { apiJson } from '@/services/apiClient';
import { debugError } from '@/utils/logger';

type ProviderSummaryDto = {
  id: string;
  businessName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  avgRating: number;
  totalReviews: number;
  startingPrice: number;
  city: string;
  postalCode: string;
  isFavourite: boolean;
};

export default function FavouritesScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { toggleFavourite, refreshFavourites } = useFavourites();
  const [favourites, setFavourites] = useState<ProviderSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFavourites();
    void refreshFavourites();
  }, []);

  const fetchFavourites = async () => {
    try {
      setIsLoading(true);
      const res = await apiJson<any>('/favourites', { auth: true });
      const payload = res?.data ?? res ?? [];
      setFavourites(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      if (err?.status === 401) {
        router.replace('/(auth)/login');
        return;
      }
      debugError('Client favourites load failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: ProviderSummaryDto }) => {
    const avatar = item.avatarUrl;
    const initial = (item.businessName || item.firstName || 'A').charAt(0).toUpperCase();

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/(client)/provider/${item.id}` as any)}
      >
        <View style={styles.imageContainer}>
          {avatar ? (
            // BUG 2: R2 returns full https:// URLs — use directly
            <Image source={{ uri: avatar }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>{initial}</Text>
            </View>
          )}

          {/* Heart Button */}
          <TouchableOpacity 
            style={styles.heartButton} 
            onPress={() => {
              Alert.alert(
                t('favouritesRemoveTitle'),
                t('favouritesRemoveBody').replace('{name}', item.businessName || item.firstName || ''),
                [
                  { text: t('cancel'), style: 'cancel' },
                  {
                    text: t('remove'),
                    style: 'destructive',
                    onPress: async () => {
                      setFavourites((prev) => prev.filter((p) => p.id !== item.id));
                      await toggleFavourite(item.id);
                      fetchFavourites();
                    },
                  },
                ],
              );
            }}
          >
            <FontAwesome name="heart" size={16} color={colors.coral} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.providerName} numberOfLines={1}>{item.businessName || `${item.firstName} ${item.lastName}`}</Text>
          
          <View style={styles.ratingRow}>
            <FontAwesome name="star" size={12} color={colors.gold} />
            <Text style={styles.ratingText}>{item.avgRating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.totalReviews})</Text>
          </View>
          
          <Text style={styles.priceText}>{t('cardFrom')} €{formatAmount(item.startingPrice, lang)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('favouritesTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('favouritesTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {favourites.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Feather name="heart" size={64} color={colors.borderStrong} style={{ marginBottom: spacing.lg }} />
          <Text style={styles.emptyStateTitle}>{t('favouritesEmpty')}</Text>
          <Text style={styles.emptyStateSubtitle}>{t('favouritesEmptySub')}</Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/(client)/search')}
          >
            <Text style={styles.primaryButtonText}>{t('favouritesDiscover')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favourites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.rowGap}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: 'PlayfairDisplay_500Medium', fontSize: 20, color: colors.primary },
  
  listContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, paddingBottom: spacing.xl2 },
  rowGap: { gap: spacing.sm, marginBottom: spacing.sm },
  
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, ...shadows.card, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontFamily: fonts.bodyBold, fontSize: 32, color: colors.textSecondary },
  
  heartButton: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.8)', justifyContent: 'center', alignItems: 'center' },
  
  cardContent: { padding: spacing.sm },
  providerName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.xxs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginBottom: spacing.xxs },
  ratingText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.gold },
  reviewCount: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textTertiary },
  priceText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },

  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyStateTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textMuted, marginBottom: spacing.xxs },
  emptyStateSubtitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.primary, height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: 300 },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.surface }
});
