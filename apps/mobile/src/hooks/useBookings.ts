import { useState, useCallback, useEffect } from 'react';
import { tokenStorage } from '../utils/token-storage';
import { API } from '../utils/api';

export interface Booking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  totalPrice: number;
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

export interface BookingFilters {
  status?: string;
  limit?: number;
  page?: number;
}

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async (filters: BookingFilters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = await tokenStorage.getAccessToken();
      if (!token) throw new Error('No authentication token');

      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.page) queryParams.append('page', filters.page.toString());

      const response = await fetch(`${API}/bookings?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch bookings');
      
      const data = await response.json();
      const bookingList = data.data || data || [];
      setBookings(Array.isArray(bookingList) ? bookingList : []);
    } catch (err) {
      console.log('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBookingStatus = useCallback(async (bookingId: string, action: string) => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${API}/bookings/${bookingId}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to update booking');
      
      // Refresh bookings after update
      await fetchBookings();
    } catch (err) {
      console.log('Error updating booking:', err);
      throw err;
    }
  }, [fetchBookings]);

  return {
    bookings,
    isLoading,
    error,
    fetchBookings,
    updateBookingStatus,
  };
};
