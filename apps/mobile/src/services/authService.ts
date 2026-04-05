import { tokenStorage } from '../utils/token-storage';
import { API } from '../utils/api';

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

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    return data;
  }

  static async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    return data;
  }

  static async logout(): Promise<void> {
    try {
      const token = await tokenStorage.getAccessToken();
      const refreshToken = await tokenStorage.getRefreshToken();

      if (refreshToken) {
        await fetch(`${API}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.log('Logout API call failed:', error);
    } finally {
      await tokenStorage.clear();
    }
  }

  static async refreshToken(): Promise<string> {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return data.accessToken;
  }

  static async getCurrentUser(): Promise<any> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const role = await tokenStorage.getUserRole();
    const endpoint = role === 'provider' ? '/providers/me' : '/users/me';

    const response = await fetch(`${API}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    return response.json();
  }
}
