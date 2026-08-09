import { BadRequestException } from '@nestjs/common';

export const MAX_PAGE_SIZE = 50 as const;

export function parsePagination(
  pageStr: unknown,
  limitStr: unknown,
): { page: number; limit: number } {
  const page = Math.max(1, Number(pageStr ?? '1') || 1);
  const limitRaw = Number(
    limitStr ?? (pageStr === undefined && limitStr === undefined ? undefined : '20'),
  );
  const hasExplicitLimit =
    typeof limitStr === 'string' || typeof limitStr === 'number';
  const limitFinite =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 20;
  if (hasExplicitLimit && limitFinite > MAX_PAGE_SIZE) {
    throw new BadRequestException(
      `\`limit\` darf maximal ${MAX_PAGE_SIZE} betragen.`,
    );
  }
  const limit = Math.min(limitFinite, MAX_PAGE_SIZE);
  return { page, limit };
}

export function applyServicePageSize(
  rawLimit: number,
  explicit = false,
): number {
  const safe =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20;
  if (explicit && safe > MAX_PAGE_SIZE) {
    throw new BadRequestException(
      `\`limit\` darf maximal ${MAX_PAGE_SIZE} betragen.`,
    );
  }
  return Math.min(safe, MAX_PAGE_SIZE);
}
