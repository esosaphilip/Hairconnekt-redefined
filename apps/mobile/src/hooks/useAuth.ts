import { useState, useCallback, useEffect } from 'react';
import { tokenStorage } from '../utils/token-storage';
import { debugLog } from '../utils/logger';
import { AuthService } from '../services/authService';

export interface User {
  id: string;
  email: string;
  role: 'client' | 'provider';
  firstName: string;
  lastName: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      
      if (token) {
        const user = await AuthService.getCurrentUser();
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      debugLog('Auth check failed:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const auth = await AuthService.login({ identifier, password });
    await tokenStorage.save(
      auth.accessToken,
      auth.refreshToken,
      auth.user.role,
    );
    setAuthState({
      user: auth.user,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
};
