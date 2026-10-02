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

type MobileDisplayContext = {
  address: BookingAddressParts | null | undefined;
  viewerRole: 'client' | 'provider';
  statusAllowed: boolean;
  options: BookingLocationOptions;
};

export function formatDisplayLinesMobile(
  ctx: MobileDisplayContext,
): string[] {
  const { address, viewerRole, statusAllowed, options } = ctx;
  const lines: string[] = [];

  const hasFullAddress =
    isNonEmptyString(address?.street) && isNonEmptyString(address?.houseNumber);
  const hasPostalCity =
    isNonEmptyString(address?.postalCode) || isNonEmptyString(address?.city);

  if (viewerRole === 'client') {
    lines.push(options.tAtYourAddress ?? 'Mobile service at your address');

    if (hasFullAddress) {
      const streetLineParts: string[] = [];
      streetLineParts.push(address!.street!.trim());
      if (isNonEmptyString(address?.houseNumber)) {
        streetLineParts.push(address!.houseNumber!.trim());
      }
      const streetLine = streetLineParts.join(' ');

      const cityLineParts: string[] = [];
      if (isNonEmptyString(address?.postalCode)) {
        cityLineParts.push(address!.postalCode!.trim());
      }
      if (isNonEmptyString(address?.city)) {
        cityLineParts.push(address!.city!.trim());
      }
      const cityLine = cityLineParts.join(' ');

      if (cityLine) {
        lines.push(`${streetLine}, ${cityLine}`);
      } else {
        lines.push(streetLine);
      }
    } else if (hasPostalCity) {
      const cityLineParts: string[] = [];
      if (isNonEmptyString(address?.postalCode)) {
        cityLineParts.push(address!.postalCode!.trim());
      }
      if (isNonEmptyString(address?.city)) {
        cityLineParts.push(address!.city!.trim());
      }
      lines.push(cityLineParts.join(' '));
    } else {
      lines.push(options.tNotProvided ?? 'Mobile service — address not provided');
    }
  } else {
    if (statusAllowed) {
      if (hasFullAddress) {
        const streetLineParts: string[] = [];
        streetLineParts.push(address!.street!.trim());
        if (isNonEmptyString(address?.houseNumber)) {
          streetLineParts.push(address!.houseNumber!.trim());
        }
        const streetLine = streetLineParts.join(' ');

        const cityLineParts: string[] = [];
        if (isNonEmptyString(address?.postalCode)) {
          cityLineParts.push(address!.postalCode!.trim());
        }
        if (isNonEmptyString(address?.city)) {
          cityLineParts.push(address!.city!.trim());
        }
        const cityLine = cityLineParts.join(' ');

        if (cityLine) {
          lines.push(`${streetLine}, ${cityLine}`);
        } else {
          lines.push(streetLine);
        }
      } else if (hasPostalCity) {
        const cityLineParts: string[] = [];
        if (isNonEmptyString(address?.postalCode)) {
          cityLineParts.push(address!.postalCode!.trim());
        }
        if (isNonEmptyString(address?.city)) {
          cityLineParts.push(address!.city!.trim());
        }
        lines.push(options.tNotProvided ?? 'Mobile service — address not provided');
        lines.push(cityLineParts.join(' '));
      } else {
        lines.push(options.tNotProvided ?? 'Mobile service — address not provided');
      }
    } else {
      lines.push(options.tNote ?? 'Exact address shown after accepting');

      if (hasPostalCity) {
        const cityLineParts: string[] = [];
        if (isNonEmptyString(address?.postalCode)) {
          cityLineParts.push(address!.postalCode!.trim());
        }
        if (isNonEmptyString(address?.city)) {
          cityLineParts.push(address!.city!.trim());
        }
        lines.push(cityLineParts.join(' '));
      }
    }
  }

  return lines.filter((l) => l.length > 0);
}

type StudioDisplayContext = {
  provider: BookingAddressParts | null | undefined;
  viewerRole: 'client' | 'provider';
  statusAllowed: boolean;
  options: BookingLocationOptions;
};

