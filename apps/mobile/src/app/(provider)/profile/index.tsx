import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, fontSizes, spacing, shadows } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function ProviderProfileHubScreen() {
  const router = useRouter();
  const [provider, setProvider] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = await tokenStorage.getAccessToken();
      const [provRes, userRes] = await Promise.all([
        fetch(`${API_URL}/providers/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (provRes.ok) {
        const pData = await provRes.json();
        setProvider(pData.data || pData);
      }
      if (userRes.ok) {
        const uData = await userRes.json();
        setUser(uData.data || uData);
      }
    } catch (error) {
      console.log('Error loading provider profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Berechtigung fehlt', 'Wir benötigen Zugriff auf deine Fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setIsUploading(true);
      const token = await tokenStorage.getAccessToken();
      
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await fetch(`${API_URL}/providers/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const newUrl = data.data?.avatarUrl || uri;
        setProvider((prev: any) => ({ ...prev, avatarUrl: newUrl }));
        setUser((prev: any) => ({ ...prev, avatarUrl: newUrl }));
      } else {
        Alert.alert('Fehler', 'Das Bild konnte nicht hochgeladen werden.');
      }
    } catch (error) {
      console.log('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const switchToClientMode = async () => {
    try {
      await tokenStorage.setUserRole('client');
      router.replace('/(client)');
    } catch (error) {
      console.log('Error switching mode:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { 
          text: 'Abmelden', 
          style: 'destructive',
          onPress: async () => {
            await tokenStorage.clear();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.coral} />
      </SafeAreaView>
    );
  }

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const displayName = provider?.businessName || (fullName.length > 0 ? fullName : 'Mein Profil');

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity onPress={() => router.push('/(provider)/settings')} style={styles.headerIcon}>
          <Feather name="settings" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        
        {/* TOP SECTION */}
        <View style={styles.topSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar} disabled={isUploading}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={48} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="camera" size={16} color={colors.primary} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>{displayName}</Text>
          
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>{provider?.city || 'Nicht angegeben'}</Text>
          </View>

          {provider?.avgRating > 0 && (
            <Text style={styles.ratingText}>
              ⭐ {provider.avgRating.toFixed(1)} ({provider.totalReviews} Bewertungen)
            </Text>
          )}

          <View style={[styles.statusBadge, provider?.status?.toLowerCase() === 'approved' ? styles.statusApproved : styles.statusPending]}>
            <Text style={[styles.statusBadgeText, provider?.status?.toLowerCase() === 'approved' ? styles.statusApprovedText : styles.statusPendingText]}>
              {provider?.status?.toLowerCase() === 'approved' ? '✓ Verifiziert' : '⏳ Prüfung läuft'}
            </Text>
          </View>
        </View>

        {/* MENU CARDS */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/profile/edit')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>Profil bearbeiten</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/profile/preview')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>Profilvorschau</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/services')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>Services & Preise</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/portfolio')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>Portfolio</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/availability')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>Verfügbarkeit</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/reviews')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>Bewertungen</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/(provider)/settings')}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.menuCardText}>Einstellungen</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* SWITCH COMPONENT */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={[styles.menuCard, styles.switchModeCard]} onPress={switchToClientMode}>
            <View style={styles.menuCardLeft}>
              <Text style={styles.switchModeText}>👤 Zum Kunden-Modus wechseln</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>ABMELDEN</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
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
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },
  headerIcon: { padding: spacing.xs },

  scrollContent: { flex: 1 },
  scrollInner: { paddingBottom: 40 },

  topSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.gold,
    marginBottom: spacing.md,
    position: 'relative',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 46 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 46, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  displayName: { fontFamily: fonts.heading, fontSize: 24, color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  locationText: { fontFamily: fonts.body, fontSize: 14, color: '#555', marginLeft: 4 },
  ratingText: { fontFamily: fonts.body, fontSize: 14, color: '#555', marginBottom: spacing.sm },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: spacing.xs },
  statusApproved: { backgroundColor: '#E0F2F1' },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusBadgeText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  statusApprovedText: { color: colors.teal },
  statusPendingText: { color: '#E65100' },

  menuContainer: { paddingHorizontal: spacing.lg },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    height: 56,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  menuCardLeft: { flexDirection: 'row', alignItems: 'center' },
  menuCardText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textPrimary },
  switchModeCard: { borderWidth: 1, borderColor: colors.teal, marginTop: spacing.lg },
  switchModeText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.teal },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  logoutText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.error },
});
