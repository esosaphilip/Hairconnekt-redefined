import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import { tokenStorage } from '../../../utils/token-storage';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, spacing, borderRadius, shadows } from '../../../theme';
import { API } from '../../../utils/api';

export default function ClientProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  // BUG 4: bump this after upload to force React Native to re-render the Image
  const [avatarVersion, setAvatarVersion] = useState(Date.now());

  const fetchUser = async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      setIsLoading(true);
      const res = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data?.data || res.data);
    } catch (err) {
      console.log('Failed to fetch user', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Berechtigung erforderlich', 'Wir benötigen Zugriff auf deine Fotos, um ein Profilbild hochzuladen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      exif: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadAvatar(result.assets[0]);
    }
  };

  const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setIsUploadingAvatar(true);
      const token = await tokenStorage.getAccessToken();
      
      const formData = new FormData();
      const filename = asset.uri.split('/').pop() ?? 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

      formData.append('avatar', {
        uri: asset.uri,
        name: filename,
        type: mimeType,
      } as any);

      const res = await fetch(`${API}/users/me/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // BUG 8: do NOT set Content-Type; RN sets it with the boundary automatically
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      const data = await res.json();
      // update local state immediately with R2 URL
      setUser((prev: any) => prev ? { ...prev, avatarUrl: data.avatarUrl } : prev);
      // BUG 4: bust the image cache so UI refreshes
      setAvatarVersion(Date.now());
    } catch (err) {
      Alert.alert('Fehler', 'Das Bild konnte nicht hochgeladen werden.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: async () => {
        await tokenStorage.clear();
        router.replace('/(auth)/login');
      } }
    ]);
  };

  const handleProviderSwitch = async () => {
    if (user && user.role === 'provider') {
      await tokenStorage.setUserRole('provider');
      router.replace('/(provider)' as any);
    } else {
      router.push('/(provider)/register/type');
    }
  };

  // BUG 2: R2 always returns full https:// URLs — use directly, no prefix logic needed
  const avatarUri = user?.avatarUrl as string | undefined;
  const fullName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Kunde';
  const email = user?.email || '';
  const phone = user?.phone || '';
  const emailVerified = user?.isEmailVerified;
  const phoneVerified = user?.isPhoneVerified;

  if (isLoading && !user) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Feather name="settings" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarContainer}>
            {isUploadingAvatar ? (
              <View style={styles.avatarLoader}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : avatarUri ? (
              <Image
                key={`avatar-${avatarVersion}`}
                source={{ uri: avatarUri }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Feather name="camera" size={16} color={colors.surface} />
            </View>
          </TouchableOpacity>

          <Text style={styles.fullName}>{fullName}</Text>
          {!!email && <Text style={styles.contactText}>{email}</Text>}
          {!!phone && <Text style={styles.contactText}>{phone}</Text>}

          {/* Verification Badges */}
          <View style={styles.verificationRow}>
            {emailVerified && (
              <View style={styles.badge}>
                <Feather name="check" size={14} color={colors.green} />
                <Text style={styles.badgeText}>E-Mail verifiziert</Text>
              </View>
            )}
            {phoneVerified && (
              <View style={styles.badge}>
                <Feather name="check" size={14} color={colors.green} />
                <Text style={styles.badgeText}>Telefon verifiziert</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <MenuItem icon="user" title="Persönliche Informationen" onPress={() => router.push('/(client)/profile/edit')} />
          <MenuItem 
            icon="map-pin" 
            title="Meine Adressen" 
            rightComponent={
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>2 gespeichert</Text>
              </View>
            }
            onPress={() => router.push('/(shared)/addresses')} 
          />
          <MenuItem icon="star" title="Meine Bewertungen" onPress={() => router.push('/(client)/profile/reviews')} />
          <MenuItem icon="calendar" title="Buchungshistorie" onPress={() => router.push('/(client)/appointments/')} />
          <MenuItem icon="heart" title="Meine Favoriten" onPress={() => router.push('/(client)/favourites')} />
        </View>

        {/* Provider Mode Card */}
        <TouchableOpacity style={styles.providerCard} onPress={handleProviderSwitch}>
          <View style={styles.providerEmojiCircle}>
            <Text style={{ fontSize: 24 }}>💇</Text>
          </View>
          <Text style={styles.providerCardText}>Zum Anbieter-Modus wechseln</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
          <Feather name="log-out" size={24} color="#C62828" />
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, title, rightComponent, onPress }: { icon: any, title: string, rightComponent?: React.ReactNode, onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Feather name={icon} size={24} color={colors.primary} />
        <Text style={styles.menuItemTitle}>{title}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {rightComponent}
        <Feather name="chevron-right" size={24} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, height: 60 },
  headerTitle: { fontFamily: 'PlayfairDisplay_500Medium', fontSize: 20, color: colors.primary },
  settingsButton: { width: 40, alignItems: 'flex-end', justifyContent: 'center' },
  
  scrollContent: { paddingBottom: 40 },
  
  profileSection: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  avatarContainer: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: colors.gold, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, position: 'relative' },
  avatar: { width: 116, height: 116, borderRadius: 58 },
  avatarPlaceholder: { width: 116, height: 116, borderRadius: 58, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 40, color: '#666' },
  avatarLoader: { width: 116, height: 116, borderRadius: 58, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  cameraIconContainer: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.surface },
  
  fullName: { fontFamily: 'PlayfairDisplay_500Medium', fontSize: 24, color: colors.primary, marginBottom: 4 },
  contactText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: '#555555', marginBottom: 2 },
  
  verificationRow: { flexDirection: 'row', gap: 12, marginTop: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  badgeText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.green },

  menuContainer: { paddingHorizontal: spacing.lg, gap: 12, marginBottom: spacing.xl },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, paddingHorizontal: spacing.md, height: 56, borderRadius: borderRadius.md, ...shadows.card },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemTitle: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textPrimary },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeCount: { backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeCountText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary },

  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F9F9', marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.teal, marginBottom: spacing.xl },
  providerEmojiCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, ...shadows.card },
  providerCardText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.teal, flex: 1 },

  logoutRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, gap: 12 },
  logoutText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#C62828' }
});
