import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { colors, fonts, spacing, borderRadius, shadows } from '../../theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.2.85:3000';

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
  const [favourites, setFavourites] = useState<ProviderSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFavourites();
  }, []);

  const fetchFavourites = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      const res = await axios.get(`${API_URL}/favourites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavourites(res.data);
    } catch (err) {
      console.log('Failed to fetch favourites', err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFavourite = async (providerId: string, businessName: string) => {
    Alert.alert(
      'Aus Favoriten entfernen?',
      `Möchtest du ${businessName} wirklich aus deinen Favoriten entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Entfernen', 
          style: 'destructive', 
          onPress: async () => {
            // Optimistic Update
            setFavourites(prev => prev.filter(p => p.id !== providerId));
            try {
              const token = await AsyncStorage.getItem('accessToken');
              await axios.delete(`${API_URL}/favourites/${providerId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (err) {
              console.log('Failed to remove favourite via API', err);
              // In a real app we might revert the optimistic update here if it truly failed
              fetchFavourites();
            }
          } 
        }
      ]
    );
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
            <Image source={{ uri: `${avatar.startsWith('http') ? '' : API_URL}${avatar}` }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>{initial}</Text>
            </View>
          )}

          {/* Heart Button */}
          <TouchableOpacity 
            style={styles.heartButton} 
            onPress={() => removeFavourite(item.id, item.businessName || item.firstName || '')}
          >
            <FontAwesome name="heart" size={16} color={colors.coral} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.providerName} numberOfLines={1}>{item.businessName || `${item.firstName} ${item.lastName}`}</Text>
          
          <View style={styles.ratingRow}>
            <FontAwesome name="star" size={12} color="#C8860A" />
            <Text style={styles.ratingText}>{item.avgRating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.totalReviews})</Text>
          </View>
          
          <Text style={styles.priceText}>ab €{item.startingPrice}</Text>
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
          <Text style={styles.headerTitle}>Meine Favoriten</Text>
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
        <Text style={styles.headerTitle}>Meine Favoriten</Text>
        <View style={{ width: 40 }} />
      </View>

      {favourites.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Feather name="heart" size={64} color="#CCCCCC" style={{ marginBottom: spacing.lg }} />
          <Text style={styles.emptyStateTitle}>Noch keine Favoriten</Text>
          <Text style={styles.emptyStateSubtitle}>Entdecke Braider in deiner Nähe</Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/(client)/search')}
          >
            <Text style={styles.primaryButtonText}>Braider entdecken</Text>
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
  headerTitle: { fontFamily: 'PlayfairDisplay-Medium', fontSize: 20, color: colors.primary },
  
  listContainer: { paddingHorizontal: 16, paddingVertical: spacing.md, paddingBottom: 40 },
  rowGap: { gap: 12, marginBottom: 12 },
  
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, ...shadows.card, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 120, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontFamily: fonts.bodyBold, fontSize: 32, color: '#666' },
  
  heartButton: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.8)', justifyContent: 'center', alignItems: 'center' },
  
  cardContent: { padding: 12 },
  providerName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  ratingText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#C8860A' },
  reviewCount: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textTertiary },
  priceText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },

  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyStateTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: '#555555', marginBottom: 4 },
  emptyStateSubtitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.primary, height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: 300 },
  primaryButtonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.surface }
});
