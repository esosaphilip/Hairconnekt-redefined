import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Image, SafeAreaView, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.2.85:3000';

type TabType = 'upcoming' | 'completed' | 'cancelled';

export default function AppointmentsList() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      
      const token = await AsyncStorage.getItem('accessToken');
      let statusParam = '';
      if (activeTab === 'upcoming') statusParam = 'PENDING,CONFIRMED,IN_PROGRESS';
      if (activeTab === 'completed') statusParam = 'COMPLETED';
      if (activeTab === 'cancelled') statusParam = 'CANCELLED';

      const response = await axios.get(`${API_URL}/bookings?status=${statusParam}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const payload = response.data?.data || response.data || [];
      setBookings(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setErrorMessage(mapHttpError(err.response?.status));
      setErrorVisible(true);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch when tab changes or screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [activeTab])
  );

  const getBorderColor = (status: string) => {
    if (status === 'CONFIRMED' || status === 'IN_PROGRESS') return '#2E7D32'; // Colors.success
    if (status?.toLowerCase() === 'pending') return '#BF6000'; // Amber
    if (status === 'COMPLETED') return '#6B6B6B'; // Colors.textSecondary
    if (status === 'CANCELLED') return '#C62828'; // Colors.error
    return colors.border;
  };

  const getBadgeProps = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#BF6000', text: 'Ausstehend' };
      case 'CONFIRMED': 
      case 'IN_PROGRESS': return { bg: '#2E7D32', text: 'Bestätigt' };
      case 'COMPLETED': return { bg: '#6B6B6B', text: 'Abgeschlossen' };
      case 'CANCELLED': return { bg: '#C62828', text: 'Abgesagt' };
      default: return { bg: colors.border, text: status };
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const openMaps = (city: string) => {
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(city)}`);
  };

  const emptyText = () => {
    if (activeTab === 'upcoming') return 'Noch keine bevorstehenden Termine';
    if (activeTab === 'completed') return 'Noch keine abgeschlossenen Termine';
    return 'Keine abgesagten Termine';
  };

  const renderCard = ({ item }: { item: any }) => {
    const provider = item.provider || {};
    const user = provider.user || {};
    const providerName = provider.businessName || (user.firstName ? `${user.firstName} ${user.lastName}` : 'Anbieter');
    const avatar = user.avatarUrl || 'https://via.placeholder.com/150';
    const city = user.city || 'Düsseldorf';
    
    const serviceNames = item.services && item.services.length > 0
      ? item.services.map((s: any) => s.name).join(', ')
      : 'Gewählte Services';
      
    const badge = getBadgeProps(item.status);

    return (
      <TouchableOpacity 
        style={[styles.card, { borderLeftColor: getBorderColor(item.status) }]}
        onPress={() => router.push(`/(client)/appointments/${item.id}` as any)}
        activeOpacity={0.9}
      >
        {/* ROW 1: Provider Info + Status Badge */}
        <View style={styles.cardHeader}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <Text style={styles.providerName} numberOfLines={1}>{providerName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={styles.statusBadgeText}>{badge.text}</Text>
          </View>
        </View>

        {/* ROW 2: Service Chip + Price */}
        <View style={styles.serviceRow}>
          <View style={styles.serviceChip}>
            <Text style={styles.serviceChipText} numberOfLines={1}>{serviceNames}</Text>
          </View>
          <Text style={styles.priceText}>€{item.totalPrice || 0},00</Text>
        </View>

        {/* ROW 3: Date & Time */}
        <Text style={styles.dateTimeText}>
          {formatDate(item.scheduledDate)}, {item.scheduledTime} Uhr
        </Text>

        {/* ROW 4: Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => openMaps(city)}>
            <Feather name="map-pin" size={16} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Route</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/(client)/chat/${provider.id}` as any)}>
            <Feather name="message-circle" size={16} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Nachricht</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meine Termine</Text>
      </View>

      {/* Tab Filter Pills */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          <TouchableOpacity 
            style={[styles.tabPill, activeTab === 'upcoming' ? styles.tabPillActive : styles.tabPillInactive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabPillText, activeTab === 'upcoming' ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
              Anstehend {activeTab === 'upcoming' ? `(${bookings.length})` : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabPill, activeTab === 'completed' ? styles.tabPillActive : styles.tabPillInactive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabPillText, activeTab === 'completed' ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
              Abgeschlossen {activeTab === 'completed' ? `(${bookings.length})` : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabPill, activeTab === 'cancelled' ? styles.tabPillActive : styles.tabPillInactive]}
            onPress={() => setActiveTab('cancelled')}
          >
            <Text style={[styles.tabPillText, activeTab === 'cancelled' ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
              Abgesagt {activeTab === 'cancelled' ? `(${bookings.length})` : ''}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} />

      {/* List Output */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.coral} style={styles.loader} />
      ) : bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.md }} />
          <Text style={styles.emptyStateText}>{emptyText()}</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { 
    paddingHorizontal: spacing.lg, 
    paddingTop: spacing.lg, 
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },
  
  tabsContainer: { paddingVertical: spacing.md },
  tabsScrollContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  tabPill: { 
    height: 36, 
    borderRadius: 999, 
    paddingHorizontal: spacing.md, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  tabPillActive: { backgroundColor: colors.primary },
  tabPillInactive: { backgroundColor: '#F5F5F5' },
  tabPillText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  tabPillTextActive: { color: colors.surface },
  tabPillTextInactive: { color: '#555' },
  
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  loader: { marginTop: spacing.xxl },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyStateText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textSecondary },
  
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    ...shadows.card,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.sm },
  providerName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textPrimary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.surface },
  
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  serviceChip: { backgroundColor: '#F5F5F5', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 999, flexShrink: 1, marginRight: spacing.sm },
  serviceChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textPrimary },
  priceText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
  
  dateTimeText: { fontFamily: fonts.body, fontSize: 14, color: '#555', marginBottom: spacing.md },
  
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  actionIcon: { marginRight: 6 },
  actionButtonText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
});
