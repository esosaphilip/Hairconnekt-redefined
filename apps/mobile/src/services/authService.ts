import { tokenStorage } from '../utils/token-storage';
import { apiFetch, apiJson } from './apiClient';
import { debugLog } from '../utils/logger';
import type { User } from '../types/user';

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: 'client' | 'provider';
  acceptedTerms: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: 'client' | 'provider';
    firstName: string;
    lastName: string;
  };
}

type CurrentUserResponse = Pick<
  User,
  'id' | 'email' | 'role' | 'firstName' | 'lastName'
>;

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiJson<AuthResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  }

  static async register(userData: RegisterData): Promise<AuthResponse> {
    return apiJson<AuthResponse>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  }

  static async logout(): Promise<void> {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();

      if (refreshToken) {
        await apiFetch('/auth/logout', {
          auth: true,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      debugLog('Logout API call failed:', error);
    } finally {
      await tokenStorage.clear();
    }
  }

  static async refreshToken(): Promise<string> {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const data = await apiJson<AuthResponse>('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    await tokenStorage.save(data.accessToken, data.refreshToken, data.user.role);
    return data.accessToken;
  }

  static async getCurrentUser(): Promise<CurrentUserResponse> {
    const role = await tokenStorage.getUserRole();
    const endpoint = role === 'provider' ? '/providers/me' : '/users/me';

    return apiJson<CurrentUserResponse>(endpoint, { auth: true });
  }
}
