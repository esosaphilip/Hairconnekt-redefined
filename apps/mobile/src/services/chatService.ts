import { tokenStorage } from '../utils/token-storage';
import { API } from '../utils/api';

export interface Conversation {
  id: string;
  otherUser: {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatarUrl?: string;
    isProvider?: boolean;
    isOnline?: boolean;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  bookingReference?: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  senderType: 'client' | 'provider';
  isRead: boolean;
}

export class ChatService {
  static async getConversations(): Promise<Conversation[]> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/chat/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load conversations');
    }

    const data = await response.json();
    const conversationList = data.data || data || [];
    return Array.isArray(conversationList) ? conversationList : [];
  }

  static async getMessages(conversationId: string): Promise<{
    messages: Message[];
    otherUser: any;
    myUserId: string;
  }> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/chat/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load messages');
    }

    const data = await response.json();
    return {
      messages: data.messages || data || [],
      otherUser: data.otherUser || null,
      myUserId: data.myUserId || '',
    };
  }

  static async sendMessage(conversationId: string, content: string): Promise<Message> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: content.trim() }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  static async markMessageAsRead(conversationId: string, messageId: string): Promise<void> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/chat/conversations/${conversationId}/messages/${messageId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to mark message as read');
    }
  }

  static async markAllMessagesAsRead(conversationId: string): Promise<void> {
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API}/chat/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to mark all messages as read');
    }
  }

  static getRelativeTime(isoString: string): string {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Gestern';
    
    const d = new Date(isoString);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  }

  static formatMessageTime(isoString: string): string {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  static isUnread(conversation: Conversation): boolean {
    return conversation.unreadCount > 0;
  }

  static getDisplayName(otherUser: Conversation['otherUser']): string {
    if (otherUser?.firstName && otherUser?.lastName) {
      return `${otherUser.firstName} ${otherUser.lastName}`;
    }
    if (otherUser?.name) {
      return otherUser.name;
    }
    return 'Unbekannt';
  }
}
