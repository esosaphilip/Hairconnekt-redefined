import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export interface SendPushParams {
  userId: string;
  type: string;
  titleDe: string;
  titleEn: string;
  bodyDe: string;
  bodyEn: string;
  data: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async savePushToken(userId: string, token: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { expoPushToken: token });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.notifRepo.update({ id: notificationId, userId }, { isRead: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update({ userId, isRead: false }, { isRead: true });
  }

  async sendToUser(params: SendPushParams): Promise<void> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: params.userId },
        select: ['id', 'expoPushToken'],
      });
      if (!user) return;

      await this.notifRepo.save(
        this.notifRepo.create({
          userId: params.userId,
          type: params.type,
          titleDe: params.titleDe,
          titleEn: params.titleEn,
          bodyDe: params.bodyDe,
          bodyEn: params.bodyEn,
          data: params.data,
          isRead: false,
        }),
      );

      if (!user.expoPushToken) return;
      if (!Expo.isExpoPushToken(user.expoPushToken)) return;

      const message: ExpoPushMessage = {
        to: user.expoPushToken,
        title: params.titleDe,
        body: params.bodyDe,
        data: params.data,
        sound: 'default',
        badge: 1,
        channelId: 'default',
      };

      const chunks = expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch {
      return;
    }
  }
}

