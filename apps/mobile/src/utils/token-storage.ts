// src/utils/token-storage.ts
// Store sensitive auth state in OS-backed secure storage.
// Non-sensitive preferences remain in AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'hc_access_token',
  REFRESH_TOKEN: 'hc_refresh_token',
  USER_ROLE: 'hc_user_role',
  USER_JSON: 'hc_user',
  APP_LANGUAGE: 'hc_app_language',
  LANGUAGE: 'hc_language',
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

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER_ROLE),
      SecureStore.deleteItemAsync(KEYS.USER_JSON),
    ]);
  },
};
