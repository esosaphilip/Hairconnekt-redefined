// packages/types/src/index.ts
// Shared TypeScript interfaces — used by both mobile app and backend
// NEVER import backend-specific code here (no NestJS decorators, no TypeORM)

export type UserRole = 'client' | 'provider';
export type ProviderType = 'freelancer' | 'salon' | 'mobile' | 'barber';
export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type CancellationPolicy = '24h' | '48h' | '72h';
export type ServicePriceType = 'fixed' | 'from';

// ─── Auth ──────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
}

// ─── Provider ─────────────────────────────────────────────────────────────
export interface ProviderSummaryDto {
  id: string;
  businessName: string;
  providerType: ProviderType;
  avatarUrl?: string;
  city: string;
  avgRating: number;
  totalReviews: number;
  distanceKm?: number;
  startingPrice: number;
  isAvailableToday: boolean;
  specialisationTags: string[];
  isFavourited: boolean;
}

export interface ProviderPublicDto extends ProviderSummaryDto {
  bio?: string;
  languages: string[];
  cancellationPolicy: CancellationPolicy;
}

// ─── Service ──────────────────────────────────────────────────────────────
export interface ServiceDto {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
  durationMin: number;
  durationLabel: string;
  priceType: ServicePriceType;
  price: number;
  isActive: boolean;
}

export interface ServiceCategoryDto {
  id: string;
  name: string;
}

// ─── Booking ──────────────────────────────────────────────────────────────
export interface BookingResponseDto {
  id: string;
  bookingNumber: string; // HC-YYYYMMDD-XXXX
  status: BookingStatus;
  isMobile: boolean;
  clientNotes?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid';
  platformFeePercent: number;
  platformFeeAmount: number;
  providerPayout: number;
  provider: {
    id: string;
    businessName: string;
    avatarUrl?: string;
    city: string;
    phone?: string;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    isVerified: boolean;
    totalBookings: number;
  };
  services: { id: string; name: string; price: number; durationMin: number }[];
  address?: {
    street: string;
    houseNumber: string;
    city: string;
    postalCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Review ───────────────────────────────────────────────────────────────
export interface ReviewDto {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  serviceName: string;
  client: { firstName: string; lastName: string; avatarUrl?: string };
  providerResponse?: string;
  respondedAt?: string;
}

export interface ReviewsSummaryDto {
  summary: {
    avgRating: number;
    totalReviews: number;
    ratingDistribution: Record<string, number>;
  };
  data: ReviewDto[];
  meta: PaginationMeta;
}

// ─── Slot ─────────────────────────────────────────────────────────────────
export interface SlotDto {
  time: string; // HH:mm
  available: boolean;
}

// ─── Pagination ───────────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Chat ─────────────────────────────────────────────────────────────────
export interface MessageDto {
  id: string;
  conversationId?: string;
  senderId: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'document' | null;
  mediaFilename?: string | null;
}

export interface ConversationDto {
  id: string;
  participant1: UserDto;
  participant2: UserDto;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  messages?: MessageDto[];
}

// ─── Standard Error ───────────────────────────────────────────────────────
export interface ApiError {
  statusCode: number;
  message: string;
  errors?: { field: string; message: string }[];
  timestamp: string;
  path: string;
}
