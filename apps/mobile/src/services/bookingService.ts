import { tokenStorage } from '../utils/token-storage';
import { API } from '../utils/api';
import { bookingStatus } from '../utils/booking-status';

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
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.providerId) queryParams.append('providerId', filters.providerId);
    if (filters.clientId) queryParams.append('clientId', filters.clientId);

    const response = await fetch(`${API}/bookings?${queryParams}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch bookings');
    }
    
    const data = await response.json();
    const bookingList = data.data || data || [];
    return Array.isArray(bookingList) ? bookingList : [];
  }

  static async getBookingById(bookingId: string): Promise<Booking> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch booking');
    }

    return response.json();
  }

  static async createBooking(bookingData: CreateBookingData): Promise<Booking> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      throw new Error('Failed to create booking');
    }

    return response.json();
  }

  static async updateBookingStatus(bookingId: string, action: string): Promise<Booking> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/bookings/${bookingId}/${action}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to ${action} booking`);
    }

    return response.json();
  }

  static async cancelBooking(bookingId: string, reason: string, notes?: string): Promise<Booking> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason, notes: notes?.trim() || undefined }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel booking');
    }

    return response.json();
  }

  static async rescheduleBooking(bookingId: string, scheduledDate: string, scheduledTime: string, reason?: string): Promise<Booking> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/bookings/${bookingId}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scheduledDate,
        scheduledTime,
        reason: reason?.trim() || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to reschedule booking');
    }

    return response.json();
  }

  static getBookingStatusColor(status: string): string {
    const normalizedStatus = bookingStatus(status);
    switch (normalizedStatus) {
      case 'confirmed':
      case 'in_progress':
        return '#2E7D32'; // Green
      case 'pending':
        return '#BF6000'; // Amber
      case 'completed':
        return '#6B6B6B'; // Gray
      case 'cancelled':
        return '#C62828'; // Red
      default:
        return '#999999'; // Default gray
    }
  }

  static getBookingStatusBadge(status: string): { bg: string; text: string } {
    const normalizedStatus = bookingStatus(status);
    switch (normalizedStatus) {
      case 'pending':
        return { bg: '#BF6000', text: 'Ausstehend' };
      case 'confirmed':
        return { bg: '#2E7D32', text: 'Bestätigt' };
      case 'in_progress':
        return { bg: '#2E7D32', text: 'Aktiv' };
      case 'completed':
        return { bg: '#6B6B6B', text: 'Abgeschlossen' };
      case 'cancelled':
        return { bg: '#C62828', text: 'Abgesagt' };
      default:
        return { bg: '#999999', text: status };
    }
  }
}
