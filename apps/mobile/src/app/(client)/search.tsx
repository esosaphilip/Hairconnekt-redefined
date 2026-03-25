import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, SafeAreaView, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../theme';
import { ProviderCard, ProviderProps } from '../../components/ProviderCard';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { getFavouriteIds, addFavourite, removeFavourite } from '../../utils/favourites';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

type SortOption = 'empfohlen' | 'entfernung' | 'bewertung';

export default function ClientSearch() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Alle');
  const [availableToday, setAvailableToday] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('empfohlen');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [providers, setProviders] = useState<ProviderProps[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  // Favourites
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);

  // Categories from API (id + name pairs)
  const [categoryList, setCategoryList] = useState<{ id: string; name: string }[]>([]);

  const sortMap: Record<SortOption, string> = {
    empfohlen: 'Empfohlen',
    entfernung: 'Entfernung',
    bewertung: 'Bewertung'
  };

  useEffect(() => {
    // Load service categories for filter chips
    const loadCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/services/categories`);
        if (!res.ok) return;
        const data = await res.json();
        const list: { id: string; name: string }[] = data.data ?? data ?? [];
        setCategoryList(list);
      } catch {
        // Keep empty — chips will not appear but app won't crash
      }
    };

    // Load which providers are already favourited
    const loadFavourites = async () => {
      const ids = await getFavouriteIds();
      setFavouriteIds(ids);
    };

    loadCategories();
    loadFavourites();
  }, []);

  useEffect(() => {
    // Only fetch when we have categories loaded (or Alle is selected)
    if (activeCategory === 'Alle' || categoryList.length > 0) {
      setPage(1);
      setHasMore(true);
      setProviders([]);
      fetchProviders(1, true);
    }
  }, [activeCategory, availableToday, sortOption, categoryList]);

  const fetchProviders = async (pageNumber: number, isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      else setIsFetchingMore(true);
      setErrorVisible(false);

      const token = await tokenStorage.getAccessToken();
      
      const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
      // Map the selected display name back to its ID
      const selectedCat = categoryList.find(c => c.name === activeCategory);
      const categoryParam = selectedCat ? `&services=${encodeURIComponent(selectedCat.id)}` : '';
      const availParam = availableToday ? `&availableToday=true` : '';
      
      const url = `${API_URL}/providers?limit=20&page=${pageNumber}&sort=${sortOption}${searchParam}${categoryParam}${availParam}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newData = response.data.data || response.data;
      
      if (newData.length < 20) {
        setHasMore(false);
      }

      setProviders(prev => pageNumber === 1 ? newData : [...prev, ...newData]);
    } catch (err: any) {
      const status = err.response?.status;
      setErrorMessage(mapHttpError(status));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    setPage(1);
    setHasMore(true);
    fetchProviders(1, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || isLoading || isFetchingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProviders(nextPage);
  };

  const handleToggleFavourite = async (providerId: string) => {
    const isCurrentlyFav = favouriteIds.includes(providerId);

    // Optimistic update
    setFavouriteIds(prev =>
      isCurrentlyFav
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );

    const success = isCurrentlyFav
      ? await removeFavourite(providerId)
      : await addFavourite(providerId);

    // Revert if API failed
    if (!success) {
      setFavouriteIds(prev =>
        isCurrentlyFav
          ? [...prev, providerId]
          : prev.filter(id => id !== providerId)
      );
    }
  };

  const renderFilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
      {/* "Alle" chip — always first */}
      <TouchableOpacity
        style={[
          styles.chip,
          activeCategory === 'Alle' && styles.chipActive,
        ]}
        onPress={() => setActiveCategory('Alle')}
      >
        <Text style={[
          styles.chipText,
          activeCategory === 'Alle' && styles.chipTextActive,
        ]}>
          Alle
        </Text>
      </TouchableOpacity>

      {/* Dynamic category chips from /services/categories */}
      {categoryList.map(cat => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.chip,
            activeCategory === cat.name && styles.chipActive,
          ]}
          onPress={() => setActiveCategory(cat.name)}
        >
          <Text style={[
            styles.chipText,
            activeCategory === cat.name && styles.chipTextActive,
          ]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}

      {/* "Verfügbar heute" toggle chip — always last */}
      <TouchableOpacity
        style={[
          styles.chip,
          availableToday && styles.chipActive,
        ]}
        onPress={() => setAvailableToday(prev => !prev)}
      >
        <Text style={[
          styles.chipText,
          availableToday && styles.chipTextActive,
        ]}>
          Verfügbar heute
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Suche..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); handleSearchSubmit(); }}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderFilterChips()}

      <View style={styles.toolsRow}>
        <Text style={styles.resultCount}>
          {isLoading ? 'Lade...' : `${providers.length} Braider gefunden`}
        </Text>
        
        <View style={{ position: 'relative', zIndex: 10 }}>
          <TouchableOpacity 
            style={styles.sortButton} 
            onPress={() => setShowSortDropdown(!showSortDropdown)}
          >
            <Text style={styles.sortButtonText}>{sortMap[sortOption]}</Text>
            <Feather name="chevron-down" size={16} color={colors.textPrimary} />
          </TouchableOpacity>

          {showSortDropdown && (
            <View style={styles.dropdownModal}>
              {(Object.keys(sortMap) as SortOption[]).map((key) => (
                <TouchableOpacity 
                  key={key} 
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSortOption(key);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, sortOption === key && styles.dropdownItemActive]}>
                    {sortMap[key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.coral} style={styles.loader} />
      ) : providers.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="frown" size={48} color={colors.textTertiary} style={{marginBottom: spacing.md}} />
          <Text style={styles.emptyStateText}>Keine Ergebnisse für deine Suche</Text>
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProviderCard
              provider={{
                ...item,
                isFavourited: favouriteIds.includes(item.id)
              }}
              onPress={() => router.push(`/(client)/provider/${item.id}` as any)}
              onFavourite={() => handleToggleFavourite(item.id)}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingMore ? <ActivityIndicator size="small" color={colors.coral} style={{ margin: spacing.lg }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backButton: { marginRight: spacing.md },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, height: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textPrimary, height: '100%' },
  chipsScroll: { maxHeight: 50, flexGrow: 0, marginTop: spacing.xs, marginBottom: spacing.md },
  chipsContent: { paddingHorizontal: spacing.lg, alignItems: 'center' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginRight: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.surface },
  toolsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, zIndex: 10, paddingBottom: spacing.sm },
  resultCount: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
  sortButtonText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
  dropdownModal: { position: 'absolute', top: 38, right: 0, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm, ...shadows.card, elevation: 5, minWidth: 150 },
  dropdownItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  dropdownItemText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  dropdownItemActive: { fontFamily: fonts.bodyBold, color: colors.primary },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  loader: { marginTop: spacing.xxl },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyStateText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textSecondary },
});
