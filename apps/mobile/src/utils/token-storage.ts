// src/utils/token-storage.ts
// Store sensitive auth state in OS-backed secure storage.
// Non-sensitive preferences remain in AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'hc_access_token',
  REFRESH_TOKEN: 'hc_refresh_token',
  USER_ROLE: 'hc_user_role',
  USER_JSON: 'hc_user',
  APP_LANGUAGE: 'hc_app_language',
  LANGUAGE: 'hc_language',
  DISCOVERY_OVERRIDE: 'hc_discovery_override',
} as const;

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  async getUserRole(): Promise<'client' | 'provider' | null> {
    return SecureStore.getItemAsync(KEYS.USER_ROLE) as Promise<'client' | 'provider' | null>;
  },

  async save(accessToken: string, refreshToken: string, role: 'client' | 'provider'): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
      SecureStore.setItemAsync(KEYS.USER_ROLE, role),
    ]);
  },

  /** Switch client ↔ provider mode without re-login (same keys as save). */
  async setUserRole(role: 'client' | 'provider'): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER_ROLE, role);
  },

  async setUser(user: any): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER_JSON, JSON.stringify(user));
  },

  async getLanguage(): Promise<'de' | 'en'> {
    const stored = (await AsyncStorage.getItem(KEYS.APP_LANGUAGE)) ?? (await AsyncStorage.getItem(KEYS.LANGUAGE));
    const resolved: 'de' | 'en' = stored === 'en' ? 'en' : 'de';
    await AsyncStorage.setItem(KEYS.APP_LANGUAGE, resolved);
    return resolved;
  },

  async setLanguage(lang: 'de' | 'en'): Promise<void> {
    await AsyncStorage.setItem(KEYS.APP_LANGUAGE, lang);
  },

  async getDiscoveryOverride(): Promise<{ city: string; lat: number; lng: number } | null> {
    const raw = await AsyncStorage.getItem(KEYS.DISCOVERY_OVERRIDE);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'city' in parsed &&
        'lat' in parsed &&
        'lng' in parsed &&
        typeof (parsed as any).city === 'string' &&
        typeof (parsed as any).lat === 'number' &&
        typeof (parsed as any).lng === 'number'
      ) {
        return {
          city: (parsed as any).city,
          lat: (parsed as any).lat,
          lng: (parsed as any).lng,
        };
      }
      await AsyncStorage.removeItem(KEYS.DISCOVERY_OVERRIDE);
      return null;
    } catch (error) {
      Sentry.captureException(error);
      await AsyncStorage.removeItem(KEYS.DISCOVERY_OVERRIDE);
      return null;
    }
  },

  async setDiscoveryOverride(
    override: { city: string; lat: number; lng: number } | null,
  ): Promise<void> {
    if (!override) {
      await AsyncStorage.removeItem(KEYS.DISCOVERY_OVERRIDE);
      return;
    }
    await AsyncStorage.setItem(KEYS.DISCOVERY_OVERRIDE, JSON.stringify(override));
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER_ROLE),
      SecureStore.deleteItemAsync(KEYS.USER_JSON),
    ]);
  },
};
