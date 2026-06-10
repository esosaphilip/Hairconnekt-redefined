import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows, borderRadius, layout } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';
import { API } from '../../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError } from '@/utils/logger';


interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  serviceName: string;
  provider: {
    businessName: string;
    avatarUrl?: string;
  };
  response?: string;
}

export default function ClientReviewsScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API}/reviews/mine`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to load reviews. Status: ${res.status}`);
      }
      
      const data: any = await res.json();
      setReviews(data.data || []);
    } catch (error) {
      debugError('Client review history load failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <Feather key={star} name="star" size={fontSizes.sm} color={star <= rating ? colors.gold : colors.starEmpty} style={{ marginRight: spacing.xxxs }} />
        ))}
      </View>
    );
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: Review }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.providerRow}>
          {item.provider?.avatarUrl ? (
            <Image source={{ uri: item.provider.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="briefcase" size={fontSizes.xl} color={colors.textSecondary} />
            </View>
          )}
          <Text style={styles.providerName}>{item.provider?.businessName || t('myReviewsUnknown')}</Text>
        </View>
      </View>

      <View style={styles.ratingDateRow}>
        {renderStars(item.rating)}
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      </View>

      {item.serviceName && (
        <View style={styles.serviceChip}>
          <Text style={styles.serviceChipText}>• {item.serviceName}</Text>
        </View>
      )}

      <Text style={styles.commentText} numberOfLines={4}>
        {item.comment}
      </Text>

      {item.response && (
        <View style={styles.responseBox}>
          <Text style={styles.responseLabel}>{t('myReviewsResponse')}</Text>
          <Text style={styles.responseText}>{item.response}</Text>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
    return (
      <View style={styles.emptyContainer}>
        <Feather name="star" size={spacing.xxxl} color={colors.iconDisabled} style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>{t('myReviewsEmpty')}</Text>
        <Text style={styles.emptySub}>{t('myReviewsEmptySub')}</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(client)/appointments/' as any)}>
          <Text style={styles.emptyButtonText}>{t('myReviewsViewAppts')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('myReviewsTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={reviews.length === 0 ? { flex: 1 } : styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
  },
  backButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  listContent: { padding: spacing.xl, paddingBottom: spacing.xxxxxl },

  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
    borderWidth: spacing.unit,
    borderColor: colors.border,
  },
  cardHeader: { marginBottom: spacing.sm },
  providerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: layout.inputHeight, height: layout.inputHeight, borderRadius: borderRadius.lg, borderWidth: spacing.xxxs, borderColor: colors.gold, marginRight: spacing.sm },
  avatarPlaceholder: {
    width: layout.inputHeight,
    height: layout.inputHeight,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: spacing.xxxs,
    borderColor: colors.gold,
    marginRight: spacing.sm,
  },
  providerName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary },

  ratingDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  starsRow: { flexDirection: 'row' },
  dateText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary },

  serviceChip: { backgroundColor: colors.surface, paddingHorizontal: spacing.s, paddingVertical: spacing.xxs, borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs, alignSelf: 'flex-start', marginBottom: spacing.sm },
  serviceChipText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },

  commentText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textPrimary, lineHeight: spacing.lg - spacing.xxxs },

  responseBox: {
    backgroundColor: colors.coralTintAlt,
    borderRadius: borderRadius.sm + borderRadius.xs + spacing.xxxs,
    padding: spacing.sm,
    marginTop: spacing.md,
    borderWidth: spacing.unit,
    borderColor: colors.coral
  },
  responseLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.textPrimary, marginBottom: spacing.xxs },
  responseText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: spacing.l },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { backgroundColor: colors.coral, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg },
  emptyButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: fontSizes.md },
});
