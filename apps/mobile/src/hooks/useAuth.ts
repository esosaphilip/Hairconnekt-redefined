import { useState, useCallback, useEffect } from 'react';
import { tokenStorage } from '../utils/token-storage';
import { API } from '../utils/api';
import { debugLog } from '../utils/logger';

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
      const role = await tokenStorage.getUserRole();
      
      if (token && role) {
        // TODO: Fetch user profile based on role
        setAuthState({
          user: { id: '', email: '', role, firstName: '', lastName: '' },
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

  const login = useCallback(async (email: string, password: string) => {
    // TODO: Implement login logic
    throw new Error('Not implemented');
  }, []);

  const logout = useCallback(async () => {
    await tokenStorage.clear();
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
