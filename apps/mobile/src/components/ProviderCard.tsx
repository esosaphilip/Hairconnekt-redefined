import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';

export interface ProviderProps {
  id: string;
  businessName: string;
  avatarUrl: string | null;
  avgRating?: number;
  totalReviews: number;
  distanceKm: number | null;
  startingPrice: number;
  isAvailableToday: boolean;
  specialisationTags?: string[];
  isFavourited: boolean;
}

interface Props {
  provider: ProviderProps;
  onPress: () => void;
  onFavourite: () => void;
}

export function ProviderCard({ provider, onPress, onFavourite }: Props) {
  const { t, lang } = useLanguage();
  const tags =
    provider.specialisationTags && provider.specialisationTags.length > 0
      ? provider.specialisationTags
      : [t('cardGeneralTag')];

  const priceText =
    typeof provider.startingPrice === 'number' && provider.startingPrice > 0
      ? `${t('cardFrom')} €${formatAmount(provider.startingPrice, lang)}`
      : t('cardPriceOnRequest');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {provider.avatarUrl ? (
            <Image source={{ uri: provider.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Text style={styles.placeholderText}>{provider.businessName?.charAt(0) || '?'}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>{provider.businessName}</Text>
          <View style={styles.statsRow}>
            <FontAwesome5 name="star" solid size={12} color={colors.gold} />
            <Text style={styles.ratingText}>{(provider.avgRating || 0).toFixed(1)} ({provider.totalReviews || 0})</Text>
            {provider.distanceKm !== null && provider.distanceKm !== undefined && (
              <Text style={styles.distanceText}> • {provider.distanceKm.toFixed(1)} km</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.favouriteButton} onPress={onFavourite}>
          <FontAwesome5 name="heart" solid={provider.isFavourited} size={20} color={provider.isFavourited ? colors.coral : colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tagsRow}>
        {tags.slice(0, 3).map((tag, idx) => (
          <View key={idx} style={styles.tagChip}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>{priceText}</Text>
        {provider.isAvailableToday && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('cardAvailableToday')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  avatarContainer: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.gold, padding: spacing.xxxs },
  avatar: { width: '100%', height: '100%', borderRadius: 24 },
  placeholderAvatar: { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.primary },
  headerText: { flex: 1, marginLeft: spacing.md },
  name: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xxxs },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: spacing.xxs },
  distanceText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textTertiary },
  favouriteButton: { padding: spacing.xs },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  tagChip: { backgroundColor: colors.background, borderRadius: borderRadius.sm, paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs, marginRight: spacing.sm, marginBottom: spacing.sm },
  tagText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  badge: { backgroundColor: colors.greenLight, paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs, borderRadius: borderRadius.sm },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.green },
});
