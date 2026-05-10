import type { ConfigContext, ExpoConfig } from 'expo/config';

const appJson = require('./app.json') as { expo: ExpoConfig };

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = (appJson?.expo ?? config) as ExpoConfig;
  const profile = process.env.EAS_BUILD_PROFILE ?? '';

  const isNonProduction =
    profile === 'development' || profile === 'preview' || profile === 'staging';
  const isProduction =
    profile === 'production' || profile === 'production-internal';

  const name = isNonProduction ? 'HC Staging' : 'HairConnekt';

  const androidPackage = isNonProduction
    ? 'de.hairconnekt.app.staging'
    : base.android?.package ?? 'de.hairconnekt.app';

  const iosBundleIdentifier = isNonProduction
    ? 'de.hairconnekt.app.staging'
    : base.ios?.bundleIdentifier ?? 'de.hairconnekt.app';

  const plugins = Array.isArray(base.plugins) ? [...base.plugins] : [];
  const hasAdiPlugin = plugins.some((p) => {
    if (typeof p === 'string') return p.includes('withAdiRegistration');
    if (Array.isArray(p)) return String(p[0]).includes('withAdiRegistration');
    return false;
  });
  if (!hasAdiPlugin) {
    plugins.push(['./plugins/withAdiRegistration', { envVar: 'PLAY_ADI_REGISTRATION_SNIPPET' }]);
  }

  return {
    ...base,
    name,
    plugins,
    android: {
      ...base.android,
      package: androidPackage,
    },
    ios: {
      ...base.ios,
      bundleIdentifier: iosBundleIdentifier,
      infoPlist: {
        ...(base.ios as any)?.infoPlist,
        ITSAppUsesNonExemptEncryption: false,
      },
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
