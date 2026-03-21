import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../../theme';
import { ProviderCard, ProviderProps } from '../../components/ProviderCard';
import { GermanErrorBanner } from '../../components/GermanErrorBanner';
import { mapHttpError } from '../../utils/error-messages';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.2.85:3000';

export default function ClientHome() {
  const router = useRouter();
  
  const [firstName, setFirstName] = useState('');
  const [providers, setProviders] = useState<ProviderProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  useEffect(() => {
    loadUser();
    fetchProviders();
  }, []);

  const loadUser = async () => {
    const storedName = await AsyncStorage.getItem('firstName');
    // If we didn't store it during register/login, we dynamically fallback
    if (storedName) setFirstName(storedName);
  };

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/providers?availableToday=true&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProviders(response.data.data || response.data);
    } catch (err: any) {
      const status = err.response?.status;
      setErrorMessage(mapHttpError(status));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderPress = (id: string) => {
    router.push(`/(client)/provider/${id}` as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
               <Feather name="user" size={24} color={colors.primary} />
            </View>
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.greeting}>Hallo, {firstName || 'Kunde'}!</Text>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={colors.textSecondary} />
              <Text style={styles.locationText}>Wuppertal, NRW</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Feather name="bell" size={24} color={colors.primary} />
            <View style={styles.bellBadge} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.9}>
          <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <Text style={styles.searchText}>Suche nach Styles, Braiders, Salons...</Text>
          <Feather name="sliders" size={20} color={colors.primary} />
        </TouchableOpacity>

        <GermanErrorBanner visible={errorVisible} message={errorMessage} />

        {/* Braiders Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Braiders in deiner Nähe</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Alle anzeigen</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.coral} style={styles.loader} />
        ) : providers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Keine Braider in deiner Nähe</Text>
          </View>
        ) : (
          providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onPress={() => handleProviderPress(provider.id)}
              onFavourite={() => {}}
            />
          ))
        )}

        {/* Popular Styles Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Beliebte Styles</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Alle anzeigen</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stylesGallery} contentContainerStyle={{ paddingRight: spacing.lg }}>
          {[
            { id: '1', name: 'Knotless Braids', bg: '#FDE4E4' },
            { id: '2', name: 'Box Braids', bg: '#E4F3FD' },
            { id: '3', name: 'Cornrows', bg: '#FDF1E4' },
            { id: '4', name: 'Passion Twists', bg: '#EAE4FD' }
          ].map((style) => (
            <View key={style.id} style={[styles.styleCard, { backgroundColor: style.bg }]}>
              <View style={styles.styleImagePlaceholder}>
                <Feather name="image" size={32} color={colors.textTertiary} />
              </View>
              <Text style={styles.styleName}>{style.name}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  avatarContainer: { marginRight: spacing.md },
  avatarRing: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  headerTitles: { flex: 1 },
  greeting: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginLeft: 4 },
  bellButton: { position: 'relative', padding: spacing.xs },
  bellBadge: { position: 'absolute', top: 4, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.coral },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, height: 50, paddingHorizontal: spacing.md, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: spacing.md },
  searchText: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, marginTop: spacing.md },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary },
  seeAllText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.teal },
  loader: { marginVertical: spacing.xxl },
  emptyState: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyStateText: { fontFamily: fonts.body, fontSize: fontSizes.md, color: colors.textSecondary },
  stylesGallery: { marginBottom: spacing.xl, marginHorizontal: -spacing.lg, paddingLeft: spacing.lg },
  styleCard: { width: 140, height: 180, borderRadius: borderRadius.md, marginRight: spacing.md, overflow: 'hidden' },
  styleImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  styleName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.textPrimary, padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.8)', position: 'absolute', bottom: 0, width: '100%' },
});
