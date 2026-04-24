import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, shadows } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { API } from '../../../utils/api';

export default function ProviderServicesListScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ [id: string]: string }>({});
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getAccessToken();
      
      const [catRes, svcRes] = await Promise.all([
        fetch(`${API}/services/categories`),
        fetch(`${API}/providers/me/services`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        const catMap: any = {};
        (catData.data || catData).forEach((c: any) => { catMap[c.id] = c.name; });
        setCategories(catMap);
      }

      if (svcRes.ok) {
        setServices(await svcRes.json());
      }
    } catch (e) {
      console.log('Error loading services:', e);
    } finally {
      setLoading(false);
    }
  };

  const groupedServices = services.reduce((acc: any, service: any) => {
    const catName = categories[service.categoryId] || 'Sonstige';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(service);
    return acc;
  }, {});

  const toggleActive = async (id: string, current: boolean) => {
    const targetStatus = !current;
    setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: targetStatus } : s));
    try {
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API}/providers/me/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isActive: targetStatus })
      });
      if (!res.ok) throw new Error();
    } catch {
      setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: current } : s));
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Service löschen', 'Möchtest du diesen Service wirklich unwiderruflich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deleteService(id) }
    ]);
  };

  const deleteService = async (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    try {
      const token = await tokenStorage.getAccessToken();
      await fetch(`${API}/providers/me/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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
        <Text style={styles.headerTitle}>Services & Preise</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {Object.keys(groupedServices).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Noch keine Services hinzugefügt</Text>
            <PrimaryButton label="Service hinzufügen" onPress={() => router.push('/(provider)/services/new')} />
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
                        <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>Inaktiv</Text></View>
                      )}
                    </View>
                    <Text style={styles.serviceDuration}>{Math.floor(service.durationMin / 60)} Std. {service.durationMin % 60 ? `${service.durationMin % 60} Min.` : ''}</Text>
                    <Text style={styles.servicePrice}>{service.priceType === 'from' ? 'Ab ' : ''}€{Number(service.price).toFixed(2).replace('.', ',')}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Switch
                      value={service.isActive}
                      onValueChange={() => toggleActive(service.id, service.isActive)}
                      trackColor={{ false: colors.borderStrong, true: '#2E7D32' }}
                      thumbColor="#fff"
                    />
                    <TouchableOpacity 
                      style={styles.menuDots}
                      onPress={() => {
                        Alert.alert('Service bearbeiten', '', [
                          { text: 'Abbrechen', style: 'cancel' },
                          { text: 'Bearbeiten', onPress: () => router.push(`/(provider)/services/${service.id}`) },
                          { text: 'Löschen', style: 'destructive', onPress: () => confirmDelete(service.id) }
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
            <Feather name="plus" size={20} color={colors.coral} style={{ marginRight: 8 }} />
            <Text style={styles.dashedAddText}>Service hinzufügen</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(provider)/services/new')}>
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  categorySection: { marginBottom: spacing.xl },
  categoryHeader: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary, marginBottom: spacing.md },
  serviceCard: { backgroundColor: colors.background, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.card },
  inactiveCard: { opacity: 0.6 },
  cardInfo: { flex: 1, paddingRight: spacing.sm },
  serviceName: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary, marginBottom: 4 },
  serviceDuration: { fontFamily: fonts.body, fontSize: 14, color: '#555', marginBottom: 4 },
  servicePrice: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.coral },
  inactiveBadge: { backgroundColor: colors.borderStrong, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: spacing.sm },
  inactiveBadgeText: { fontSize: 10, fontFamily: fonts.bodyMedium, color: colors.textSecondary },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuDots: { padding: spacing.sm },
  dashedAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.coral, borderRadius: 16, marginTop: spacing.md },
  dashedAddText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.coral },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontFamily: fonts.body, color: colors.textSecondary, marginBottom: spacing.lg },
  fab: { position: 'absolute', bottom: spacing.xl, right: spacing.xl, backgroundColor: colors.coral, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadows.card }
});
