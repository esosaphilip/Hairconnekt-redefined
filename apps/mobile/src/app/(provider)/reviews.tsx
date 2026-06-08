import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Modal, TextInput, Platform, Image, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { borderRadius, colors, fonts, fontSizes, layout, spacing, shadows } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { tokenStorage } from '../../utils/token-storage';
import { API } from '../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError, debugLog } from '@/utils/logger';

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

type FilterValue = 'all' | 'unanswered' | '5' | '4' | '3' | '2' | '1';
const FILTER_VALUES: FilterValue[] = ['all', '5', '4', '3', '2', '1', 'unanswered'];

export default function ReviewsScreen() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'de-DE';

  const [providerId, setProviderId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  
  const [isLoading, setIsLoading] = useState(true);
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
        debugLog(`Could not load provider profile status=${meRes.status}`);
        return;
      }
      const meData = await meRes.json();
      const pId: string | undefined = meData.id;
      if (!pId) {
        debugLog('Provider ID missing in response');
        return;
      }
      setProviderId(pId);
      await loadReviews(pId, 'all', 1, true);
    } catch (error) {
      debugError('Provider reviews init failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReviews = async (pId: string, filter: FilterValue, pageNum: number, refresh = false) => {
    try {
      let url = `${API}/providers/${pId}/reviews?page=${pageNum}&limit=20`;
      
      if (filter !== 'all' && filter !== 'unanswered') {
        url += `&rating=${filter}`;
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
      if (filter === 'unanswered') {
        newReviews = newReviews.filter((r: Review) => !r.response);
      }

      setReviews(prev => refresh ? newReviews : [...prev, ...newReviews]);

    } catch (error) {
      debugError('Provider reviews load failed', error);
    }
  };

  const handleFilterChange = (filter: FilterValue) => {
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
      Keyboard.dismiss();
      setIsSubmittingResponse(true);
      const token = await tokenStorage.getAccessToken();
      const review = reviews.find(r => r.id === respondingToId);
      const isEdit = !!(review && review.response);
      
      const method = isEdit ? 'PATCH' : 'POST';

      await fetch(`${API}/reviews/${respondingToId}/response`, {
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
      debugError('Provider review response failed', error);
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('providerReviewsTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
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
            <Text style={styles.totalReviewsText}>
              {t('providerReviewsBased')} {summary.totalReviews} {t('providerReviewsCount')}
            </Text>
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
          {FILTER_VALUES.map(opt => {
            const isActive = activeFilter === opt;
            const label =
              opt === 'all' ? t('providerReviewsAll') : opt === 'unanswered' ? t('providerReviewsFilter') : `${opt} ★`;
            return (
              <TouchableOpacity 
                key={opt} 
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleFilterChange(opt)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{label}</Text>
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
            <Text style={styles.responseLabel}>{t('providerReviewsOwnReply')}</Text>
            <TouchableOpacity onPress={() => openReplyModal(item)}>
              <Text style={styles.editLink}>{t('providerReviewsEdit')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.responseText}>{item.response}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.replyButton} onPress={() => openReplyModal(item)}>
          <Text style={styles.replyButtonText}>{t('providerReviewsReply')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return <ActivityIndicator size="large" color={colors.coral} style={{ marginTop: spacing.xl2 }} />;
    const activeLabel =
      activeFilter === 'all'
        ? t('providerReviewsAll')
        : activeFilter === 'unanswered'
          ? t('providerReviewsFilter')
          : `${activeFilter} ★`;
    return (
      <View style={styles.emptyState}>
        <Feather name="star" size={48} color={colors.borderStrong} />
        <Text style={styles.emptyTitle}>{t('providerReviewsEmpty')}</Text>
        {activeFilter !== 'all' ? (
          <Text style={styles.emptySub}>
            {t('noResults')} "{activeLabel}"
          </Text>
        ) : (
          <Text style={styles.emptySub}>{t('providerReviewsEmptySub')}</Text>
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
        keyboardShouldPersistTaps="handled"
      />

      {/* REPLY MODAL */}
      <Modal visible={!!respondingToId} transparent animationType="slide" onRequestClose={closeReplyModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.bottomSheet}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>{t('providerReviewsReplyTitle')}</Text>
              
              {targetReview && (
                <View style={styles.sheetReviewQuote}>
                  <Text style={styles.sheetReviewText} numberOfLines={3}>"{targetReview.comment}"</Text>
                </View>
              )}

              <TextInput
                style={styles.replyInput}
                value={responseText}
                onChangeText={setResponseText}
                placeholder={t('providerReviewsReplyPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                autoFocus
                returnKeyType="default"
              />
              <Text style={styles.charCount}>{responseText.length}/1000</Text>

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeReplyModal}>
                  <Text style={styles.cancelBtnText}>{t('providerReviewsCancel')}</Text>
                </TouchableOpacity>
                <View style={styles.submitBtnWrapper}>
                  <PrimaryButton 
                    label={t('providerReviewsSubmit')} 
                    onPress={submitResponse}
                    loading={isSubmittingResponse}
                    disabled={!responseText.trim()}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
  backButton: { width: layout.avatarSm, height: layout.avatarSm, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  listContent: { paddingBottom: spacing.xxl },

  overviewCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  overviewLeft: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.border, paddingRight: spacing.md },
  avgRatingText: { fontFamily: fonts.heading, fontSize: spacing.xxl, color: colors.primary, lineHeight: layout.buttonHeight },
  starsRow: { flexDirection: 'row', gap: spacing.xxs, marginBottom: spacing.xxs },
  totalReviewsText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  
  overviewRight: { flex: 1.5, paddingLeft: spacing.md, justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxs },
  barLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.gold, width: spacing.xl },
  barBg: { flex: 1, height: spacing.xs, backgroundColor: colors.border, borderRadius: spacing.xxs, marginHorizontal: spacing.sm, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.gold, borderRadius: spacing.xxs },
  barCount: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, width: spacing.lg, textAlign: 'right' },

  filterScrollContainer: { marginBottom: spacing.lg },
  filterScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  filterTextActive: { color: colors.background },

  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  reviewRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxs },
  clientInfo: { flexDirection: 'row', alignItems: 'center' },
  clientAvatar: { width: layout.avatarSm, height: layout.avatarSm, borderRadius: borderRadius.full, marginRight: spacing.sm },
  clientAvatarPlaceholder: { width: layout.avatarSm, height: layout.avatarSm, borderRadius: borderRadius.full, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  clientName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  ratingChip: { backgroundColor: colors.orangeLight, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: borderRadius.full },
  ratingChipText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.gold },
  
  dateText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, marginBottom: spacing.xxs },
  serviceText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginBottom: spacing.sm },
  commentText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textPrimary, lineHeight: spacing.lg - spacing.xxxs, marginBottom: spacing.md },

  responseBox: { backgroundColor: colors.surface, borderRadius: spacing.sm, padding: spacing.md },
  responseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  responseLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xs, color: colors.primary },
  editLink: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.teal },
  responseText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: spacing.l, },

  replyButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    height: layout.buttonHeightSm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.primary },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, marginTop: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xxs },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.md + spacing.lg : spacing.lg,
  },
  sheetTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary, marginBottom: spacing.md },
  sheetReviewQuote: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.sm, marginBottom: spacing.md },
  sheetReviewText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, fontStyle: 'italic' },
  replyInput: {
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.md,
    minHeight: layout.avatarXl,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  charCount: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xxs, marginBottom: spacing.lg },
  sheetActions: { flexDirection: 'row', alignItems: 'center' },
  cancelBtn: { flex: 1, height: layout.buttonHeight, borderRadius: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textSecondary },
  submitBtnWrapper: { flex: 1, marginLeft: spacing.md },
});
