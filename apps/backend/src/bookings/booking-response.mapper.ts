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

  // Remove the four raw snapshot columns for all callers (address object is the only supported shape)
  delete raw.addressStreet;
  delete raw.addressHouseNumber;
  delete raw.addressCity;
  delete raw.addressPostalCode;

  const actorId = actor?.id || actor?.sub;
  const actorRole = actor?.role;

  const isCallerClient =
    Boolean(actorRole && (actorRole === UserRole.CLIENT || actorRole === 'client')) &&
    Boolean(actorId && (booking.clientId === actorId || booking.client?.id === actorId));

  const isCallerProvider =
    Boolean(actorRole && (actorRole === UserRole.PROVIDER || actorRole === 'provider'));

  const isConfirmedStatus =
    booking.status === BookingStatus.CONFIRMED ||
    booking.status === BookingStatus.IN_PROGRESS ||
    booking.status === BookingStatus.COMPLETED ||
    (booking.status as string) === 'CONFIRMED' ||
    (booking.status as string) === 'IN_PROGRESS' ||
    (booking.status as string) === 'COMPLETED';

  // Map client's mobile-booking address based on privacy rules:
  // - Client who owns the booking: full address unchanged
  // - Provider: full address when CONFIRMED/IN_PROGRESS/COMPLETED; street & houseNumber null when PENDING/CANCELLED/etc.
  // - No address (e.g. studio booking): null
  let mappedAddress: any = null;
  if (raw.address) {
    if (isCallerClient) {
      mappedAddress = {
        street: raw.address.street ?? '',
        houseNumber: raw.address.houseNumber ?? '',
        postalCode: raw.address.postalCode ?? '',
        city: raw.address.city ?? '',
      };
    } else if (isCallerProvider) {
      if (isConfirmedStatus) {
        mappedAddress = {
          street: raw.address.street ?? '',
          houseNumber: raw.address.houseNumber ?? '',
          postalCode: raw.address.postalCode ?? '',
          city: raw.address.city ?? '',
        };
      } else {
        mappedAddress = {
          street: null,
          houseNumber: null,
          postalCode: raw.address.postalCode ?? '',
          city: raw.address.city ?? '',
        };
      }
    } else if (actorRole === UserRole.ADMIN || actorRole === 'admin') {
      mappedAddress = {
        street: raw.address.street ?? '',
        houseNumber: raw.address.houseNumber ?? '',
        postalCode: raw.address.postalCode ?? '',
        city: raw.address.city ?? '',
      };
    } else {
      mappedAddress = {
        street: null,
        houseNumber: null,
        postalCode: raw.address.postalCode ?? '',
        city: raw.address.city ?? '',
      };
    }
  } else {
    mappedAddress = null;
  }

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
    address: mappedAddress,
    ...(mappedProvider !== undefined ? { provider: mappedProvider } : {}),
    ...(mappedClient !== undefined ? { client: mappedClient } : {}),
    services: booking.services ?? raw.services ?? [],
  };
}
