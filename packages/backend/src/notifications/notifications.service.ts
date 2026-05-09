import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';

type ExpoPushMessage = {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
};

type ExpoClient = {
  chunkPushNotifications: (messages: ExpoPushMessage[]) => ExpoPushMessage[][];
  sendPushNotificationsAsync: (messages: ExpoPushMessage[]) => Promise<any>;
};

type ExpoModule = {
  default: new (opts: { accessToken?: string }) => ExpoClient;
};

let expoModulePromise: Promise<ExpoModule> | null = null;
let expoClient: ExpoClient | null = null;
let isExpoPushTokenFn: ((token: string) => boolean) | null = null;

const importExpoServerSdk = () =>
  (new Function('return import("expo-server-sdk")')() as Promise<ExpoModule>);

const getExpoClient = async (): Promise<ExpoClient> => {
  if (expoClient) return expoClient;
  if (!expoModulePromise) expoModulePromise = importExpoServerSdk();

  const mod = await expoModulePromise;
  const ExpoClass = mod.default;
  expoClient = new ExpoClass({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  isExpoPushTokenFn = (ExpoClass as any).isExpoPushToken?.bind(ExpoClass) ?? null;
  return expoClient;
};

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
      if (!isExpoPushTokenFn) {
        await getExpoClient();
      }
      if (!isExpoPushTokenFn || !isExpoPushTokenFn(user.expoPushToken)) return;

      const message: ExpoPushMessage = {
        to: user.expoPushToken,
        title: params.titleDe,
        body: params.bodyDe,
        data: params.data,
        sound: 'default',
        badge: 1,
        channelId: 'default',
      };

      const expo = await getExpoClient();
      const chunks = expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch {
      return;
    }
  }
}
