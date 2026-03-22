import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, SectionList, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function ClientBookingServices() {
  const router = useRouter();
  const { providerId } = useLocalSearchParams<{ providerId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [sections, setSections] = useState<{title: string, data: any[]}[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (providerId) {
      fetchServices();
    } else {
      setIsLoading(false);
    }
  }, [providerId]);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      const token = await tokenStorage.getAccessToken();
      const response = await axios.get(`${API_URL}/providers/${providerId}/services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data.data || response.data || [];
      
      const map = new Map<string, any[]>();
      data.forEach((s: any) => {
        const cat = s.category || 'Allgemein';
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(s);
      });
      
      const newSections = Array.from(map.keys()).map(cat => ({
        title: cat,
        data: map.get(cat)!
      }));
      
      setSections(newSections);
    } catch (err: any) {
      setErrorMessage(mapHttpError(err.response?.status));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = (service: any) => {
    const newMap = new Map(selectedDocs);
    if (newMap.has(service.id)) {
      newMap.delete(service.id);
    } else {
      newMap.set(service.id, service);
    }
    setSelectedDocs(newMap);
  };

  const totalSum = useMemo(() => {
    let sum = 0;
    selectedDocs.forEach(s => sum += Number(s.price || 0));
    return sum;
  }, [selectedDocs]);

  const handleNext = () => {
    if (selectedDocs.size === 0) return;
    const serviceIds = Array.from(selectedDocs.keys()).join(',');
    router.push({
      pathname: '/(client)/booking/datetime',
      params: { providerId, selectedServiceIds: serviceIds, totalPrice: totalSum.toFixed(2) }
    } as any);
  };

  const renderService = ({ item }: { item: any }) => {
    const isSelected = selectedDocs.has(item.id);
    return (
      <View style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text style={styles.serviceDetail}>
            {item.durationMinutes ? `${item.durationMinutes / 60 >= 1 ? `${Math.floor(item.durationMinutes / 60)} Std. ` : ''}${item.durationMinutes % 60 > 0 ? `${item.durationMinutes % 60} Min.` : ''}`.trim() : 'N/A'}
          </Text>
        </View>
        <View style={styles.serviceAction}>
          <Text style={styles.servicePrice}>€{item.price}</Text>
          <TouchableOpacity 
            style={[styles.selectBtn, isSelected && styles.selectBtnSelected]}
            onPress={() => toggleService(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectBtnText, isSelected && styles.selectBtnTextSelected]}>
              {isSelected ? 'Ausgewählt' : 'Auswählen'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services auswählen</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.stepIndicatorContainer}>
        <Text style={styles.stepText}>Schritt 1 von 4</Text>
        <View style={styles.stepBarRow}>
          <View style={[styles.stepSegment, styles.stepSegmentActive]} />
          <View style={styles.stepSegment} />
          <View style={styles.stepSegment} />
          <View style={styles.stepSegment} />
        </View>
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.coral} style={{ marginTop: spacing.xxl }} />
      ) : sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Gegenwärtig werden keine Services angeboten.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderService}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.footerSummaryText}>{selectedDocs.size} Services ausgewählt</Text>
            <Text style={styles.footerTotalText}>Gesamt: €{totalSum.toFixed(2)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.nextButton, selectedDocs.size === 0 && styles.nextButtonDisabled]} 
            onPress={handleNext}
            disabled={selectedDocs.size === 0}
          >
            <Text style={styles.nextButtonText}>Weiter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary },
  
  stepIndicatorContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface },
  stepText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: 8 },
  stepBarRow: { flexDirection: 'row', gap: 4 },
  stepSegment: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  stepSegmentActive: { backgroundColor: colors.coral },
  
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: 100 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  serviceCardSelected: { borderColor: colors.coral },
  serviceInfo: { flex: 1, paddingRight: spacing.sm },
  serviceName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: 4 },
  serviceDetail: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  serviceAction: { alignItems: 'flex-end', justifyContent: 'space-between', height: 60 },
  servicePrice: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary, marginBottom: spacing.sm },
  selectBtn: { backgroundColor: colors.background, paddingVertical: 6, paddingHorizontal: 12, borderRadius: borderRadius.sm },
  selectBtnSelected: { backgroundColor: colors.coral },
  selectBtnText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  selectBtnTextSelected: { color: colors.surface },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 30, ...shadows.card },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerSummaryText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: 2 },
  footerTotalText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  nextButton: { backgroundColor: colors.coral, height: 48, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  nextButtonDisabled: { backgroundColor: colors.border },
  nextButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
  emptyContainer: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textTertiary, textAlign: 'center' }
});
