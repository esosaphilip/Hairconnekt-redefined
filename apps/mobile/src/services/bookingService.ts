import { bookingStatus } from '../utils/booking-status';
import { apiJson } from './apiClient';
import { colors } from '@/theme';

export interface Booking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  totalPrice: number;
  bookingNumber: string;
  services: Array<{
    id: string;
    name: string;
    durationMin: number;
    price: number;
  }>;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  provider?: {
    id: string;
    businessName: string;
    avatarUrl?: string;
  };
}

export interface CreateBookingData {
  providerId: string;
  services: string[];
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
}

export interface BookingFilters {
  status?: string;
  limit?: number;
  page?: number;
  providerId?: string;
  clientId?: string;
}

export class BookingService {
  static async getBookings(filters: BookingFilters = {}): Promise<Booking[]> {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.providerId) queryParams.append('providerId', filters.providerId);
    if (filters.clientId) queryParams.append('clientId', filters.clientId);

    const data = await apiJson<any>(`/bookings?${queryParams}`, { auth: true });
    const bookingList = data.data || data || [];
    return Array.isArray(bookingList) ? bookingList : [];
  }

  static async getBookingById(bookingId: string): Promise<Booking> {
    return apiJson(`/bookings/${bookingId}`, { auth: true });
  }

  static async createBooking(bookingData: CreateBookingData): Promise<Booking> {
    return apiJson('/bookings', {
      auth: true,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData),
    });
  }

  static async updateBookingStatus(bookingId: string, action: string): Promise<Booking> {
    return apiJson(`/bookings/${bookingId}/${action}`, {
      auth: true,
      method: 'PATCH',
    });
  }

  static async cancelBooking(bookingId: string, reason: string, notes?: string): Promise<Booking> {
    return apiJson(`/bookings/${bookingId}/cancel`, {
      auth: true,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason, notes: notes?.trim() || undefined }),
    });
  }

  static async rescheduleBooking(bookingId: string, scheduledDate: string, scheduledTime: string, reason?: string): Promise<Booking> {
    return apiJson(`/bookings/${bookingId}/reschedule`, {
      auth: true,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scheduledDate,
        scheduledTime,
        reason: reason?.trim() || undefined,
      }),
    });
  }

  static getBookingStatusColor(status: string): string {
    const normalizedStatus = bookingStatus(status);
    switch (normalizedStatus) {
      case 'confirmed':
      case 'in_progress':
        return colors.green;
      case 'pending':
        return colors.warningIcon;
      case 'completed':
        return colors.textSecondary;
      case 'no_show':
      case 'cancelled':
        return colors.error;
      default:
        return colors.textTertiary;
    }
  }

  static getBookingStatusBadge(status: string): { bg: string; text: string } {
    const normalizedStatus = bookingStatus(status);
    switch (normalizedStatus) {
      case 'pending':
        return { bg: colors.warningIcon, text: 'Ausstehend' };
      case 'confirmed':
        return { bg: colors.green, text: 'Bestätigt' };
      case 'in_progress':
        return { bg: colors.green, text: 'Aktiv' };
      case 'completed':
        return { bg: colors.textSecondary, text: 'Abgeschlossen' };
      case 'no_show':
        return { bg: colors.error, text: 'Nicht erschienen' };
      case 'cancelled':
        return { bg: colors.error, text: 'Abgesagt' };
      default:
        return { bg: colors.textTertiary, text: status };
    }
  }
}
