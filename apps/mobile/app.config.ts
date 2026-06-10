import type { ConfigContext, ExpoConfig } from 'expo/config';

const baseConfig: ExpoConfig = {
  name: 'HairConnekt',
  slug: 'hairconnekt-redefined',
  owner: 'esosaphilip',
  version: '1.0.1',
  scheme: 'hairconnekt',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  backgroundColor: '#FFFFFF',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'de.hairconnekt.app',
    buildNumber: '4',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'HairConnekt benötigt deinen Standort, um Braider in deiner Nähe anzuzeigen.',
    },
  },
  android: {
    backgroundColor: '#FFFFFF',
    package: 'de.hairconnekt.app',
    versionCode: 4,
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.READ_MEDIA_IMAGES',
    ],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'hairconnekt.de',
            pathPrefix: '/',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  plugins: [
    '@sentry/react-native',
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/splash.png',
        imageWidth: 280,
        resizeMode: 'contain',
      },
    ],
    'expo-font',
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission:
          'HairConnekt benötigt Zugriff auf deine Fotos, um Profilbilder und Portfolio-Fotos hochzuladen.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'HairConnekt benötigt deinen Standort, um Braider in deiner Nähe anzuzeigen.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'cf78514f-f8c9-478b-b2fb-d6a784f93262',
    },
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/cf78514f-f8c9-478b-b2fb-d6a784f93262',
  },
};

export default (_: ConfigContext): ExpoConfig => {
  const profile = process.env.EAS_BUILD_PROFILE ?? '';

  const isNonProduction =
    profile === 'development' || profile === 'preview' || profile === 'staging';
  const isProduction =
    profile === 'production' || profile === 'production-internal';

  const name = isNonProduction ? 'HC Staging' : 'HairConnekt';

  const androidPackage = isNonProduction
    ? 'de.hairconnekt.app.staging'
    : baseConfig.android?.package ?? 'de.hairconnekt.app';

  const iosBundleIdentifier = isNonProduction
    ? 'de.hairconnekt.app.staging'
    : baseConfig.ios?.bundleIdentifier ?? 'de.hairconnekt.app';

  const intentFilters = (baseConfig.android?.intentFilters ?? []).map((filter: any) => {
    const data = Array.isArray(filter?.data) ? [...filter.data] : [];
    const hasWww = data.some((d: any) => d?.scheme === 'https' && d?.host === 'www.hairconnekt.de');
    if (!hasWww) {
      data.push({ scheme: 'https', host: 'www.hairconnekt.de', pathPrefix: '/' });
    }

    return {
      ...filter,
      autoVerify: Boolean(isProduction),
      data,
    };
  });

  const plugins = Array.isArray(baseConfig.plugins) ? [...baseConfig.plugins] : [];
  const hasAdiPlugin = plugins.some((p) => {
    if (typeof p === 'string') return p.includes('withAdiRegistration');
    if (Array.isArray(p)) return String(p[0]).includes('withAdiRegistration');
    return false;
  });
  if (!hasAdiPlugin) {
    plugins.push(['./plugins/withAdiRegistration', { envVar: 'PLAY_ADI_REGISTRATION_SNIPPET' }]);
  }

  return {
    ...baseConfig,
    name,
    plugins,
    android: {
      ...baseConfig.android,
      package: androidPackage,
      intentFilters,
    },
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: iosBundleIdentifier,
      infoPlist: {
        ...baseConfig.ios?.infoPlist,
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    extra: {
      ...baseConfig.extra,
      eas: {
        ...baseConfig.extra?.eas,
        buildProfile: profile || undefined,
        isProduction: isProduction || undefined,
      },
    },
  };
};
