// src/utils/token-storage.ts
// Store sensitive auth state in OS-backed secure storage.
// Non-sensitive preferences remain in AsyncStorage.

import type { UserRole } from '@hairconnekt/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import * as SecureStore from 'expo-secure-store';

interface StoredUserShape {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  [key: string]: unknown;
}

const isUserShape = (v: unknown): v is StoredUserShape => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.email === 'string' &&
    (o.role === 'client' || o.role === 'provider' || o.role === 'admin') &&
    typeof o.firstName === 'string' &&
    typeof o.lastName === 'string'
  );
};

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

  async getUserRole(): Promise<UserRole | null> {
    const raw = await SecureStore.getItemAsync(KEYS.USER_ROLE);
    if (raw === 'client' || raw === 'provider' || raw === 'admin') return raw;
    return null;
  },

  async save(accessToken: string, refreshToken: string, role: UserRole): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
      SecureStore.setItemAsync(KEYS.USER_ROLE, role),
    ]);
  },

  /** Switch client ↔ provider mode without re-login (same keys as save). */
  async setUserRole(role: UserRole): Promise<void> {
    await SecureStore.setItemAsync(KEYS.USER_ROLE, role);
  },

  async setUser(user: unknown): Promise<void> {
    if (!isUserShape(user)) {
      return;
    }
    await SecureStore.setItemAsync(KEYS.USER_JSON, JSON.stringify(user));
  },

  async getLanguage(): Promise<'de' | 'en'> {
    const stored = (await AsyncStorage.getItem(KEYS.APP_LANGUAGE)) ?? (await AsyncStorage.getItem(KEYS.LANGUAGE));
    if (stored === 'en' || stored === 'de') {
      await AsyncStorage.setItem(KEYS.APP_LANGUAGE, stored);
      return stored;
    }
    return 'de';
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
