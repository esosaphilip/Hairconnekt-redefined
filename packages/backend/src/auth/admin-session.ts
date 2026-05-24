import type { Response } from 'express';

export const ADMIN_SESSION_COOKIE = 'hc_admin_session';

const isProduction = (): boolean =>
  (process.env.NODE_ENV ?? 'development') === 'production';

export const buildAdminSessionCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60 * 1000,
});

export const setAdminSessionCookie = (
  res: Response,
  accessToken: string,
): void => {
  res.cookie(
    ADMIN_SESSION_COOKIE,
    accessToken,
    buildAdminSessionCookieOptions(),
  );
};

export const clearAdminSessionCookie = (res: Response): void => {
  res.clearCookie(ADMIN_SESSION_COOKIE, {
    ...buildAdminSessionCookieOptions(),
    maxAge: undefined,
  });
};
