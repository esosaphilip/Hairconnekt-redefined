import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows, borderRadius, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { tokenStorage } from '../../../utils/token-storage';
import { API } from '../../../utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { debugError, debugLog } from '@/utils/logger';

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
  const { t } = useLanguage();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API}/providers/me/portfolio`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
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
      debugError('Provider portfolio load failed', error);
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
      t('portfolioDeleteTitle'),
      t('portfolioDeleteBody'),
      [
        { text: t('cancel'), style: "cancel" },
        { 
          text: t('delete'), 
          style: "destructive",
          onPress: async () => {
            // Optimistic update
            const prevImages = [...images];
            setImages(images.filter(img => img.id !== id));

            try {
              const token = await tokenStorage.getAccessToken();
              const response = await fetch(`${API}/providers/me/portfolio/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (!response.ok) {
                // Revert on failure
                setImages(prevImages);
              }
            } catch (error) {
              debugError('Provider portfolio delete failed', error);
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
            debugLog('Provider portfolio image load failed');
            setImages(prev => prev.filter(i => i.id !== item.id));
          }}
        />
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={() => handleDelete(item.id)}
          accessibilityRole="button"
          accessibilityLabel={t('portfolioDeleteTitle')}
          activeOpacity={0.8}
        >
          <Feather name="x" size={fontSizes.md} color={colors.error} />
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <Feather name="arrow-left" size={fontSizes.xxl} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('providerPortfolio')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/(provider)/portfolio/upload')}
          style={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel={t('portfolioUploadTitle')}
        >
          <Feather name="camera" size={fontSizes.xxl} color={colors.coral} />
        </TouchableOpacity>
      </View>

      {images.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Feather name="camera" size={spacing.xxl} color={colors.primaryLight} />
          </View>
          <Text style={styles.emptyTitle}>{t('profileNoPhotos')}</Text>
          <Text style={styles.emptySub}>{t('portfolioEmptySub')}</Text>
          <View style={{ width: '100%', paddingHorizontal: spacing.xl }}>
            <PrimaryButton 
              label={t('portfolioUploadTitle')} 
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
    borderBottomWidth: spacing.unit,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  headerAction: { width: layout.iconButton, height: layout.iconButton, justifyContent: 'center', alignItems: 'center' },

  listContent: { padding: spacing.lg, paddingBottom: spacing.xxxxxl },
  columnWrapper: { justifyContent: 'space-between', marginBottom: spacing.md },

  imageCard: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    position: 'relative',
    ...shadows.card,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.button,
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIconContainer: { width: layout.avatarLg, height: layout.avatarLg, borderRadius: layout.avatarMd - spacing.xs, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
});
