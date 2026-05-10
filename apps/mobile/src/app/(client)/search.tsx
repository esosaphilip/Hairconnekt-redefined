import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, SafeAreaView, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../theme';
import { ProviderCard, ProviderProps } from '../../components/ProviderCard';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';
import { useFavourites } from '../../contexts/FavouritesContext';
import { DiscoveryCoordinates, getDiscoveryCoordinates } from '../../utils/discovery-location';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiJson } from '@/services/apiClient';


type SortOption = 'empfohlen' | 'entfernung' | 'bewertung';

export default function ClientSearch() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { isFavourite, toggleFavourite } = useFavourites();
  const params = useLocalSearchParams<{ query?: string; sort?: SortOption }>();
  const initialQuery = typeof params.query === 'string' ? params.query : '';
  const initialSort: SortOption =
    params.sort === 'entfernung' || params.sort === 'bewertung'
      ? params.sort
      : 'empfohlen';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState('Alle');
  const [availableToday, setAvailableToday] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>(initialSort);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [providers, setProviders] = useState<ProviderProps[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  const [categoryMap, setCategoryMap] = useState<{ id: string; name: string }[]>([]);
  const [discoveryLocation, setDiscoveryLocation] = useState<DiscoveryCoordinates | null>(null);
  const [isLocating, setIsLocating] = useState(initialSort === 'entfernung');

  const sortMap: Record<SortOption, string> = {
    empfohlen: t('searchSortRecommended'),
    entfernung: t('searchSortDistance'),
    bewertung: t('searchSortRating'),
  };

  const loadDiscoveryLocation = async () => {
    setIsLocating(true);
    const coords = await getDiscoveryCoordinates();
    setDiscoveryLocation(coords);
    setIsLocating(false);
    return coords;
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await apiJson<any>('/services/categories');
        const cats = data.data || data || [];
        setCategoryMap(Array.isArray(cats) ? cats : []);
      } catch (e) {
        const status = (e as any)?.status ?? (e as any)?.response?.status;
        setErrorMessage(mapHttpError(status, undefined, lang));
        setErrorVisible(true);
      }
    };

    loadCategories();
    loadDiscoveryLocation();
  }, []);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSortOption(initialSort);
  }, [initialSort]);

  useEffect(() => {
    if (activeCategory === 'Alle' || categoryMap.length > 0) {
      setPage(1);
      setHasMore(true);
      setTotalResults(0);
      setProviders([]);
      fetchProviders(1, true, initialQuery);
    }
  }, [activeCategory, availableToday, sortOption, categoryMap, initialQuery, discoveryLocation]);

  const fetchProviders = async (
    pageNumber: number,
    isInitial = false,
    queryOverride?: string,
  ) => {
    try {
      if (isInitial) setIsLoading(true);
      else setIsFetchingMore(true);
      setErrorVisible(false);
      
      const trimmedQuery = (queryOverride ?? searchQuery).trim();
      const searchParam = trimmedQuery ? `&search=${encodeURIComponent(trimmedQuery)}` : '';
      const categoryParam = activeCategory !== 'Alle'
        ? `&category=${encodeURIComponent(activeCategory)}`
        : '';
      const availParam = availableToday ? `&availableToday=true` : '';
      const locationParam = discoveryLocation
        ? `&lat=${encodeURIComponent(String(discoveryLocation.lat))}&lng=${encodeURIComponent(String(discoveryLocation.lng))}`
        : '';
      
      const url = `/providers?limit=20&page=${pageNumber}&sort=${sortOption}${searchParam}${categoryParam}${availParam}${locationParam}`;

      const response = await apiJson<any>(url, { auth: true });

      const newData = response.data || response;
      const meta = response.meta ?? {};
      const nextHasMore =
        typeof meta.hasNext === 'boolean'
          ? meta.hasNext
          : newData.length === 20;

      setTotalResults(typeof meta.total === 'number' ? meta.total : newData.length);
      setHasMore(nextHasMore);

      setProviders(prev => pageNumber === 1 ? newData : [...prev, ...newData]);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      setErrorMessage(mapHttpError(status, undefined, lang));
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
    setTotalResults(0);
    setProviders([]);
    fetchProviders(1, true, searchQuery);
  };

  const handleSelectSort = async (nextSort: SortOption) => {
    setShowSortDropdown(false);

    if (nextSort === 'entfernung' && !discoveryLocation) {
      const coords = await loadDiscoveryLocation();
      if (!coords) {
        setErrorMessage(
          t('locationPermissionNeeded')
        );
        setErrorVisible(true);
        return;
      }
    }

    setSortOption(nextSort);
  };

  const handleLoadMore = () => {
    if (!hasMore || isLoading || isFetchingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProviders(nextPage);
  };

  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chipsContent}
      keyboardShouldPersistTaps="handled"
    >
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
          {t('all')}
        </Text>
      </TouchableOpacity>

      {/* Dynamic category chips from /services/categories */}
      {categoryMap.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.chip,
            activeCategory === cat.id && styles.chipActive,
          ]}
          onPress={() => setActiveCategory(cat.id)}
        >
          <Text style={[
            styles.chipText,
            activeCategory === cat.id && styles.chipTextActive,
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
          {t('searchAvailableToday')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={`${t('search')}...`}
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => {
                  Keyboard.dismiss();
                  setSearchQuery('');
                  setPage(1);
                  setHasMore(true);
                  setTotalResults(0);
                  setProviders([]);
                  fetchProviders(1, true, '');
                }}>
                  <Feather name="x" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {renderFilterChips()}

          <View style={styles.toolsRow}>
            <Text style={styles.resultCount}>
              {isLoading || isLocating ? t('loading') : `${totalResults} ${t('searchResults')}`}
            </Text>
            
            <View style={styles.sortWrapper}>
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
                        handleSelectSort(key);
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
              <Feather name="frown" size={layout.inputHeight} color={colors.textTertiary} style={styles.emptyIcon} />
              <Text style={styles.emptyStateText}>{t('searchEmpty')}</Text>
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
                    isFavourited: isFavourite(item.id)
                  }}
                  onPress={() => router.push(`/(client)/provider/${item.id}` as any)}
                  onFavourite={() => toggleFavourite(item.id)}
                />
              )}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={isFetchingMore ? <ActivityIndicator size="small" color={colors.coral} style={styles.loadMoreLoader} /> : null}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backButton: { marginRight: spacing.md },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, height: layout.inputHeight, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textPrimary, height: '100%' },
  chipsScroll: { maxHeight: layout.inputHeight, flexGrow: 0, marginTop: spacing.xs, marginBottom: spacing.md },
  chipsContent: { paddingHorizontal: spacing.lg, alignItems: 'center' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginRight: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.surface },
  toolsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, zIndex: 10, paddingBottom: spacing.sm },
  resultCount: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  sortWrapper: { position: 'relative', zIndex: 10 },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
  sortButtonText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
  dropdownModal: { position: 'absolute', top: layout.buttonHeightSm + spacing.xxs, right: 0, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm, ...shadows.card, elevation: 5, minWidth: spacing.xxl * 3 },
  dropdownItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  dropdownItemText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  dropdownItemActive: { fontFamily: fonts.bodyBold, color: colors.primary },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: layout.tabBarHeight + spacing.lg },
  loader: { marginTop: spacing.xxl },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: layout.tabBarHeight + spacing.lg },
  emptyIcon: { marginBottom: spacing.md },
  emptyStateText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textSecondary },
  loadMoreLoader: { margin: spacing.lg },
});
