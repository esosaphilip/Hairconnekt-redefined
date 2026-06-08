import * as Location from 'expo-location';
import * as Sentry from '@sentry/react-native';
import { tokenStorage } from '@/utils/token-storage';

export type DiscoveryCoordinates = {
  lat: number;
  lng: number;
};

type DiscoveryOverride = DiscoveryCoordinates & { city: string };

let cachedCoordinates: DiscoveryCoordinates | null = null;
let cachedOverride: DiscoveryOverride | null = null;
let cachedPermissionDenied = false;
let inflightRequest: Promise<DiscoveryCoordinates | null> | null = null;

async function loadOverride(): Promise<DiscoveryOverride | null> {
  if (cachedOverride) return cachedOverride;
  try {
    const override = await tokenStorage.getDiscoveryOverride();
    if (!override) return null;
    cachedOverride = {
      city: override.city,
      lat: override.lat,
      lng: override.lng,
    };
    return cachedOverride;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}

export async function setDiscoveryOverride(
  override: DiscoveryOverride | null,
): Promise<void> {
  cachedOverride = override;
  try {
    await tokenStorage.setDiscoveryOverride(override);
  } catch (error) {
    Sentry.captureException(error);
  }
}

export async function getDiscoveryOverride(): Promise<DiscoveryOverride | null> {
  return loadOverride();
}

async function resolveDiscoveryCoordinates(): Promise<DiscoveryCoordinates | null> {
  try {
    const existingPermission = await Location.getForegroundPermissionsAsync();
    let status = existingPermission.status;

    if (status !== 'granted') {
      const requestedPermission = await Location.requestForegroundPermissionsAsync();
      status = requestedPermission.status;
    }

    if (status !== 'granted') {
      cachedPermissionDenied = true;
      return null;
    }

    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown?.coords) {
      cachedCoordinates = {
        lat: lastKnown.coords.latitude,
        lng: lastKnown.coords.longitude,
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    cachedCoordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    cachedPermissionDenied = false;
    return cachedCoordinates;
  } catch (error) {
    Sentry.captureException(error);
    return cachedCoordinates;
  } finally {
    inflightRequest = null;
  }
}

export async function getDiscoveryCoordinates(
  forceRefresh = false,
): Promise<DiscoveryCoordinates | null> {
  const override = await loadOverride();
  if (override) {
    cachedCoordinates = { lat: override.lat, lng: override.lng };
    return cachedCoordinates;
  }

  if (!forceRefresh && cachedCoordinates) {
    return cachedCoordinates;
  }

  if (!forceRefresh && cachedPermissionDenied) {
    return null;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = resolveDiscoveryCoordinates();
  return inflightRequest;
}
