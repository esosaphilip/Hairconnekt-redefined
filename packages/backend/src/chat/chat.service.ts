import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';

type ConversationListItem = {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    isOnline: boolean;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  bookingReference?: string;
};

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listConversationsForUser(userId: string): Promise<ConversationListItem[]> {
    const conversations = await this.conversationRepo.find({
      where: [{ participant1Id: userId }, { participant2Id: userId }],
      order: { updatedAt: 'DESC' },
      take: 50,
    });

    const items: ConversationListItem[] = [];

    for (const c of conversations) {
      const otherUserId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;

      const otherUser = await this.userRepo.findOne({
        where: { id: otherUserId, isActive: true },
        select: ['id', 'firstName', 'lastName', 'avatarUrl', 'phone', 'role', 'isActive'],
      });

      if (!otherUser) continue;

      const unreadCount = await this.messageRepo.count({
        where: {
          conversationId: c.id,
          isRead: false,
          senderId: otherUserId,
        },
      });

      const lastMessage = c.lastMessageAt
        ? {
            content: c.lastMessagePreview ?? '',
            createdAt: c.lastMessageAt.toISOString(),
          }
        : undefined;

      items.push({
        id: c.id,
        otherUser: {
          id: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          avatarUrl: otherUser.avatarUrl ?? undefined,
          isOnline: false,
        },
        lastMessage,
        unreadCount,
      });
    }

    return items;
  }
}

