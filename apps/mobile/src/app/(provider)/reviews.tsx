import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Modal, TextInput, Platform, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { tokenStorage } from '../../utils/token-storage';
import { API } from '../../utils/api';

interface ReviewSummary {
  avgRating: number;
  totalReviews: number;
  ratingDistribution: { [key: string]: number };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  serviceName: string;
  client: { name: string; avatarUrl?: string };
  response: string | null;
}

const FILTER_OPTIONS = ['Alle', '5 ★', '4 ★', '3 ★', '2 ★', '1 ★', 'Unbeantwortet'];

export default function ReviewsScreen() {
  const router = useRouter();

  const [providerId, setProviderId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('Alle');
  
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [respondingToId, setRespondingToId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  useFocusEffect(
    useCallback(() => {
      init();
    }, [])
  );

  const init = async () => {
    try {
      setIsLoading(true);
      const token = await tokenStorage.getAccessToken();
      const meRes = await fetch(`${API}/providers/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!meRes.ok) {
        console.log('Could not load provider profile, status:', meRes.status);
        return;
      }
      const meData = await meRes.json();
      const pId: string | undefined = meData.id;
      if (!pId) {
        console.log('Provider ID missing in response');
        return;
      }
      setProviderId(pId);
      await loadReviews(pId, 'Alle', 1, true);
    } catch (error) {
      console.log('Error initializing reviews', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReviews = async (pId: string, filter: string, pageNum: number, refresh = false) => {
    try {
      let url = `${API}/providers/${pId}/reviews?page=${pageNum}&limit=20`;
      
      if (filter.includes('★')) {
        url += `&rating=${filter.charAt(0)}`;
      }

      const token = await tokenStorage.getAccessToken();
      const res = await fetch(url, {
        // BUG 11: reviews list must be authenticated to show private data
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data: any = await res.json();

      if (refresh) {
        setSummary(data.summary);
      }

      let newReviews = data.data || [];
      
      // Client-side filter for 'Unbeantwortet' if server doesn't support it directly
      if (filter === 'Unbeantwortet') {
        newReviews = newReviews.filter((r: Review) => !r.response);
      }

      setReviews(prev => refresh ? newReviews : [...prev, ...newReviews]);
      setHasMore(data.meta?.hasNextPage || false);
      setPage(pageNum);

    } catch (error) {
      console.log('Error loading reviews', error);
    }
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    if (providerId) {
      setIsLoading(true);
      loadReviews(providerId, filter, 1, true).then(() => setIsLoading(false));
    }
  };

  const openReplyModal = (review: Review) => {
    setRespondingToId(review.id);
    setResponseText(review.response || '');
  };

  const closeReplyModal = () => {
    setRespondingToId(null);
    setResponseText('');
  };

  const submitResponse = async () => {
    if (!respondingToId || !responseText.trim()) return;

    try {
      setIsSubmittingResponse(true);
      const token = await tokenStorage.getAccessToken();
      const review = reviews.find(r => r.id === respondingToId);
      const isEdit = !!(review && review.response);
      
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(`${API}/reviews/${respondingToId}/response`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ response: responseText.trim() })
      });

      // Optimistic update even if backend fails (for demo purposes)
      setReviews(prev => prev.map(r => r.id === respondingToId ? { ...r, response: responseText.trim() } : r));
      closeReplyModal();

    } catch (error) {
      console.log('Error submitting response', error);
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bewertungen</Text>
        <View style={{ width: 40 }} />
      </View>

      {summary && (
        <View style={styles.overviewCard}>
          <View style={styles.overviewLeft}>
            <Text style={styles.avgRatingText}>{summary.avgRating.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <FontAwesome 
                  key={star} 
                  name={star <= Math.round(summary.avgRating) ? 'star' : 'star-o'} 
                  size={16} 
                  color={colors.gold} 
                />
              ))}
            </View>
            <Text style={styles.totalReviewsText}>{summary.totalReviews} Bewertungen</Text>
          </View>
          
          <View style={styles.overviewRight}>
            {[5, 4, 3, 2, 1].map(star => {
              const count = summary.ratingDistribution[star.toString()] || 0;
              const percentage = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
              return (
                <View key={star} style={styles.barRow}>
                  <Text style={styles.barLabel}>{star} ★</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${percentage}%` }]} />
                  </View>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.filterScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_OPTIONS.map(opt => {
            const isActive = activeFilter === opt;
            return (
              <TouchableOpacity 
                key={opt} 
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleFilterChange(opt)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </>
  );

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewRow1}>
        <View style={styles.clientInfo}>
          {item.client.avatarUrl ? (
            <Image source={{ uri: item.client.avatarUrl }} style={styles.clientAvatar} />
          ) : (
            <View style={styles.clientAvatarPlaceholder}>
              <Feather name="user" size={20} color={colors.textSecondary} />
            </View>
          )}
          <Text style={styles.clientName}>{item.client.name}</Text>
        </View>
        <View style={styles.ratingChip}>
          <Text style={styles.ratingChipText}>{item.rating} ★</Text>
        </View>
      </View>

      <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
      <Text style={styles.serviceText}>• {item.serviceName}</Text>
      
      <Text style={styles.commentText}>{item.comment}</Text>

      {item.response ? (
        <View style={styles.responseBox}>
          <View style={styles.responseHeader}>
            <Text style={styles.responseLabel}>✏️ Deine Antwort</Text>
            <TouchableOpacity onPress={() => openReplyModal(item)}>
              <Text style={styles.editLink}>Bearbeiten</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.responseText}>{item.response}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.replyButton} onPress={() => openReplyModal(item)}>
          <Text style={styles.replyButtonText}>Antworten</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return <ActivityIndicator size="large" color={colors.coral} style={{ marginTop: 40 }} />;
    return (
      <View style={styles.emptyState}>
        <Feather name="star" size={48} color={colors.borderStrong} />
        <Text style={styles.emptyTitle}>Noch keine Bewertungen</Text>
        {activeFilter !== 'Alle' ? (
          <Text style={styles.emptySub}>Keine Ergebnisse für "{activeFilter}"</Text>
        ) : (
          <Text style={styles.emptySub}>Deine ersten Kunden werden hier erscheinen</Text>
        )}
      </View>
    );
  };

  const targetReview = respondingToId ? reviews.find(r => r.id === respondingToId) : null;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <FlatList
        data={reviews}
        keyExtractor={item => item.id}
        renderItem={renderReviewItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* REPLY MODAL */}
      <Modal visible={!!respondingToId} transparent animationType="slide" onRequestClose={closeReplyModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Auf Bewertung antworten</Text>
            
            {targetReview && (
              <View style={styles.sheetReviewQuote}>
                <Text style={styles.sheetReviewText} numberOfLines={3}>"{targetReview.comment}"</Text>
              </View>
            )}

            <TextInput
              style={styles.replyInput}
              value={responseText}
              onChangeText={setResponseText}
              placeholder="Deine Antwort..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.charCount}>{responseText.length}/1000</Text>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeReplyModal}>
                <Text style={styles.cancelBtnText}>Abbrechen</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <PrimaryButton 
                  label="Antwort senden" 
                  onPress={submitResponse}
                  loading={isSubmittingResponse}
                  disabled={!responseText.trim()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  listContent: { paddingBottom: 40 },

  overviewCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  overviewLeft: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.border, paddingRight: spacing.md },
  avgRatingText: { fontFamily: fonts.heading, fontSize: 48, color: colors.primary, lineHeight: 56 },
  starsRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  totalReviewsText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  
  overviewRight: { flex: 1.5, paddingLeft: spacing.md, justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.gold, width: 30 },
  barBg: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, marginHorizontal: spacing.sm, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 4 },
  barCount: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, width: 24, textAlign: 'right' },

  filterScrollContainer: { marginBottom: spacing.lg },
  filterScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5' },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: '#555' },
  filterTextActive: { color: colors.background },

  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  reviewRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clientInfo: { flexDirection: 'row', alignItems: 'center' },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: spacing.sm },
  clientAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  clientName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  ratingChip: { backgroundColor: '#FFF9E6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingChipText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.gold },
  
  dateText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: '#AAAAAA', marginBottom: 2 },
  serviceText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: spacing.sm },
  commentText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textPrimary, lineHeight: 22, marginBottom: spacing.md },

  responseBox: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: spacing.md },
  responseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  responseLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.primary },
  editLink: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.teal },
  responseText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: '#555', lineHeight: 20 },

  replyButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.primary },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, marginTop: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginTop: spacing.md, marginBottom: 4 },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
  },
  sheetTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary, marginBottom: spacing.md },
  sheetReviewQuote: { backgroundColor: '#F5F5F5', padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  sheetReviewText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic' },
  replyInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 120,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  charCount: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: 4, marginBottom: spacing.lg },
  sheetActions: { flexDirection: 'row', alignItems: 'center' },
  cancelBtn: { flex: 1, height: 56, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textSecondary },
});
