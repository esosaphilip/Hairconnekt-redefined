import type { Conversation, Message, OtherUser } from '@/types/chat';
import { apiJson } from './apiClient';

export class ChatService {
  static async getConversations(): Promise<Conversation[]> {
    const data = await apiJson<any>('/chat/conversations', { auth: true });
    const conversationList = data.data || data || [];
    return Array.isArray(conversationList) ? conversationList : [];
  }

  static async getMessages(conversationId: string): Promise<{
    messages: Message[];
    otherUser: OtherUser | null;
    myUserId: string;
  }> {
    const data = await apiJson<any>(`/chat/conversations/${conversationId}/messages`, { auth: true });
    return {
      messages: data.messages || data || [],
      otherUser: data.otherUser || null,
      myUserId: data.myUserId || '',
    };
  }

  static async sendMessage(conversationId: string, content: string): Promise<Message> {
    return apiJson(`/chat/conversations/${conversationId}/messages`, {
      auth: true,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: content.trim() }),
    });
  }

  static async markMessageAsRead(conversationId: string, messageId: string): Promise<void> {
    await apiJson(`/chat/conversations/${conversationId}/messages/${messageId}/read`, {
      auth: true,
      method: 'PATCH',
    });
  }

  static async markAllMessagesAsRead(conversationId: string): Promise<void> {
    await apiJson(`/chat/conversations/${conversationId}/read`, {
      auth: true,
      method: 'PATCH',
    });
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
    return 'Unbekannt';
  }
}
