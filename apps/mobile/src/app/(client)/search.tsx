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

  const categories = ['Alle', 'Flechten', 'Pflege', 'Styling'];
  const sortMap: Record<SortOption, string> = {
    empfohlen: 'Empfohlen',
    entfernung: 'Entfernung',
    bewertung: 'Bewertung'
  };

  useEffect(() => {
    // Reset page logic when filters (except raw text search) shift naturally
    setPage(1);
    setHasMore(true);
    setProviders([]);
    fetchProviders(1, true);
  }, [activeCategory, availableToday, sortOption]);

  const fetchProviders = async (pageNumber: number, isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      else setIsFetchingMore(true);
      setErrorVisible(false);

      const token = await tokenStorage.getAccessToken();
      
      const searchParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
      const categoryParam = activeCategory !== 'Alle' ? `&category=${encodeURIComponent(activeCategory)}` : '';
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

  const renderFilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
      {categories.map((cat) => (
        <TouchableOpacity 
          key={cat} 
          style={[styles.chip, activeCategory === cat && styles.chipActive]}
          onPress={() => setActiveCategory(cat)}
        >
          <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>{cat}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity 
        style={[styles.chip, availableToday && styles.chipActive]}
        onPress={() => setAvailableToday(!availableToday)}
      >
        <Text style={[styles.chipText, availableToday && styles.chipTextActive]}>Verfügbar heute</Text>
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
              provider={item}
              onPress={() => router.push(`/(client)/provider/${item.id}` as any)}
              onFavourite={() => {}}
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
