import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { API } from '../../../utils/api';


const RATING_LABELS: Record<number, string> = {
  1: 'Schlecht',
  2: 'Nicht gut',
  3: 'OK',
  4: 'Gut',
  5: 'Ausgezeichnet'
};

export default function WriteReviewScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();

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
        setErrorMessage(mapHttpError(err.response?.status));
        setErrorVisible(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  const handleSubmit = async () => {
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
        setErrorMessage('Du hast diesen Termin bereits bewertet.');
      } else {
        setErrorMessage(mapHttpError(err.response?.status));
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
          <Text style={styles.headerTitle}>Bewertung schreiben</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color={colors.coral} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const providerName = booking?.provider?.businessName || 
    (booking?.provider?.user?.firstName ? `${booking.provider.user.firstName} ${booking.provider.user.lastName}` : 'Anbieter');
  const serviceNames = booking?.services?.map((s: any) => s.name).join(', ') || '';
  const avatarUrl = booking?.provider?.user?.avatarUrl;

  const isButtonDisabled = rating === 0 || comment.trim().length < 10 || isSubmitting;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bewertung schreiben</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        <View style={styles.providerCard}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{providerName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{providerName}</Text>
            <Text style={styles.serviceNames} numberOfLines={2}>{serviceNames}</Text>
          </View>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.questionTitle}>Wie war dein Erlebnis?</Text>
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
                    name={isFilled ? "star" : "star-o"} 
                    size={40} 
                    color={isFilled ? "#C8860A" : "#CCCCCC"} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.labelContainer}>
            <Text style={styles.ratingLabel}>{rating > 0 ? RATING_LABELS[rating] : ' '}</Text>
          </View>
        </View>

        <View style={styles.commentSection}>
          <TextInput
            style={styles.commentInput}
            placeholder="Teile deine Erfahrung mit anderen Kunden..."
            placeholderTextColor="rgba(26,26,26,0.5)"
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCounter}>{comment.length}/500</Text>
        </View>

      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, isButtonDisabled && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={isButtonDisabled}
        >
          {isSubmitting ? (
             <ActivityIndicator color={colors.surface} />
          ) : (
             <Text style={styles.submitButtonText}>Bewertung senden</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: 'PlayfairDisplay-Medium', fontSize: 20, color: '#8B4513' },
  
  scrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: 100 },
  
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  avatarImage: { width: 64, height: 64, borderRadius: 32, marginRight: spacing.md },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 24, color: '#666' },
  providerInfo: { flex: 1 },
  providerName: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary, marginBottom: 4 },
  serviceNames: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  
  ratingSection: { alignItems: 'center', marginBottom: spacing.xl },
  questionTitle: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textPrimary, marginBottom: spacing.lg },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: spacing.md },
  starButton: { padding: 4 },
  labelContainer: { height: 24, justifyContent: 'center', alignItems: 'center' },
  ratingLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#C8860A' },
  
  commentSection: { marginBottom: spacing.lg },
  commentInput: { backgroundColor: '#F5F5F5', borderRadius: 16, padding: 16, height: 160, fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  charCounter: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textTertiary, textAlign: 'right', marginTop: 8 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 30, ...shadows.card },
  submitButton: { backgroundColor: colors.coral, height: 56, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
});
