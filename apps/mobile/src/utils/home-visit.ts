// Home visits (mobile bookings) are only offered by identity-verified providers.
// The backend rejects a mobile booking at an unverified provider (BUG-092), so the
// client must not even offer the switch.

export type HomeVisitProvider = {
  isVerified?: boolean | null;
};

export function canOfferHomeVisit(provider: HomeVisitProvider | null | undefined): boolean {
  return provider?.isVerified === true;
}
