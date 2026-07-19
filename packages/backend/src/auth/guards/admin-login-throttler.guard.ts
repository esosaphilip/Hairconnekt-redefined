import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class AdminLoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const rawIdentifier = req?.body?.identifier;
    const normalizedIdentifier =
      typeof rawIdentifier === 'string' && rawIdentifier.trim() !== ''
        ? rawIdentifier.trim().toLowerCase()
        : null;

    if (normalizedIdentifier) {
      return `admin:${normalizedIdentifier}`;
    }

    return `admin-ip:${await super.getTracker(req)}`;
  }

  protected async getErrorMessage(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<string> {
    return 'Zu viele Admin-Anmeldeversuche. Bitte versuche es später erneut.';
  }
}
