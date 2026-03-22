// src/utils/token-storage.ts
// Secure token storage using AsyncStorage
// Used by AuthContext and the API service interceptor

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: 'hc_access_token',
  REFRESH_TOKEN: 'hc_refresh_token',
  USER_ROLE: 'hc_user_role',
  USER_JSON: 'hc_user',
} as const;

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
  },

  async getUserRole(): Promise<'client' | 'provider' | null> {
    return AsyncStorage.getItem(KEYS.USER_ROLE) as Promise<'client' | 'provider' | null>;
  },

  async save(accessToken: string, refreshToken: string, role: 'client' | 'provider'): Promise<void> {
    await AsyncStorage.multiSet([
      [KEYS.ACCESS_TOKEN, accessToken],
      [KEYS.REFRESH_TOKEN, refreshToken],
      [KEYS.USER_ROLE, role],
    ]);
  },

  /** Switch client ↔ provider mode without re-login (same keys as save). */
  async setUserRole(role: 'client' | 'provider'): Promise<void> {
    await AsyncStorage.setItem(KEYS.USER_ROLE, role);
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.ACCESS_TOKEN,
      KEYS.REFRESH_TOKEN,
      KEYS.USER_ROLE,
      KEYS.USER_JSON,
    ]);
  },
};
