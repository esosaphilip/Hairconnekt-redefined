export interface BookingAddressParts {
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
}

export interface BookingLocationInput {
  isMobile?: boolean;
  status?: string;
  address?: BookingAddressParts | null;
  provider?: BookingAddressParts | null;
}

export type BookingLocationResult = {
  kind: 'mobile' | 'studio';
  traveller: 'provider' | 'client' | null;
  displayLines: string[];
  routeAddress: string | null;
};

export interface BookingLocationOptions {
  tNote?: string;
  tNotProvided?: string;
  tAtYourAddress?: string;
  tAtYourStudio?: string;
}

const ALLOWED_ROUTE_STATUSES: ReadonlySet<string> = new Set([
  'CONFIRMED',
  'IN_PROGRESS',
]);

const ALLOWED_FULL_ADDRESS_DISPLAY_STATUSES: ReadonlySet<string> = new Set([
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function hasStreetAndCity(parts: BookingAddressParts | null | undefined): boolean {
  if (!parts) return false;
  return isNonEmptyString(parts.street) && isNonEmptyString(parts.city);
}

function normaliseStatus(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  if (!s) return '';
  return s
    .replace(/[\s-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

export function formatRouteAddress(
  parts: BookingAddressParts,
): string | null {
  if (!hasStreetAndCity(parts)) {
    return null;
  }

  const street = parts.street!.trim();
  const houseNumber = isNonEmptyString(parts.houseNumber)
    ? parts.houseNumber!.trim()
    : '';
  const postalCode = isNonEmptyString(parts.postalCode)
    ? parts.postalCode!.trim()
    : '';
  const city = parts.city!.trim();

  const firstSegment = houseNumber ? `${street} ${houseNumber}` : street;
  const secondSegmentParts: string[] = [];
  if (postalCode) secondSegmentParts.push(postalCode);
  secondSegmentParts.push(city);
  const secondSegment = secondSegmentParts.join(' ');

  return `${firstSegment}, ${secondSegment}, Deutschland`;
}

function buildPlaceLines(
  parts: BookingAddressParts | null | undefined,
  showFull: boolean,
): { placeLines: string[]; hasAny: boolean } {
  const placeLines: string[] = [];

  if (showFull) {
    const firstSegParts: string[] = [];
    if (isNonEmptyString(parts?.street)) {
      firstSegParts.push(parts!.street!.trim());
      if (isNonEmptyString(parts?.houseNumber)) {
        firstSegParts.push(parts!.houseNumber!.trim());
      }
    }
    const firstSeg = firstSegParts.join(' ');

    const secondSegParts: string[] = [];
    if (isNonEmptyString(parts?.postalCode)) {
      secondSegParts.push(parts!.postalCode!.trim());
    }
    if (isNonEmptyString(parts?.city)) {
      secondSegParts.push(parts!.city!.trim());
    }
    const secondSeg = secondSegParts.join(' ');

    if (firstSeg && secondSeg) {
      placeLines.push(`${firstSeg}, ${secondSeg}`);
    } else if (firstSeg) {
      placeLines.push(firstSeg);
    } else if (secondSeg) {
      placeLines.push(secondSeg);
    }
  } else {
    const onlyCityParts: string[] = [];
    if (isNonEmptyString(parts?.postalCode)) {
      onlyCityParts.push(parts!.postalCode!.trim());
    }
    if (isNonEmptyString(parts?.city)) {
      onlyCityParts.push(parts!.city!.trim());
    }
    const onlyCity = onlyCityParts.join(' ');
    if (onlyCity) placeLines.push(onlyCity);
  }

  const hasAny =
    isNonEmptyString(parts?.street) ||
    isNonEmptyString(parts?.postalCode) ||
    isNonEmptyString(parts?.city);

  return { placeLines, hasAny };
}

type MobileDisplayContext = {
  address: BookingAddressParts | null | undefined;
  viewerRole: 'client' | 'provider';
  statusNormalised: string;
  displayStatusAllowed: boolean;
  options: BookingLocationOptions;
};

export function formatDisplayLinesMobile(
  ctx: MobileDisplayContext,
): string[] {
  const { address, viewerRole, statusNormalised, displayStatusAllowed, options } = ctx;
  const lines: string[] = [];

  const showFullAddress = viewerRole === 'client' || displayStatusAllowed;
  const { placeLines, hasAny } = buildPlaceLines(address, showFullAddress);

  if (viewerRole === 'client') {
    lines.push(options.tAtYourAddress ?? 'Mobile service at your address');
  }

  for (const l of placeLines) lines.push(l);

  if (statusNormalised === 'PENDING' && viewerRole === 'provider' && !displayStatusAllowed) {
    lines.push(options.tNote ?? 'Exact address shown after accepting');
  } else if (viewerRole === 'provider' && displayStatusAllowed && !hasAny) {
    lines.push(options.tNotProvided ?? 'Mobile service — address not provided');
  } else if (viewerRole === 'provider' && !displayStatusAllowed && statusNormalised !== 'PENDING' && !hasAny) {
    lines.push(options.tNotProvided ?? 'Mobile service — address not provided');
  } else if (viewerRole === 'client' && !hasAny) {
    lines.push(options.tNotProvided ?? 'Mobile service — address not provided');
  }

  return lines.filter((l) => l.length > 0);
}

type StudioDisplayContext = {
  provider: BookingAddressParts | null | undefined;
  viewerRole: 'client' | 'provider';
  statusNormalised: string;
  displayStatusAllowed: boolean;
  options: BookingLocationOptions;
};

export function formatDisplayLinesStudio(
  ctx: StudioDisplayContext,
): string[] {
  const { provider, viewerRole, statusNormalised, displayStatusAllowed, options } = ctx;
  const lines: string[] = [];

  const showFullProviderAddr = viewerRole === 'provider' || displayStatusAllowed;
  const { placeLines, hasAny } = buildPlaceLines(provider, showFullProviderAddr);

  if (viewerRole === 'provider') {
    lines.push(options.tAtYourStudio ?? 'At your studio');
  }

  for (const l of placeLines) lines.push(l);

  if (statusNormalised === 'PENDING' && viewerRole === 'client' && !displayStatusAllowed) {
    lines.push(options.tNote ?? 'Exact address shown after accepting');
  } else if (!hasAny) {
    // No fallback text needed for empty provider address (studio address not set)
  }

  return lines.filter((l) => l.length > 0);
}

export function getBookingLocation(
  booking: BookingLocationInput,
  viewerRole: 'client' | 'provider',
  options: BookingLocationOptions = {},
): BookingLocationResult {
  const isMobile = Boolean(booking?.isMobile);
  const statusNormalised = normaliseStatus(booking?.status);
  const routeStatusAllowed =
    statusNormalised.length > 0 &&
    ALLOWED_ROUTE_STATUSES.has(statusNormalised);
  const displayStatusAllowed =
    statusNormalised.length > 0 &&
    ALLOWED_FULL_ADDRESS_DISPLAY_STATUSES.has(statusNormalised);

  if (isMobile) {
    const address = booking?.address ?? null;

    const displayLines = formatDisplayLinesMobile({
      address,
      viewerRole,
      statusNormalised,
      displayStatusAllowed,
      options,
    });

    let routeAddress: string | null = null;
    if (
      viewerRole === 'provider' &&
      routeStatusAllowed &&
      hasStreetAndCity(address)
    ) {
      routeAddress = formatRouteAddress(address!);
    }

    return {
      kind: 'mobile',
      traveller: 'provider',
      displayLines,
      routeAddress,
    };
  }

  const providerAddr = booking?.provider ?? null;

  const displayLines = formatDisplayLinesStudio({
    provider: providerAddr,
    viewerRole,
    statusNormalised,
    displayStatusAllowed,
    options,
  });

  let routeAddress: string | null = null;
  if (
    viewerRole === 'client' &&
    routeStatusAllowed &&
    hasStreetAndCity(providerAddr)
  ) {
    routeAddress = formatRouteAddress(providerAddr!);
  }

  return {
    kind: 'studio',
    traveller: 'client',
    displayLines,
    routeAddress,
  };
}
