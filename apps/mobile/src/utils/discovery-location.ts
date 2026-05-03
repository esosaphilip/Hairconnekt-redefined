import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DiscoveryCoordinates = {
  lat: number;
  lng: number;
};

type DiscoveryOverride = DiscoveryCoordinates & { city: string };

let cachedCoordinates: DiscoveryCoordinates | null = null;
let cachedOverride: DiscoveryOverride | null = null;
let cachedPermissionDenied = false;
let inflightRequest: Promise<DiscoveryCoordinates | null> | null = null;

const OVERRIDE_KEY = 'hc_discovery_override';

async function loadOverride(): Promise<DiscoveryOverride | null> {
  if (cachedOverride) return cachedOverride;
  const raw = await AsyncStorage.getItem(OVERRIDE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.city === 'string' &&
      typeof parsed.lat === 'number' &&
      typeof parsed.lng === 'number'
    ) {
      cachedOverride = { city: parsed.city, lat: parsed.lat, lng: parsed.lng };
      return cachedOverride;
    }
  } catch {}
  return null;
}

export async function setDiscoveryOverride(
  override: DiscoveryOverride | null,
): Promise<void> {
  cachedOverride = override;
  if (!override) {
    await AsyncStorage.removeItem(OVERRIDE_KEY);
    return;
  }
  await AsyncStorage.setItem(OVERRIDE_KEY, JSON.stringify(override));
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
  } catch {
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
