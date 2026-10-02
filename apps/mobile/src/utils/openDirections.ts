export function buildAppleMapsUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://maps.apple.com/?daddr=${encoded}&dirflg=d`;
}

export function buildGoogleMapsAppUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `comgooglemaps://?daddr=${encoded}&directionsmode=driving`;
}

export function buildAndroidGeoUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `geo:0,0?q=${encoded}`;
}

export function buildWebFallbackUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

type OpenDirectionsStrings = {
  appleMaps: string;
  googleMaps: string;
  cancel: string;
  errorTitle: string;
  errorMessage: string;
};

type OpenDirectionsOpts = {
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'web' | 'default';
  canOpenURL: (url: string) => Promise<boolean>;
  openURL: (url: string) => Promise<any>;
  showActionSheet: (options: {
    title?: string;
    options: string[];
    cancelButtonIndex?: number;
  }) => Promise<number>;
  alert: (title: string, msg: string) => void;
  strings: OpenDirectionsStrings;
};

export async function openDirections(
  address: string,
  opts: OpenDirectionsOpts,
): Promise<void> {
  const { platform, canOpenURL, openURL, showActionSheet, alert, strings } = opts;

  const tryOpenWithFallback = async (url: string): Promise<void> => {
    try {
      await openURL(url);
    } catch {
      try {
        await openURL(buildWebFallbackUrl(address));
      } catch {
        try {
          alert(strings.errorTitle, strings.errorMessage);
        } catch {
        }
      }
    }
  };

  try {
    if (platform === 'ios') {
      let hasGoogleMaps = false;
      try {
        hasGoogleMaps = await canOpenURL('comgooglemaps://');
      } catch {
        hasGoogleMaps = false;
      }

      if (hasGoogleMaps) {
        let chosenIndex = -1;
        try {
          chosenIndex = await showActionSheet({
            options: [strings.appleMaps, strings.googleMaps, strings.cancel],
            cancelButtonIndex: 2,
          });
        } catch {
          chosenIndex = 0;
        }

        if (chosenIndex === 0) {
          await tryOpenWithFallback(buildAppleMapsUrl(address));
        } else if (chosenIndex === 1) {
          await tryOpenWithFallback(buildGoogleMapsAppUrl(address));
        }
      } else {
        await tryOpenWithFallback(buildAppleMapsUrl(address));
      }
    } else {
      await tryOpenWithFallback(buildAndroidGeoUrl(address));
    }
  } catch {
    try {
      await openURL(buildWebFallbackUrl(address));
    } catch {
      try {
        alert(strings.errorTitle, strings.errorMessage);
      } catch {
      }
    }
  }
}
