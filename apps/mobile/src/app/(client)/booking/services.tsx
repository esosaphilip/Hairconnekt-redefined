import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, SectionList, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, layout } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { ApiError, apiJson } from '@/services/apiClient';

type BookingService = {
  id: string;
  name: string;
  category?: string | null;
  durationMinutes?: number | null;
  price?: number | string | null;
};

type ServiceSection = {
  title: string;
  data: BookingService[];
};

type ServicesResponse = BookingService[] | { data?: BookingService[] | null };

const normalizeParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? '' : value ?? '';

const extractServices = (payload: ServicesResponse): BookingService[] => {
  const services = Array.isArray(payload) ? payload : payload.data;
  return Array.isArray(services) ? services : [];
};

export default function ClientBookingServices() {
  const router = useRouter();
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const { t, lang } = useLanguage();
  const providerIdValue = normalizeParam(providerId);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [sections, setSections] = useState<ServiceSection[]>([]);
  const [selectedServices, setSelectedServices] = useState<Map<string, BookingService>>(new Map());

  useEffect(() => {
    if (providerIdValue) {
      void fetchServices();
    } else {
      setIsLoading(false);
    }
  }, [providerIdValue]);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      const payload = await apiJson<ServicesResponse>(
        `/providers/${providerIdValue}/services`,
        {
          auth: true,
          retryCount: 1,
        },
      );
      const services = extractServices(payload);

      const serviceMap = new Map<string, BookingService[]>();
      services.forEach((service) => {
        const category = service.category?.trim() || 'Allgemein';
        if (!serviceMap.has(category)) {
          serviceMap.set(category, []);
        }
        serviceMap.get(category)?.push(service);
      });

      const newSections = Array.from(serviceMap.entries()).map(([title, data]) => ({
        title,
        data,
      }));

      setSections(newSections);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      setErrorMessage(mapHttpError(status, undefined, lang));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleService = (service: BookingService) => {
    const newMap = new Map(selectedServices);
    if (newMap.has(service.id)) {
      newMap.delete(service.id);
    } else {
      newMap.set(service.id, service);
    }
    setSelectedServices(newMap);
  };

  const totalSum = useMemo(() => {
    let sum = 0;
    selectedServices.forEach((service) => {
      sum += Number(service.price || 0);
    });
    return sum;
  }, [selectedServices]);

  const handleNext = () => {
    if (selectedServices.size === 0 || !providerIdValue) return;
    const serviceIds = Array.from(selectedServices.keys()).join(',');
    router.push({
      pathname: '/(client)/booking/datetime',
      params: {
        providerId: providerIdValue,
        selectedServiceIds: serviceIds,
        totalPrice: totalSum.toFixed(2),
      },
    });
  };

  const renderService = ({ item }: { item: BookingService }) => {
    const isSelected = selectedServices.has(item.id);
    return (
      <View style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text style={styles.serviceDetail}>
            {item.durationMinutes
              ? `${item.durationMinutes / 60 >= 1 ? `${Math.floor(item.durationMinutes / 60)} ${t('appointmentsHours')} ` : ''}${item.durationMinutes % 60 > 0 ? `${item.durationMinutes % 60} ${t('appointmentsMinutes')}` : ''}`.trim()
              : t('notAvailable')}
          </Text>
        </View>
        <View style={styles.serviceAction}>
          <Text style={styles.servicePrice}>€{formatAmount(item.price, lang)}</Text>
          <TouchableOpacity 
            style={[styles.selectBtn, isSelected && styles.selectBtnSelected]}
            onPress={() => toggleService(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectBtnText, isSelected && styles.selectBtnTextSelected]}>
              {isSelected ? t('bookingSelected') : t('profileSelectService')}
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
        <Text style={styles.headerTitle}>{t('bookingSelectService')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>
      
      <View style={styles.stepIndicatorContainer}>
        <Text style={styles.stepText}>{t('bookingStep')} 1 {t('bookingOf')} 4</Text>
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
          <Text style={styles.emptyText}>{t('bookingNoServices')}</Text>
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
            <Text style={styles.footerSummaryText}>{selectedServices.size} {t('bookingServices')} {t('bookingSelected')}</Text>
            <Text style={styles.footerTotalText}>
              {t('bookingTotal')}: €{formatAmount(totalSum, lang)}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.nextButton, selectedServices.size === 0 && styles.nextButtonDisabled]} 
            onPress={handleNext}
            disabled={selectedServices.size === 0}
          >
            <Text style={styles.nextButtonText}>{t('next')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: layout.headerHeight, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: layout.iconButton, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary },
  
  stepIndicatorContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface },
  stepText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  stepBarRow: { flexDirection: 'row', gap: spacing.xxs },
  stepSegment: { flex: 1, height: spacing.xxs, backgroundColor: colors.border, borderRadius: borderRadius.xs },
  stepSegmentActive: { backgroundColor: colors.coral },
  
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xxxxxl },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: borderRadius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  serviceCardSelected: { borderColor: colors.coral },
  serviceInfo: { flex: 1, paddingRight: spacing.sm },
  serviceName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: spacing.xxs },
  serviceDetail: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  serviceAction: { alignItems: 'flex-end', justifyContent: 'space-between', height: layout.headerHeight },
  servicePrice: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary, marginBottom: spacing.sm },
  selectBtn: { backgroundColor: colors.background, paddingVertical: spacing.xxs + spacing.xxxs, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm },
  selectBtnSelected: { backgroundColor: colors.coral },
  selectBtnText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textSecondary },
  selectBtnTextSelected: { color: colors.surface },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: spacing.lg + spacing.xxs + spacing.xxxs, ...shadows.card },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerSummaryText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xxxs },
  footerTotalText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.primary },
  nextButton: { backgroundColor: colors.coral, height: layout.inputHeight, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  nextButtonDisabled: { backgroundColor: colors.border },
  nextButtonText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.surface },
  emptyContainer: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textTertiary, textAlign: 'center' }
});
