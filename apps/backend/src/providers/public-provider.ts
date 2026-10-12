import { Provider, ProviderStatus } from '../entities/provider.entity';

export function isPublicProviderStatus(status: unknown): boolean {
  return status === ProviderStatus.APPROVED;
}

export const PUBLIC_PROVIDER_PROFILE_KEYS = [
  'id',
  'userId',
  'providerType',
  'businessName',
  'bio',
  'city',
  'serviceRadius',
  'languages',
  'cancellationPolicy',
  'avgRating',
  'totalReviews',
  'isOnline',
  'experienceYears',
  'avatarUrl',
  'startingPrice',
  'distanceKm',
] as const;

export function toPublicProviderProfile(
  provider: Provider,
  computed: { startingPrice: number | null; distanceKm: number | null },
): Record<(typeof PUBLIC_PROVIDER_PROFILE_KEYS)[number], unknown> {
  return {
    id: provider.id,
    // TEMPORARY (BUG-059 phase 2): live app 1.0.5 starts chats with provider.userId. Remove after chat-by-provider-id ships and old app versions are gone.
    userId: provider.userId,
    providerType: provider.providerType,
    businessName: provider.businessName,
    bio: provider.bio,
    city: provider.city,
    serviceRadius: provider.serviceRadius,
    languages: provider.languages,
    cancellationPolicy: provider.cancellationPolicy,
    avgRating: provider.avgRating,
    totalReviews: provider.totalReviews,
    isOnline: provider.isOnline,
    experienceYears: provider.experienceYears,
    avatarUrl: provider.avatarUrl,
    startingPrice: computed.startingPrice,
    distanceKm: computed.distanceKm,
  };
}
