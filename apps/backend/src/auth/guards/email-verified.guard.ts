import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ALLOW_ONBOARDING_KEY = 'allowOnboarding';

/**
 * EmailVerifiedGuard — defense-in-depth authorization condition.
 *
 * Rules (evaluated in order):
 *  1. If route is marked with @AllowOnboarding() AND user.scope === 'onboarding' → pass.
 *     (Intended ONLY for the four provider-registration wizard routes, which
 *      receive a narrow 15-min onboarding JWT with no refresh token.)
 *  2. Else if user.isEmailVerified === true → pass.
 *  3. Else → UnauthorizedException with localized German message.
 *
 * Must be listed AFTER JwtAuthGuard so the user is populated on the request.
 *
 * Do NOT apply to:
 *   /auth/verify-email, /auth/resend-verification, /auth/logout,
 *   /auth/forgot-password, /auth/verify-otp, /auth/reset-password
 *   /auth/admin-logout
 * (those routes are either pre-verification, public, or deliberately not
 *  JWT-authenticated in the first place — the above list excludes routes
 *  without JwtAuthGuard entirely.)
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: any = request.user;

    if (!user) {
      throw new UnauthorizedException('Nicht autorisiert. Bitte melde dich erneut an.');
    }

    const allowOnboarding = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ONBOARDING_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowOnboarding === true && user.scope === 'onboarding') {
      return true;
    }

    if (user.isEmailVerified !== true) {
      throw new UnauthorizedException(
        'Bitte bestätige zuerst deine E-Mail-Adresse, um fortzufahren.',
      );
    }

    return true;
  }
}