export function formatDisplayLinesStudio(
  ctx: StudioDisplayContext,
): string[] {
  const { provider, viewerRole, statusAllowed, options } = ctx;
  const lines: string[] = [];

  const hasFullAddress =
    isNonEmptyString(provider?.street) && isNonEmptyString(provider?.houseNumber);
  const hasPostalCity =
    isNonEmptyString(provider?.postalCode) || isNonEmptyString(provider?.city);
  const hasCity = isNonEmptyString(provider?.city);

  if (viewerRole === 'provider') {
    lines.push(options.tAtYourStudio ?? 'At your studio');

    if (hasFullAddress) {
      const streetLineParts: string[] = [];
      streetLineParts.push(provider!.street!.trim());
      if (isNonEmptyString(provider?.houseNumber)) {
        streetLineParts.push(provider!.houseNumber!.trim());
      }
      const streetLine = streetLineParts.join(' ');

      const cityLineParts: string[] = [];
      if (isNonEmptyString(provider?.postalCode)) {
        cityLineParts.push(provider!.postalCode!.trim());
      }
      if (isNonEmptyString(provider?.city)) {
        cityLineParts.push(provider!.city!.trim());
      }
      const cityLine = cityLineParts.join(' ');

      if (cityLine) {
        lines.push(`${streetLine}, ${cityLine}`);
      } else {
        lines.push(streetLine);
      }
    } else if (hasCity) {
      const cityLineParts: string[] = [];
      if (isNonEmptyString(provider?.postalCode)) {
        cityLineParts.push(provider!.postalCode!.trim());
      }
      cityLineParts.push(provider!.city!.trim());
      lines.push(cityLineParts.join(' '));
    }
  } else {
    if (statusAllowed) {
      if (hasFullAddress) {
        const streetLineParts: string[] = [];
        streetLineParts.push(provider!.street!.trim());
        if (isNonEmptyString(provider?.houseNumber)) {
          streetLineParts.push(provider!.houseNumber!.trim());
        }
        const streetLine = streetLineParts.join(' ');

        const cityLineParts: string[] = [];
        if (isNonEmptyString(provider?.postalCode)) {
          cityLineParts.push(provider!.postalCode!.trim());
        }
        if (isNonEmptyString(provider?.city)) {
          cityLineParts.push(provider!.city!.trim());
        }
        const cityLine = cityLineParts.join(' ');

        if (cityLine) {
          lines.push(`${streetLine}, ${cityLine}`);
        } else {
          lines.push(streetLine);
        }
      } else if (hasCity) {
        const cityLineParts: string[] = [];
        if (isNonEmptyString(provider?.postalCode)) {
          cityLineParts.push(provider!.postalCode!.trim());
        }
        cityLineParts.push(provider!.city!.trim());
        lines.push(cityLineParts.join(' '));
      }
    } else {
      lines.push(options.tNote ?? 'Exact address shown after accepting');

      if (hasCity) {
        const cityLineParts: string[] = [];
        if (isNonEmptyString(provider?.postalCode)) {
          cityLineParts.push(provider!.postalCode!.trim());
        }
        cityLineParts.push(provider!.city!.trim());
        lines.push(cityLineParts.join(' '));
      }
    }
  }

  return lines.filter((l) => l.length > 0);
}

export function getBookingLocation(
  booking: BookingLocationInput,
  viewerRole: 'client' | 'provider',
  options: BookingLocationOptions = {},
): BookingLocationResult {
  const isMobile = Boolean(booking?.isMobile);
  const status = booking?.status;
  const routeStatusAllowed =
    typeof status === 'string' && ALLOWED_ROUTE_STATUSES.has(status);
  const displayStatusAllowed =
    typeof status === 'string' &&
    ALLOWED_FULL_ADDRESS_DISPLAY_STATUSES.has(status);

  if (isMobile) {
    const address = booking?.address ?? null;

    const displayLines = formatDisplayLinesMobile({
      address,
      viewerRole,
      statusAllowed: displayStatusAllowed,
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
    statusAllowed: displayStatusAllowed,
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
