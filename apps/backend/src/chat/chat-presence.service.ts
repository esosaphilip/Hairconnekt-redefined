import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatPresenceService {
  private readonly connectionsByUserId = new Map<string, number>();

  setOnline(userId: string): void {
    if (!userId) return;
    const current = this.connectionsByUserId.get(userId) ?? 0;
    this.connectionsByUserId.set(userId, current + 1);
  }

  setOffline(userId: string): void {
    if (!userId) return;
    const current = this.connectionsByUserId.get(userId) ?? 0;
    const next = current - 1;
    if (next <= 0) {
      this.connectionsByUserId.delete(userId);
      return;
    }
    this.connectionsByUserId.set(userId, next);
  }

  isOnline(userId: string): boolean {
    if (!userId) return false;
    return (this.connectionsByUserId.get(userId) ?? 0) > 0;
  }
}
