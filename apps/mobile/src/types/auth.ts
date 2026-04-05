export interface User {
  id: string;
  email: string;
  role: 'client' | 'provider';
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  user: User;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error?: string | null;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerify {
  email: string;
  otp: string;
}

export interface PasswordResetConfirm {
  resetToken: string;
  password: string;
}
