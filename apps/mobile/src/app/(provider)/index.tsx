import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { tokenStorage } from '../../utils/token-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.2.85:3000/api/v1';

export default function ProviderDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    nextAppointmentTime: '--:--',
    weeklyNewBookings: 0,
    avgRating: 0.0,
  });
  const [todayBookings, setTodayBookings] = useState<any[]>([]);

  useEffect(() => {
    const guard = async () => {
      const token = await tokenStorage.getAccessToken();
      const role = await tokenStorage.getUserRole();
      if (!token || role !== 'provider') {
        router.replace('/(auth)/login?role=provider');
        return;
      }
      try {
        const res = await fetch(
          `${API_URL}/providers/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status === 404) {
          router.replace('/(provider)/register/type');
          return;
        }
        if (!res.ok) {
          router.replace('/(auth)/login?role=provider');
          return;
        }
        const provider = await res.json();
        if (provider.status?.toLowerCase() !== 'approved') {
          router.replace('/(provider)/pending');
        }
      } catch {
        router.replace('/(auth)/login?role=provider');
      }
    };
    guard();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await tokenStorage.getAccessToken();
      
      // Load stats and bookings in parallel
      const [providerRes, statsRes, bookingsRes] = await Promise.all([
        fetch(`${API_URL}/providers/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/providers/me/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/bookings?today=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (providerRes.ok) {
        const providerData = await providerRes.json();
        setProvider(providerData);
        setIsOnline(providerData.isOnline ?? false);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setTodayBookings(bookingsData.data || []);
      }
    } catch (error) {
      console.log('Error loading dashboard data:', error);
      setError('Fehler beim Laden der Daten.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus); // Optimistic update
    setIsTogglingOnline(true);
    
    try {
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API_URL}/providers/me/availability`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isOnline: newStatus })
      });

      if (!response.ok) {
        throw new Error();
      }
    } catch (error) {
      setIsOnline(!newStatus); // Revert on error
      console.log('Error updating availability:', error);
    } finally {
      setIsTogglingOnline(false);
    }
  };

  const startBooking = async (id: string) => {
    try {
      const token = await tokenStorage.getAccessToken();
      const response = await fetch(`${API_URL}/bookings/${id}/start`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadData(); // Reload to get updated status
      }
    } catch (error) {
      console.log('Error starting booking:', error);
    }
  };

  const getTodayDateString = () => {
    const today = new Date();
    return today.toLocaleDateString('de-DE', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Willkommen zurück, {provider?.businessName || provider?.firstName || 'Anbieter'}!</Text>
          <Text style={styles.date}>{getTodayDateString()}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.push('/(shared)/notifications')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ padding: 8 }}
          >
            <Feather name="bell" size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(provider)/settings')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ padding: 8 }}
          >
            <Feather name="settings" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Availability Toggle */}
        <View style={[styles.availabilityCard, isOnline ? styles.availabilityOnline : styles.availabilityOffline]}>
          <View style={styles.availabilityInfo}>
            <Text style={[styles.availabilityTitle, { color: isOnline ? colors.green : colors.error }]}>
              {isOnline ? 'Verfügbar' : 'Nicht verfügbar'}
            </Text>
            <Text style={styles.availabilitySub}>
              {isOnline ? 'Kunden können dich jetzt buchen' : 'Du nimmst keine Buchungen an'}
            </Text>
          </View>
          <Switch
            trackColor={{ false: colors.borderStrong, true: colors.green }}
            thumbColor={colors.background}
            ios_backgroundColor={colors.borderStrong}
            onValueChange={toggleAvailability}
            value={isOnline}
            disabled={isTogglingOnline}
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(provider)/calendar')}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.coralLight }]}>
              <Feather name="calendar" size={20} color={colors.coral} />
            </View>
            <Text style={styles.statValue}>{stats?.todayAppointments ?? 0}</Text>
            <Text style={styles.statLabel}>Heute's Termine</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(provider)/reviews')}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF8E1' }]}>
              <Feather name="star" size={20} color={colors.gold} />
            </View>
            <View style={styles.ratingContainer}>
              <Text style={styles.statValue}>{stats?.avgRating ? `${stats.avgRating}` : '—'}</Text>
              <Feather name="star" size={16} color={colors.gold} style={{ marginLeft: 4, marginTop: 4 }} />
            </View>
            <Text style={styles.statLabel}>Bewertung</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => {}}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.tealLight }]}>
              <Feather name="trending-up" size={20} color={colors.teal} />
            </View>
            <Text style={[styles.statValue, { color: colors.teal }]}>{stats?.weeklyNewBookings ? `+${stats.weeklyNewBookings}` : '+0'}</Text>
            <Text style={styles.statLabel}>Diese Woche</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(provider)/calendar')}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Feather name="clock" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { fontSize: fontSizes.xl }]}>{stats?.nextAppointmentTime ?? '—'}</Text>
            <Text style={styles.statLabel}>Nächster Termin</Text>
          </TouchableOpacity>
        </View>

        {/* Schedule Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Heutiger Zeitplan</Text>
          <TouchableOpacity onPress={() => router.push('/(provider)/calendar')}>
            <Text style={styles.linkText}>Kalender öffnen</Text>
          </TouchableOpacity>
        </View>

        {todayBookings.length > 0 ? (
          todayBookings.map((booking) => (
            <TouchableOpacity 
              key={booking.id} 
              style={styles.bookingCard}
              onPress={() => router.push(`/(provider)/appointments/${booking.id}`)}
            >
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingTime}>
                  {booking.scheduledTime || '—'}
                </Text>
                <View style={[
                  styles.statusBadge, 
                  booking.status === 'CONFIRMED' ? { backgroundColor: colors.greenLight } : 
                  booking.status === 'IN_PROGRESS' ? { backgroundColor: colors.orangeLight } : {}
                ]}>
                  <Text style={[
                    styles.statusText,
                    booking.status === 'CONFIRMED' ? { color: colors.green } : 
                    booking.status === 'IN_PROGRESS' ? { color: colors.orange } : {}
                  ]}>
                    {booking.status === 'CONFIRMED' ? 'Bestätigt' : 
                     booking.status === 'IN_PROGRESS' ? 'Aktiv' : booking.status}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.clientName}>{booking.client?.firstName} {booking.client?.lastName}</Text>
              <Text style={styles.serviceName}>{booking.services?.[0]?.name || 'Service'} {booking.totalPrice ? `· €${Number(booking.totalPrice).toFixed(0)}` : ''}</Text>
              
              <View style={styles.bookingActions}>
                {booking.status === 'CONFIRMED' && (
                  <View style={styles.actionBtnContainer}>
                    <PrimaryButton 
                      label="Starten" 
                      onPress={() => startBooking(booking.id)}
                      variant="filled"
                    />
                  </View>
                )}
                <View style={[styles.actionBtnContainer, booking.status === 'CONFIRMED' && { marginLeft: spacing.sm }]}>
                  <PrimaryButton 
                    label="Nachricht" 
                    onPress={() => router.push('/(provider)/chat')}
                    variant="outline"
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptySlotCard}>
            <Text style={styles.emptySlotText}>Keine weiteren Termine heute</Text>
          </View>
        )}

        {/* Quick Links */}
        <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Schnellzugriff</Text>
        </View>

        <View style={styles.quickLinksRow}>
          <TouchableOpacity style={styles.quickLinkCard} onPress={() => router.push('/(provider)/services')}>
            <View style={[styles.quickLinkIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 24 }}>💼</Text>
            </View>
            <Text style={styles.quickLinkLabel}>Services</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickLinkCard} onPress={() => router.push('/(provider)/calendar')}>
            <View style={[styles.quickLinkIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 24 }}>📅</Text>
            </View>
            <Text style={styles.quickLinkLabel}>Kalender</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1 },
  greeting: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary, marginBottom: 2 },
  date: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  headerRight: { flexDirection: 'row', gap: spacing.sm },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral },

  scrollContainer: { padding: spacing.lg, paddingBottom: 100 },

  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  availabilityOnline: { backgroundColor: colors.greenLight, borderLeftColor: colors.green },
  availabilityOffline: { backgroundColor: '#FFEBEE', borderLeftColor: colors.error },
  availabilityInfo: { flex: 1, paddingRight: spacing.md },
  availabilityTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, marginBottom: 2 },
  availabilitySub: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: { fontFamily: fonts.heading, fontSize: fontSizes.xxl, color: colors.textPrimary },
  statLabel: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: 4 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.textPrimary },
  linkText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.teal },

  bookingCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.green,
    ...shadows.card,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  bookingTime: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 10 },
  clientName: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.md, color: colors.textPrimary, marginBottom: 2 },
  serviceName: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
  
  bookingActions: { flexDirection: 'row' },
  actionBtnContainer: { flex: 1, height: 40 }, // Using container to restrict button height if needed

  emptySlotCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textTertiary },

  quickLinksRow: { flexDirection: 'row', gap: spacing.md },
  quickLinkCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.card,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickLinkLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textPrimary },
});
