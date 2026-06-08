import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows, borderRadius, layout } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAmount } from '@/utils/format';
import { GermanErrorBanner } from '@/components/GermanErrorBanner';
import { apiFetch, apiJson } from '@/services/apiClient';

export default function ProviderServicesListScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [categories, setCategories] = useState<{ [id: string]: string }>({});
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorVisible(false);
      
      const [catRes, svcRes] = await Promise.all([
        apiJson<any>('/services/categories', { timeoutMs: 20000, retryCount: 1 }),
        apiJson<any>('/providers/me/services', { auth: true, timeoutMs: 20000, retryCount: 1 })
      ]);

      const catData = catRes?.data ?? catRes ?? [];
      const catMap: any = {};
      (Array.isArray(catData) ? catData : []).forEach((c: any) => { catMap[c.id] = c.name; });
      setCategories(catMap);

      const svcData = svcRes?.data ?? svcRes ?? [];
      setServices(Array.isArray(svcData) ? svcData : []);
    } catch (e) {
      setErrorStatus(e?.status ?? e?.response?.status);
      setErrorMessage(e?.message);
      setErrorVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const groupedServices = services.reduce((acc: any, service: any) => {
    const catName = categories[service.categoryId] || t('servicesOtherCategory');
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(service);
    return acc;
  }, {});

  const toggleActive = async (id: string, current: boolean) => {
    const targetStatus = !current;
    setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: targetStatus } : s));
    try {
      const res = await apiFetch(`/providers/me/services/${id}`, {
        method: 'PATCH',
        auth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: targetStatus }),
        timeoutMs: 20000,
      });
      if (!res.ok) throw new Error();
    } catch {
      setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: current } : s));
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(t('servicesDeleteTitle'), t('servicesDeleteBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteService(id) }
    ]);
  };

  const deleteService = async (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    try {
      await apiFetch(`/providers/me/services/${id}`, {
        method: 'DELETE',
        auth: true,
        timeoutMs: 20000,
      });
    } catch (e) {
      loadData();
    }
  };

  if (loading && services.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('servicesTitle')}</Text>
        <View style={{ width: layout.iconButton }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GermanErrorBanner
          visible={errorVisible}
          statusCode={errorStatus}
          message={errorMessage}
          actionLabel={t('appointmentsRetry')}
          onAction={loadData}
        />
        {Object.keys(groupedServices).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('servicesEmpty')}</Text>
            <PrimaryButton label={t('servicesAdd')} onPress={() => router.push('/(provider)/services/new')} />
          </View>
        ) : (
          Object.keys(groupedServices).map(catName => (
            <View key={catName} style={styles.categorySection}>
              <Text style={styles.categoryHeader}>{catName}</Text>
              
              {groupedServices[catName].map((service: any) => (
                <View key={service.id} style={[styles.serviceCard, !service.isActive && styles.inactiveCard]}>
                  <View style={styles.cardInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      {!service.isActive && (
                        <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>{t('servicesInactive')}</Text></View>
                      )}
                    </View>
                    <Text style={styles.serviceDuration}>
                      {Math.floor(service.durationMin / 60)} {t('appointmentsHours')}{service.durationMin % 60 ? ` ${service.durationMin % 60} ${t('appointmentsMinutes')}` : ''}
                    </Text>
                    <Text style={styles.servicePrice}>
                      {service.priceType === 'from' ? t('servicesPricePrefix') : ''}€{formatAmount(service.price, lang)}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Switch
                      value={service.isActive}
                      onValueChange={() => toggleActive(service.id, service.isActive)}
                      trackColor={{ false: colors.borderStrong, true: colors.green }}
                      thumbColor={colors.background}
                    />
                    <TouchableOpacity 
                      style={styles.menuDots}
                      onPress={() => {
                        Alert.alert(t('servicesEdit'), '', [
                          { text: t('cancel'), style: 'cancel' },
                          { text: t('edit'), onPress: () => router.push(`/(provider)/services/${service.id}`) },
                          { text: t('delete'), style: 'destructive', onPress: () => confirmDelete(service.id) }
                        ]);
                      }}
                    >
                      <Feather name="more-vertical" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {Object.keys(groupedServices).length > 0 && (
          <TouchableOpacity style={styles.dashedAddBtn} onPress={() => router.push('/(provider)/services/new')}>
            <Feather name="plus" size={20} color={colors.coral} style={{ marginRight: spacing.xs }} />
            <Text style={styles.dashedAddText}>{t('servicesAdd')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(provider)/services/new')}>
        <Feather name="plus" size={24} color={colors.background} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: spacing.xs },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: fontSizes.lg, color: colors.textPrimary },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxxl },
  categorySection: { marginBottom: spacing.xl },
  categoryHeader: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary, marginBottom: spacing.md },
  serviceCard: { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.card },
  inactiveCard: { opacity: 0.6 },
  cardInfo: { flex: 1, paddingRight: spacing.sm },
  serviceName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, marginBottom: spacing.xxs },
  serviceDuration: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.xxs },
  servicePrice: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.coral },
  inactiveBadge: { backgroundColor: colors.borderStrong, paddingHorizontal: spacing.xxs + spacing.xxxs, paddingVertical: spacing.xxxs, borderRadius: borderRadius.sm, marginLeft: spacing.sm },
  inactiveBadgeText: { fontSize: fontSizes.xxs, fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuDots: { padding: spacing.sm },
  dashedAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.coral, borderRadius: borderRadius.md, marginTop: spacing.md },
  dashedAddText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.coral },
  emptyState: { alignItems: 'center', marginTop: spacing.xxxxxl },
  emptyText: { fontFamily: fonts.body, color: colors.textSecondary, marginBottom: spacing.lg },
  fab: { position: 'absolute', bottom: spacing.xl, right: spacing.xl, backgroundColor: colors.coral, width: layout.fabSize, height: layout.fabSize, borderRadius: layout.fabSize / 2, alignItems: 'center', justifyContent: 'center', ...shadows.card }
});
