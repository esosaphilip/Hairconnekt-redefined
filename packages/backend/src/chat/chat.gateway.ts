import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, WsException } from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ChatService } from './chat.service';
import { ChatPresenceService } from './chat-presence.service';
import { NotificationsService } from '../notifications/notifications.service';

type JoinConversationPayload = { conversationId: string };
type SendMessagePayload = { conversationId: string; content: string };
type TypingStartPayload = { conversationId: string };
type TypingStopPayload = { conversationId: string };
type MessageReadPayload = { messageId: string };

@Injectable()
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private typingTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly presence: ChatPresenceService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const payload = await this.jwtService.verifyAsync(token).catch(() => null);
    const userId = payload?.sub;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    this.presence.setOnline(userId);
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data?.userId as string | undefined;
    for (const [key, t] of this.typingTimers.entries()) {
      if (userId && key.endsWith(`:${userId}`)) {
        clearTimeout(t);
        this.typingTimers.delete(key);
      }
    }

    if (userId) {
      this.presence.setOffline(userId);
      for (const room of client.rooms) {
        if (room === client.id) continue;
        this.server.to(room).emit('presence_update', { userId, isOnline: this.presence.isOnline(userId) });
      }
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = (client.handshake as any)?.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) return authToken;

    const header = (client.handshake as any)?.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return null;
  }

  @SubscribeMessage('join_conversation')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: JoinConversationPayload,
  ): Promise<void> {
    const userId = client.data?.userId as string | undefined;
    if (!userId) throw new WsException('Nicht autorisiert.');

    const conversationId = body?.conversationId;
    if (!conversationId) return;

    const canAccess = await this.chatService.canAccessConversation(userId, conversationId);
    if (!canAccess) throw new WsException('Nicht autorisiert.');

    await client.join(conversationId);

    client.to(conversationId).emit('presence_update', { userId, isOnline: this.presence.isOnline(userId) });
    const otherUserId = await this.chatService.getOtherParticipantId(userId, conversationId);
    if (otherUserId) {
      client.emit('presence_update', { userId: otherUserId, isOnline: this.presence.isOnline(otherUserId) });
    }
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendMessagePayload,
  ): Promise<any> {
    const userId = client.data?.userId as string | undefined;
    if (!userId) throw new WsException('Nicht autorisiert.');

    const conversationId = body?.conversationId;
    const content = body?.content;
    if (!conversationId) return;

    const msg = await this.chatService.sendMessage(userId, conversationId, content);
    this.server.to(conversationId).emit('new_message', msg);

    const recipientUserId = await this.chatService.getOtherParticipantId(userId, conversationId);
    if (recipientUserId) {
      const room = this.server.sockets.adapter.rooms.get(conversationId);
      let recipientActiveInConversation = false;
      if (room) {
        for (const socketId of room) {
          const s = this.server.sockets.sockets.get(socketId);
          if ((s?.data?.userId as string | undefined) === recipientUserId) {
            recipientActiveInConversation = true;
            break;
          }
        }
      }

      if (!recipientActiveInConversation) {
        const sender = await this.userRepo.findOne({
          where: { id: userId, isActive: true },
          select: ['id', 'firstName', 'lastName'],
        });
        const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : 'HairConnekt';
        const preview =
          msg.mediaType === 'image'
            ? '📷 Bild'
            : msg.mediaType === 'document'
              ? '📎 Dokument'
              : (msg.content ?? '').slice(0, 80);

        try {
          await this.notificationsService.sendToUser({
            userId: recipientUserId,
            type: 'message_received',
            titleDe: senderName,
            titleEn: senderName,
            bodyDe: preview,
            bodyEn: preview,
            data: { screen: `/(shared)/chat/${conversationId}`, conversationId },
          });
        } catch {}
      }
    }
    return msg;
  }

  @SubscribeMessage('typing_start')
  async typingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TypingStartPayload,
  ): Promise<void> {
    const userId = client.data?.userId as string | undefined;
    if (!userId) throw new WsException('Nicht autorisiert.');

    const conversationId = body?.conversationId;
    if (!conversationId) return;

    const canAccess = await this.chatService.canAccessConversation(userId, conversationId);
    if (!canAccess) return;

    client.to(conversationId).emit('typing_indicator', { userId, isTyping: true });

    const key = `${conversationId}:${userId}`;
    const existing = this.typingTimers.get(key);
    if (existing) clearTimeout(existing);

    const t = setTimeout(() => {
      client.to(conversationId).emit('typing_indicator', { userId, isTyping: false });
      this.typingTimers.delete(key);
    }, 2000);

    this.typingTimers.set(key, t);
  }

  @SubscribeMessage('typing_stop')
  async typingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: TypingStopPayload,
  ): Promise<void> {
    const userId = client.data?.userId as string | undefined;
    if (!userId) throw new WsException('Nicht autorisiert.');

    const conversationId = body?.conversationId;
    if (!conversationId) return;

    const canAccess = await this.chatService.canAccessConversation(userId, conversationId);
    if (!canAccess) return;

    const key = `${conversationId}:${userId}`;
    const existing = this.typingTimers.get(key);
    if (existing) clearTimeout(existing);
    this.typingTimers.delete(key);

    client.to(conversationId).emit('typing_indicator', { userId, isTyping: false });
  }

  @SubscribeMessage('message_read')
  async messageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: MessageReadPayload,
  ): Promise<void> {
    const userId = client.data?.userId as string | undefined;
    if (!userId) throw new WsException('Nicht autorisiert.');

    const messageId = body?.messageId;
    if (!messageId) return;

    const updated = await this.chatService.markMessageRead(userId, messageId);
    if (!updated) return;
    this.server.to(updated.conversationId).emit('message_read', { messageId: updated.messageId, readerId: userId });
  }
}
