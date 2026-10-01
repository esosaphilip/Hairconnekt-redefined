import { Booking, BookingStatus } from '../entities/booking.entity';
import { UserRole } from '../entities/user.entity';

export interface BookingActor {
  id?: string;
  sub?: string;
  role?: string;
}

export function toBookingResponse(
  booking: Booking,
  actor?: BookingActor | null,
): any {
  if (!booking) return booking;

  // Ensure client address snapshot is populated on booking instance
  if (typeof (booking as any).populateAddress === 'function') {
    (booking as any).populateAddress();
  }

  // Preserve all top-level booking fields exactly as returned today
  const raw: any = typeof (booking as any).toJSON === 'function'
    ? (booking as any).toJSON()
    : { ...booking };

  const actorId = actor?.id || actor?.sub;
  const actorRole = actor?.role;

  const isCallerClient =
    Boolean(actorRole && (actorRole === UserRole.CLIENT || actorRole === 'client')) &&
    Boolean(actorId && (booking.clientId === actorId || booking.client?.id === actorId));

  const isConfirmedStatus =
    booking.status === BookingStatus.CONFIRMED ||
    booking.status === BookingStatus.IN_PROGRESS ||
    booking.status === BookingStatus.COMPLETED ||
    (booking.status as string) === 'CONFIRMED' ||
    (booking.status as string) === 'IN_PROGRESS' ||
    (booking.status as string) === 'COMPLETED';

  // 1. Map nested provider using strict allowlist
  let mappedProvider: any = undefined;
  if (booking.provider) {
    const p = booking.provider;

    let mappedProviderUser: any = undefined;
    if (p.user) {
      mappedProviderUser = {
        id: p.user.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        avatarUrl: p.user.avatarUrl ?? null,
        phone: p.user.phone ?? null,
      };
    }

    mappedProvider = {
      id: p.id,
      userId: p.userId,
      businessName: p.businessName,
      providerType: p.providerType,
      bio: p.bio ?? null,
      city: p.city,
      avatarUrl: p.avatarUrl ?? null,
      avgRating: p.avgRating !== undefined && p.avgRating !== null ? Number(p.avgRating) : 0,
      totalReviews: p.totalReviews !== undefined && p.totalReviews !== null ? Number(p.totalReviews) : 0,
      cancellationPolicy: p.cancellationPolicy,
      languages: p.languages ?? null,
      serviceRadius: p.serviceRadius !== undefined && p.serviceRadius !== null ? Number(p.serviceRadius) : 25,
      experienceYears: p.experienceYears !== undefined && p.experienceYears !== null ? Number(p.experienceYears) : null,
      isOnline: Boolean(p.isOnline),
    };

    if (p.user) {
      mappedProvider.user = mappedProviderUser;
    }

    // Provider address rule:
    // provider.street, provider.houseNumber and provider.postalCode are included ONLY when BOTH are true:
    // - the caller is the CLIENT of this booking, and
    // - the booking status is CONFIRMED, IN_PROGRESS or COMPLETED.
    if (isCallerClient && isConfirmedStatus) {
      mappedProvider.street = p.street ?? '';
      mappedProvider.houseNumber = p.houseNumber ?? '';
      mappedProvider.postalCode = p.postalCode ?? '';
    }
  }

  // 2. Map nested client using strict allowlist
  let mappedClient: any = undefined;
  if (booking.client) {
    const c = booking.client;
    mappedClient = {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      avatarUrl: c.avatarUrl ?? null,
      phone: c.phone ?? null,
    };
  }

  return {
    ...raw,
    ...(mappedProvider !== undefined ? { provider: mappedProvider } : {}),
    ...(mappedClient !== undefined ? { client: mappedClient } : {}),
    services: booking.services ?? raw.services ?? [],
  };
}
