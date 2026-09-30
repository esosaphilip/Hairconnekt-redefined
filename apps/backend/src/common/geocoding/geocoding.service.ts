import { Injectable, Logger } from '@nestjs/common';

export type GeocodeCoordinates = {
  lat: number;
  lng: number;
};

export type GeocodeResult =
  | { status: 'success'; coordinates: GeocodeCoordinates }
  | { status: 'not_found' }
  | { status: 'error' };

export type GeocodeAddressInput = {
  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;
  country?: string;
};

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly baseUrl =
    process.env.GEOCODING_BASE_URL ??
    'https://nominatim.openstreetmap.org/search';
  private readonly userAgent =
    process.env.GEOCODING_USER_AGENT ??
    'HairConnekt/1.0 (support@hairconnekt.de)';

  async geocodeAddress(address: GeocodeAddressInput): Promise<GeocodeResult> {
    try {
      const query = [
        `${address.street} ${address.houseNumber}`.trim(),
        `${address.postalCode} ${address.city}`.trim(),
        address.country ?? 'Deutschland',
      ]
        .filter(Boolean)
        .join(', ');

      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
        addressdetails: '0',
        countrycodes: 'de',
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(`Geocoding request failed with ${response.status}`);
        return { status: 'error' };
      }

      const payload = (await response.json()) as Array<{
        lat?: string;
        lon?: string;
      }>;

      if (!Array.isArray(payload) || payload.length === 0) {
        return { status: 'not_found' };
      }

      const lat = Number(payload[0].lat);
      const lng = Number(payload[0].lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        this.logger.warn('Geocoding response did not contain valid coordinates');
        return { status: 'error' };
      }

      return {
        status: 'success',
        coordinates: { lat, lng },
      };
    } catch (error) {
      this.logger.warn(
        `Geocoding request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { status: 'error' };
    }
  }
}
