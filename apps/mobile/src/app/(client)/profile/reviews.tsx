import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';
import { API } from '../../../utils/api';


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
      console.log('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <Feather key={star} name="star" size={14} color={star <= rating ? colors.gold : '#E0E0E0'} style={{ marginRight: 2 }} />
        ))}
      </View>
    );
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const months = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
    return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const renderItem = ({ item }: { item: Review }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.providerRow}>
          {item.provider?.avatarUrl ? (
            <Image source={{ uri: item.provider.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Feather name="briefcase" size={20} color={colors.textSecondary} />
            </View>
          )}
          <Text style={styles.providerName}>{item.provider?.businessName || 'Unbekannt'}</Text>
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
          <Text style={styles.responseLabel}>Antwort des Anbieters:</Text>
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
        <Feather name="star" size={64} color="#DDD" style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>Noch keine Bewertungen</Text>
        <Text style={styles.emptySub}>Deine Bewertungen nach abgeschlossenen Terminen erscheinen hier</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(client)/appointments/' as any)}>
          <Text style={styles.emptyButtonText}>Termine ansehen</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meine Bewertungen</Text>
        <View style={{ width: 40 }} />
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  listContent: { padding: spacing.xl, paddingBottom: 100 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cardHeader: { marginBottom: spacing.sm },
  providerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.gold, marginRight: spacing.sm },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
    marginRight: spacing.sm,
  },
  providerName: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },

  ratingDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  starsRow: { flexDirection: 'row' },
  dateText: { fontFamily: fonts.body, fontSize: 12, color: '#AAAAAA' },

  serviceChip: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: spacing.sm },
  serviceChipText: { fontFamily: fonts.body, fontSize: 12, color: '#6B6B6B' },

  commentText: { fontFamily: fonts.body, fontSize: 16, color: '#1A1A1A', lineHeight: 22 },

  responseBox: {
    backgroundColor: '#FFF0ED',
    borderRadius: 12,
    padding: 12,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.coral
  },
  responseLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#1A1A1A', marginBottom: 4 },
  responseText: { fontFamily: fonts.body, fontSize: 14, color: '#555555', lineHeight: 20 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { backgroundColor: colors.coral, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 24 },
  emptyButtonText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: fontSizes.md },
});
