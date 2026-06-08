import type { Conversation, Message, OtherUser } from '@/types/chat';
import { apiJson } from './apiClient';

type ConversationListResponse =
  | Conversation[]
  | {
      data?: Conversation[] | null;
    };

type ConversationMessagesResponse =
  | {
      messages?: Message[] | null;
      otherUser?: OtherUser | null;
      myUserId?: string | null;
    }
  | {
      data?: {
        messages?: Message[] | null;
        otherUser?: OtherUser | null;
        myUserId?: string | null;
      } | null;
    };

type ConversationMessagesPayload = {
  messages?: Message[] | null;
  otherUser?: OtherUser | null;
  myUserId?: string | null;
};

export class ChatService {
  static async getConversations(): Promise<Conversation[]> {
    const data = await apiJson<ConversationListResponse>('/chat/conversations', { auth: true });
    const conversationList = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
        ? data.data
        : [];
    return Array.isArray(conversationList) ? conversationList : [];
  }

  static async getMessages(conversationId: string): Promise<{
    messages: Message[];
    otherUser: OtherUser | null;
    myUserId: string;
  }> {
    const data = await apiJson<ConversationMessagesResponse>(
      `/chat/conversations/${conversationId}`,
      { auth: true },
    );
    const payload = (
      'data' in data && data.data ? data.data : data
    ) as ConversationMessagesPayload;
    return {
      messages: Array.isArray(payload.messages) ? payload.messages : [],
      otherUser: payload.otherUser ?? null,
      myUserId: payload.myUserId ?? '',
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
    void messageId;
    await ChatService.markAllMessagesAsRead(conversationId);
  }

  static async markAllMessagesAsRead(conversationId: string): Promise<void> {
    await apiJson(`/chat/conversations/${conversationId}/read`, {
      auth: true,
      method: 'POST',
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
