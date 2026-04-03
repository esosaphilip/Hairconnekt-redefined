import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { tokenStorage } from '../../../utils/token-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
// Calculate image size to fit 2 columns with spacing
const IMAGE_SIZE = (width - spacing.lg * 2 - spacing.md) / COLUMN_COUNT;

interface PortfolioImage {
  id: string;
  imageUrl: string;
  caption?: string;
  styleTags?: string[];
  sortOrder: number;
  createdAt?: string;
}

export default function PortfolioScreen() {
  const router = useRouter();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API_URL}/providers/me/portfolio`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Assuming response is an array of images or { data: [] }
        const imageList = data.data || data;
        // Sort by orderIndex if present
        if (Array.isArray(imageList)) {
          imageList.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
          const validImages = imageList.filter((img: any) => !!img.imageUrl);
          setImages(validImages);
        }
      }
    } catch (error) {
      console.log('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPortfolio();
    }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      "Foto löschen",
      "Bist du sicher, dass du dieses Foto aus deinem Portfolio löschen möchtest?",
      [
        { text: "Abbrechen", style: "cancel" },
        { 
          text: "Löschen", 
          style: "destructive",
          onPress: async () => {
            // Optimistic update
            const prevImages = [...images];
            setImages(images.filter(img => img.id !== id));

            try {
              const token = await tokenStorage.getAccessToken();
              const response = await fetch(`${API_URL}/providers/me/portfolio/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (!response.ok) {
                // Revert on failure
                setImages(prevImages);
              }
            } catch (error) {
              console.log('Error deleting image:', error);
              setImages(prevImages);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: PortfolioImage }) => {
    if (!item.imageUrl) return null;
    return (
      <View style={styles.imageCard}>
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.image} 
          resizeMode="cover" 
          onError={() => {
            console.log('Image load error:', item.imageUrl);
            setImages(prev => prev.filter(i => i.id !== item.id));
          }}
        />
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => handleDelete(item.id)}
          activeOpacity={0.8}
        >
          <Feather name="x" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && images.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portfolio</Text>
        <TouchableOpacity onPress={() => router.push('/(provider)/portfolio/upload')} style={styles.headerAction}>
          <Feather name="camera" size={24} color={colors.coral} />
        </TouchableOpacity>
      </View>

      {images.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Feather name="camera" size={48} color={colors.primaryLight} />
          </View>
          <Text style={styles.emptyTitle}>Noch keine Portfolio-Fotos</Text>
          <Text style={styles.emptySub}>Zeige deine Arbeit und gewinne mehr Kunden</Text>
          <View style={{ width: '100%', paddingHorizontal: spacing.xl }}>
            <PrimaryButton 
              label="Foto hochladen" 
              onPress={() => router.push('/(provider)/portfolio/upload')}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  headerAction: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  listContent: { padding: spacing.lg, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: spacing.md },

  imageCard: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    backgroundColor: colors.surface,
    position: 'relative',
    ...shadows.card,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.button,
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIconContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
});
