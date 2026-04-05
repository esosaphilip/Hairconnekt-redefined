export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  category?: string;
  isActive: boolean;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  totalPrice: number;
  bookingNumber: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  services: Service[];
  client?: Client;
  provider?: Provider;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Provider {
  id: string;
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isOnline: boolean;
}

export interface CreateBookingData {
  providerId: string;
  services: string[];
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
}

export interface BookingFilters {
  status?: BookingStatus | string;
  limit?: number;
  page?: number;
  providerId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
}

export interface BookingAction {
  type: 'confirm' | 'start' | 'complete' | 'cancel' | 'reschedule';
  bookingId: string;
  data?: {
    reason?: string;
    notes?: string;
    scheduledDate?: string;
    scheduledTime?: string;
  };
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}
