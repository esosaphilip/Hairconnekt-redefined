import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Image, SafeAreaView, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../utils/token-storage';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../../theme';
import { GermanErrorBanner } from '../../../components/GermanErrorBanner';
import { mapHttpError } from '../../../utils/error-messages';
import { API } from '../../../utils/api';
import { bookingStatus, bookingStatusLabel } from '../../../utils/booking-status';
import { formatAmount } from '../../../utils/format';
import { useLanguage } from '@/contexts/LanguageContext';

type TabType = 'upcoming' | 'completed' | 'cancelled';

export default function AppointmentsList() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setErrorVisible(false);
      
      const token = await tokenStorage.getAccessToken();
      let statusParam = '';
      if (activeTab === 'upcoming') statusParam = 'PENDING,CONFIRMED,IN_PROGRESS';
      if (activeTab === 'completed') statusParam = 'COMPLETED';
      if (activeTab === 'cancelled') statusParam = 'CANCELLED';

      const response = await axios.get(`${API}/bookings?status=${statusParam}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const payload = response.data?.data || response.data || [];
      setBookings(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setErrorMessage(mapHttpError(err.response?.status, undefined, lang));
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
    if (bookingStatus(status) === 'confirmed' || bookingStatus(status) === 'in_progress') return colors.green;
    if (bookingStatus(status) === 'pending') return colors.orange;
    if (bookingStatus(status) === 'completed') return colors.textSecondary;
    if (bookingStatus(status) === 'cancelled') return colors.error;
    return colors.border;
  };

  const getBadgeProps = (status: string) => {
    const s = bookingStatus(status);
    switch (s) {
      case 'pending':
        return { bg: colors.orange, text: bookingStatusLabel(status) };
      case 'confirmed':
        return { bg: colors.green, text: bookingStatusLabel(status) };
      case 'in_progress':
        return { bg: colors.green, text: bookingStatusLabel(status) };
      case 'completed':
        return { bg: colors.textSecondary, text: bookingStatusLabel(status) };
      case 'cancelled':
        return { bg: colors.error, text: bookingStatusLabel(status) };
      default:
        return { bg: colors.border, text: bookingStatusLabel(status) };
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const openMaps = (address: string) => {
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  };

  const openChat = async (providerId: string, providerUserId: string) => {
    try {
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API}/chat/conversations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: providerUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        const conversationId = data.data?.id ?? data.id;
        router.push(`/(shared)/chat/${conversationId}` as any);
      }
    } catch {
    }
  };

  const emptyText = () => {
    if (activeTab === 'upcoming') return t('appointmentsEmpty');
    if (activeTab === 'completed') return t('appointmentsEmptyCompleted');
    return t('appointmentsEmptyCancelled');
  };

  const renderCard = ({ item }: { item: any }) => {
    const provider = item.provider || {};
    const user = provider.user || {};
    const providerName = provider.businessName || (user.firstName ? `${user.firstName} ${user.lastName}` : t('providerGeneric'));
    const avatarUri = user.avatarUrl as string | undefined;
    const address = item.address ? `${item.address.street || ''} ${item.address.houseNumber || ''}, ${item.address.city || ''}`.trim() : (user.city as string | undefined);
    
    const serviceNames = item.services && item.services.length > 0
      ? item.services.map((s: any) => s.name).join(', ')
      : t('selectedServicesGeneric');
      
    const badge = getBadgeProps(item.status);

    return (
      <TouchableOpacity 
        style={[styles.card, { borderLeftColor: getBorderColor(item.status) }]}
        onPress={() => router.push(`/(client)/appointments/${item.id}` as any)}
        activeOpacity={0.9}
      >
        {/* ROW 1: Provider Info + Status Badge */}
        <View style={styles.cardHeader}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Feather name="user" size={24} color={colors.textTertiary} />
            </View>
          )}
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
          <Text style={styles.priceText}>€{formatAmount(item.totalPrice, lang)}</Text>
        </View>

        {/* ROW 3: Date & Time */}
        <Text style={styles.dateTimeText}>
          {formatDate(item.scheduledDate)}, {item.scheduledTime}{t('timeSuffix')}
        </Text>

        {/* ROW 4: Action Buttons */}
        <View style={styles.actionsRow}>
          {!!address && (
            <TouchableOpacity style={styles.actionButton} onPress={() => openMaps(address)}>
              <Feather name="map-pin" size={16} color={colors.primary} style={styles.actionIcon} />
              <Text style={styles.actionButtonText}>{t('appointmentsRoute')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={() => openChat(provider.id, provider.userId || provider.user?.id)}>
            <Feather name="message-circle" size={16} color={colors.primary} style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>{t('profileMessage')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('appointmentsTitle')}</Text>
      </View>

      {/* Tab Filter Pills */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          <TouchableOpacity 
            style={[styles.tabPill, activeTab === 'upcoming' ? styles.tabPillActive : styles.tabPillInactive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabPillText, activeTab === 'upcoming' ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
              {t('appointmentsUpcoming')} {activeTab === 'upcoming' ? `(${bookings.length})` : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabPill, activeTab === 'completed' ? styles.tabPillActive : styles.tabPillInactive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabPillText, activeTab === 'completed' ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
              {t('appointmentsCompleted')} {activeTab === 'completed' ? `(${bookings.length})` : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabPill, activeTab === 'cancelled' ? styles.tabPillActive : styles.tabPillInactive]}
            onPress={() => setActiveTab('cancelled')}
          >
            <Text style={[styles.tabPillText, activeTab === 'cancelled' ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
              {t('appointmentsCancelled')} {activeTab === 'cancelled' ? `(${bookings.length})` : ''}
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
  avatarFallback: { backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
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
