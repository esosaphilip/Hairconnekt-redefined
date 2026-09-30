import { SetMetadata } from '@nestjs/common';
import { ALLOW_ONBOARDING_KEY } from '../guards/email-verified.guard';

/**
 * AllowOnboarding decorator — paired with EmailVerifiedGuard.
 *
 * Applied ONLY to the four provider-registration-wizard routes that must
 * accept a scope-limited onboarding JWT (15 min, no refresh token) BEFORE
 * the user has completed email verification:
 *   - POST /users/me/avatar
 *   - POST /providers/register
 *   - POST /providers/me/id-document
 *   - POST /providers/me/portfolio
 *
 * All other routes protected by EmailVerifiedGuard will reject an onboarding-
 * scoped token even if scope='onboarding' is present, because this marker
 * will be absent and the user.isEmailVerified is still false.
 */
export const AllowOnboarding = () => SetMetadata(ALLOW_ONBOARDING_KEY, true);
