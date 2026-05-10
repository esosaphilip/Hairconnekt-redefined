export interface OtherUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isOnline: boolean;
  phone?: string;
}

export interface BookingRef {
  id: string;
  bookingNumber: string;
  serviceName: string;
  date: string;
  status: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
  mediaUrl: string | null;
  mediaType: 'image' | 'document' | null;
  mediaFilename: string | null;
}

export interface Conversation {
  id: string;
  otherUser: OtherUser;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  bookingReference?: string;
}
