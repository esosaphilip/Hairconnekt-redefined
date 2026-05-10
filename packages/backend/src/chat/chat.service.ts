import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { Provider } from '../entities/provider.entity';
import { User } from '../entities/user.entity';
import { ChatPresenceService } from './chat-presence.service';
import { R2Service } from '../common/storage/r2.service';
import { v4 as uuidv4 } from 'uuid';

type ConversationListItem = {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    isOnline: boolean;
    phone?: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  bookingReference?: string;
};

type ConversationDetail = {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    isOnline: boolean;
    phone?: string;
  };
  bookingReference: {
    id: string;
    bookingNumber: string;
    serviceName: string;
    date: string;
    status: string;
  } | null;
  messages: Array<{
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
    mediaUrl: string | null;
    mediaType: 'image' | 'document' | null;
    mediaFilename: string | null;
  }>;
  myUserId: string;
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
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly presence: ChatPresenceService,
    private readonly r2Service: R2Service,
  ) {}

  private getOtherUserId(conversation: Conversation, userId: string): string {
    return conversation.participant1Id === userId
      ? conversation.participant2Id
      : conversation.participant1Id;
  }

  private async getConversationForUserOrThrow(userId: string, conversationId: string): Promise<Conversation> {
    const convo = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!convo) {
      throw new NotFoundException('Konversation nicht gefunden.');
    }
    if (convo.participant1Id !== userId && convo.participant2Id !== userId) {
      throw new ForbiddenException('Nicht autorisiert.');
    }
    return convo;
  }

  async canAccessConversation(userId: string, conversationId: string): Promise<boolean> {
    const convo = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!convo) return false;
    return convo.participant1Id === userId || convo.participant2Id === userId;
  }

  async getOtherParticipantId(userId: string, conversationId: string): Promise<string | null> {
    const convo = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!convo) return null;
    if (convo.participant1Id !== userId && convo.participant2Id !== userId) return null;
    return this.getOtherUserId(convo, userId);
  }

  async listConversationsForUser(userId: string): Promise<ConversationListItem[]> {
    const conversations = await this.conversationRepo.find({
      where: [{ participant1Id: userId }, { participant2Id: userId }],
      order: { updatedAt: 'DESC' },
      take: 50,
    });

    const items: ConversationListItem[] = [];

    for (const c of conversations) {
      const otherUserId = this.getOtherUserId(c, userId);

      const otherUser = await this.userRepo.findOne({
        where: { id: otherUserId, isActive: true },
        select: ['id', 'firstName', 'lastName', 'avatarUrl', 'phone', 'isActive'],
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
          isOnline: this.presence.isOnline(otherUser.id),
          phone: otherUser.phone ?? undefined,
        },
        lastMessage,
        unreadCount,
      });
    }

    return items;
  }

  async createOrGetConversation(userId: string, recipientId: string): Promise<{ id: string }> {
    if (!recipientId || recipientId === userId) {
      throw new BadRequestException('Ungültiger Empfänger.');
    }

    const recipient = await this.userRepo.findOne({ where: { id: recipientId, isActive: true } });
    if (!recipient) {
      throw new NotFoundException('Empfänger nicht gefunden.');
    }

    const existing = await this.conversationRepo.findOne({
      where: [
        { participant1Id: userId, participant2Id: recipientId },
        { participant1Id: recipientId, participant2Id: userId },
      ],
    });
    if (existing) return { id: existing.id };

    const convo = this.conversationRepo.create({
      participant1Id: userId,
      participant2Id: recipientId,
      lastMessageAt: null,
      lastMessagePreview: null,
    });
    const saved = await this.conversationRepo.save(convo);
    return { id: saved.id };
  }

  async getConversationDetail(userId: string, conversationId: string): Promise<ConversationDetail> {
    const convo = await this.getConversationForUserOrThrow(userId, conversationId);
    const otherUserId = this.getOtherUserId(convo, userId);

    const otherUser = await this.userRepo.findOne({
      where: { id: otherUserId, isActive: true },
      select: ['id', 'firstName', 'lastName', 'avatarUrl', 'phone', 'isActive'],
    });
    if (!otherUser) throw new NotFoundException('Nutzer nicht gefunden.');

    const messages = await this.messageRepo.find({
      where: { conversationId: convo.id },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const bookingReference = await this.findLatestBookingReference(userId, otherUserId);

    return {
      id: convo.id,
      otherUser: {
        id: otherUser.id,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        avatarUrl: otherUser.avatarUrl ?? undefined,
        isOnline: this.presence.isOnline(otherUser.id),
        phone: otherUser.phone ?? undefined,
      },
      bookingReference,
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        createdAt: m.createdAt.toISOString(),
        isRead: m.isRead,
        mediaUrl: m.mediaUrl ?? null,
        mediaType: (m.mediaType as any) ?? null,
        mediaFilename: m.mediaFilename ?? null,
      })),
      myUserId: userId,
    };
  }

  private async findLatestBookingReference(userId: string, otherUserId: string): Promise<ConversationDetail['bookingReference']> {
    const otherUser = await this.userRepo.findOne({ where: { id: otherUserId, isActive: true } });
    if (!otherUser) return null;

    let booking: Booking | null = null;

    if (otherUser.role === 'provider') {
      const provider = await this.providerRepo.findOne({ where: { userId: otherUserId } });
      if (!provider) return null;
      booking = await this.bookingRepo.findOne({
        where: { clientId: userId, providerId: provider.id },
        order: { createdAt: 'DESC' },
        relations: ['services'],
      });
    } else {
      const myProvider = await this.providerRepo.findOne({ where: { userId } });
      if (!myProvider) return null;
      booking = await this.bookingRepo.findOne({
        where: { clientId: otherUserId, providerId: myProvider.id },
        order: { createdAt: 'DESC' },
        relations: ['services'],
      });
    }

    if (!booking) return null;

    const serviceName = Array.isArray(booking.services) && booking.services.length > 0
      ? booking.services[0].name
      : '';
    const date = new Date(`${booking.scheduledDate}T00:00:00.000Z`).toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      serviceName,
      date,
      status: booking.status,
    };
  }

  async sendMessage(userId: string, conversationId: string, content: string): Promise<ConversationDetail['messages'][number]> {
    const text = (content ?? '').trim();
    if (!text) throw new BadRequestException('Nachricht darf nicht leer sein.');
    if (text.length > 500) throw new BadRequestException('Nachricht ist zu lang.');

    const convo = await this.getConversationForUserOrThrow(userId, conversationId);

    const msg = this.messageRepo.create({
      conversationId: convo.id,
      senderId: userId,
      content: text,
      isRead: false,
      readAt: null,
    });
    const saved = await this.messageRepo.save(msg);

    const preview = text.length > 140 ? `${text.slice(0, 140)}` : text;
    convo.lastMessageAt = saved.createdAt;
    convo.lastMessagePreview = preview;
    await this.conversationRepo.save(convo);

    return {
      id: saved.id,
      content: saved.content,
      senderId: saved.senderId,
      createdAt: saved.createdAt.toISOString(),
      isRead: saved.isRead,
      mediaUrl: saved.mediaUrl ?? null,
      mediaType: (saved.mediaType as any) ?? null,
      mediaFilename: saved.mediaFilename ?? null,
    };
  }

  async sendMediaMessage(
    userId: string,
    conversationId: string,
    file: Express.Multer.File,
  ): Promise<ConversationDetail['messages'][number]> {
    if (!file) throw new BadRequestException('Keine Datei hochgeladen.');

    const mimeType = String(file.mimetype ?? '').toLowerCase();
    const isPdf = mimeType === 'application/pdf';
    const isImage = /^image\/(jpeg|png|webp)$/.test(mimeType);
    if (!isPdf && !isImage) throw new BadRequestException('Ungültiger Dateityp.');

    const convo = await this.getConversationForUserOrThrow(userId, conversationId);

    const mediaType: 'image' | 'document' = isPdf ? 'document' : 'image';
    const ext = isPdf
      ? 'pdf'
      : mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';

    const messageId = uuidv4();
    const key = `chat/${convo.id}/${messageId}-${Date.now()}.${ext}`;
    const url = await this.r2Service.uploadFileWithKey(file.buffer, mimeType, key);

    const msg = this.messageRepo.create({
      id: messageId,
      conversationId: convo.id,
      senderId: userId,
      content: '',
      isRead: false,
      readAt: null,
      mediaUrl: url,
      mediaType,
      mediaFilename: mediaType === 'document' ? file.originalname ?? null : null,
      mediaKey: key,
    });
    const saved = await this.messageRepo.save(msg);

    convo.lastMessageAt = saved.createdAt;
    convo.lastMessagePreview = mediaType === 'image' ? '📷 Bild' : '📎 Dokument';
    await this.conversationRepo.save(convo);

    return {
      id: saved.id,
      content: saved.content,
      senderId: saved.senderId,
      createdAt: saved.createdAt.toISOString(),
      isRead: saved.isRead,
      mediaUrl: saved.mediaUrl ?? null,
      mediaType: (saved.mediaType as any) ?? null,
      mediaFilename: saved.mediaFilename ?? null,
    };
  }

  async markConversationRead(
    userId: string,
    conversationId: string,
  ): Promise<{ conversationId: string; updatedCount: number }> {
    await this.getConversationForUserOrThrow(userId, conversationId);

    const result = await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true, readAt: () => 'NOW()' })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('isRead = false')
      .execute();

    return { conversationId, updatedCount: result.affected ?? 0 };
  }

  async markMessageRead(
    userId: string,
    messageId: string,
  ): Promise<{ conversationId: string; messageId: string } | null> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message) return null;

    const convo = await this.conversationRepo.findOne({ where: { id: message.conversationId } });
    if (!convo) return null;
    if (convo.participant1Id !== userId && convo.participant2Id !== userId) return null;

    if (message.senderId === userId) return null;
    if (message.isRead) return null;

    await this.messageRepo.update({ id: message.id }, { isRead: true, readAt: new Date() });
    return { conversationId: message.conversationId, messageId: message.id };
  }
}
