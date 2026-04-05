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

export interface Client extends User {
  role: 'client';
  favouriteProviders?: string[];
  addresses?: Address[];
}

export interface Provider extends User {
  role: 'provider';
  businessName: string;
  description?: string;
  services?: Service[];
  portfolio?: PortfolioImage[];
  availability?: Availability[];
  averageRating?: number;
  totalReviews?: number;
  isVerified?: boolean;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  isDefault: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  category?: string;
  isActive: boolean;
}

export interface PortfolioImage {
  id: string;
  imageUrl: string;
  caption?: string;
  order?: number;
}

export interface Availability {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  serviceName: string;
  client?: {
    name: string;
    avatarUrl?: string;
  };
  provider?: {
    businessName: string;
    avatarUrl?: string;
  };
  response?: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  language: 'de' | 'en';
  theme: 'light' | 'dark' | 'auto';
}
