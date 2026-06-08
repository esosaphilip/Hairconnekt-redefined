import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { API } from '../../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';


const RATING_LABELS = {
  de: { 1: 'Schlecht', 2: 'Nicht gut', 3: 'OK', 4: 'Gut', 5: 'Ausgezeichnet' },
  en: { 1: 'Bad', 2: 'Not great', 3: 'OK', 4: 'Good', 5: 'Excellent' },
} as const;

export default function WriteReviewScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();
  const { lang, t } = useLanguage();

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!bookingId) return;
        setIsLoading(true);
        const token = await tokenStorage.getAccessToken();
        const res = await axios.get(`${API}/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBooking(res.data);
      } catch (err: any) {
        setErrorMessage(mapHttpError(err.response?.status, undefined, lang));
        setErrorVisible(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (rating === 0 || comment.trim().length < 10) return;
    try {
      setIsSubmitting(true);
      setErrorVisible(false);
      const token = await tokenStorage.getAccessToken();
      
      await axios.post(`${API}/reviews`, {
        bookingId,
        rating,
        comment: comment.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.replace(`/(client)/appointments/${bookingId}` as any);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage(t('reviewAlreadySubmitted'));
      } else {
        setErrorMessage(mapHttpError(err.response?.status, undefined, lang));
      }
      setErrorVisible(true);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('reviewWrite')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color={colors.coral} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const providerName = booking?.provider?.businessName || 
    (booking?.provider?.user?.firstName ? `${booking.provider.user.firstName} ${booking.provider.user.lastName}` : t('providerGeneric'));
  const serviceNames = booking?.services?.map((s: any) => s.name).join(', ') || '';
  const avatarUrl = booking?.provider?.user?.avatarUrl;

  const isButtonDisabled = rating === 0 || comment.trim().length < 10 || isSubmitting;
  const ratingLabel =
    rating > 0
      ? (((RATING_LABELS as any)[lang] || RATING_LABELS.de)[rating] ?? ' ')
      : ' ';

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reviewWrite')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <GermanErrorBanner visible={errorVisible} message={errorMessage} />

          <View style={styles.providerCard}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {providerName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{providerName}</Text>
              <Text style={styles.serviceNames} numberOfLines={2}>
                {serviceNames}
              </Text>
            </View>
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.questionTitle}>{t('reviewQuestion')}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = starValue <= rating;
                return (
                  <TouchableOpacity
                    key={starValue}
                    onPress={() => setRating(starValue)}
                    style={styles.starButton}
                  >
                    <FontAwesome
                      name={isFilled ? 'star' : 'star-o'}
                      size={40}
                      color={isFilled ? colors.gold : colors.borderStrong}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.ratingLabel}>{ratingLabel}</Text>
            </View>
          </View>

          <View style={styles.commentSection}>
            <TextInput
              style={styles.commentInput}
              placeholder={t('reviewPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={styles.charCounter}>{comment.length}/500</Text>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isButtonDisabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isButtonDisabled}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>{t('reviewSubmit')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: layout.headerHeight, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: layout.iconButton, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: 'PlayfairDisplay-Medium', fontSize: fontSizes.xl, color: colors.primary },
  
  scrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xl },
  
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  avatarImage: { width: layout.avatarMd, height: layout.avatarMd, borderRadius: layout.avatarMd / 2, marginRight: spacing.md },
  avatarPlaceholder: { width: layout.avatarMd, height: layout.avatarMd, borderRadius: layout.avatarMd / 2, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.xxl, color: colors.textSecondary },
  providerInfo: { flex: 1 },
  providerName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xxs },
  serviceNames: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  
  ratingSection: { alignItems: 'center', marginBottom: spacing.xl },
  questionTitle: { fontFamily: fonts.bodyBold, fontSize: spacing.lg - spacing.xxxs, color: colors.textPrimary, marginBottom: spacing.lg },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  starButton: { padding: spacing.xxs },
  labelContainer: { height: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  ratingLabel: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.gold },
  
  commentSection: { marginBottom: spacing.lg },
  commentInput: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, height: layout.textAreaHeight + layout.iconButton, fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  charCounter: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textTertiary, textAlign: 'right', marginTop: spacing.xs },

  footer: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, ...shadows.card },
  submitButton: { backgroundColor: colors.coral, height: layout.buttonHeight, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
});
