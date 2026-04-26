import type { ConfigContext, ExpoConfig } from 'expo/config';

const appJson = require('./app.json') as { expo: ExpoConfig };

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = (appJson?.expo ?? config) as ExpoConfig;
  const profile = process.env.EAS_BUILD_PROFILE ?? '';

  const isPreview = profile === 'preview';
  const isProduction = profile === 'production';

  const name = isPreview ? 'HC Staging' : 'HairConnekt';

  const androidPackage = isPreview
    ? 'de.hairconnekt.app.staging'
    : base.android?.package ?? 'de.hairconnekt.app';

  return {
    ...base,
    name,
    android: {
      ...base.android,
      package: androidPackage,
    },
    ios: {
      ...base.ios,
    },
    extra: {
      ...base.extra,
      eas: {
        ...(base.extra as any)?.eas,
        buildProfile: profile || undefined,
        isProduction: isProduction || undefined,
      },
    },
  };
};

