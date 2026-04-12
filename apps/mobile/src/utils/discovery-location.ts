import * as Location from 'expo-location';

export type DiscoveryCoordinates = {
  lat: number;
  lng: number;
};

let cachedCoordinates: DiscoveryCoordinates | null = null;
let cachedPermissionDenied = false;
let inflightRequest: Promise<DiscoveryCoordinates | null> | null = null;

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
