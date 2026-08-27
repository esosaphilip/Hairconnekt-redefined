import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Platform,
} from 'react-native';
import { useGlobalSearchParams, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Sentry from '@sentry/react-native';
import { tokenStorage } from '@/utils/token-storage';
import { colors, fonts, fontSizes, lineHeights, spacing } from '@/theme';
import { apiJson } from '@/services/apiClient';
import { useLanguage } from '@/contexts/LanguageContext';

const hasMeaningfulDeepLink = (
  segments: string[],
  initialUrl: string | null,
  params: Record<string, string | string[]> & { returnTo?: string | string[] },
): boolean => {
  const routeIsNotSplash = segments.some((seg) => seg !== '(auth)' && seg !== 'splash');
  if (routeIsNotSplash) return true;

  if (typeof params?.returnTo === 'string' && params.returnTo.trim().length > 0) {
    return true;
  }
  if (Array.isArray(params?.returnTo) && params.returnTo.some((v) => v && v.trim().length > 0)) {
    return true;
  }

  if (!initialUrl) return false;
  try {
    const parsed = Linking.parse(initialUrl);
    const hasPath = Array.isArray(parsed.path)
      ? parsed.path.some((p) => p && p.length > 0)
      : typeof parsed.path === 'string' && parsed.path.length > 0;
    const hasQuery =
      parsed.queryParams != null &&
      typeof parsed.queryParams === 'object' &&
      Object.keys(parsed.queryParams).length > 0;
    return Boolean(hasPath) || Boolean(hasQuery);
  } catch {
    return false;
  }
};

const resolveDefaultRoute = async (): Promise<string> => {
  try {
    const accessToken = await tokenStorage.getAccessToken();
    const role = await tokenStorage.getUserRole();

    if (accessToken && role) {
      try {
        const me = await apiJson<any>('/users/me', { auth: true });
        await tokenStorage.setUser(me);
        if (me?.isEmailVerified === false) {
          if (role === 'provider') {
            return `/(auth)/provider-verify-email?email=${encodeURIComponent(me?.email ?? '')}`;
          }
          return `/(auth)/verify-email?email=${encodeURIComponent(me?.email ?? '')}`;
        }
      } catch (error) {
        Sentry.captureException(error);
      }

      if (role === 'provider') {
        try {
          const provider = await apiJson<any>('/providers/me', { auth: true });
          if (provider.status?.toLowerCase() === 'approved') {
            return '/(provider)';
          }
          return '/(provider)/pending';
        } catch (err: any) {
          if (err?.status === 404) {
            return '/(auth)/provider-register/type';
          }
          return '/(auth)/login?role=provider';
        }
      }
      return '/(client)';
    }
    return '/(client)';
  } catch (error) {
    Sentry.captureException(error);
    return '/(client)';
  }
};

export default function SplashScreen() {
  const router = useRouter();
  const segments = useSegments();
  const params = useGlobalSearchParams();
  const { t } = useLanguage();
  const initialUrlRef = useRef<string | null>(null);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(12)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        initialUrlRef.current = await Linking.getInitialURL();
      } catch {
        initialUrlRef.current = null;
      }
    })();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }).start();
    });

    const timer = setTimeout(async () => {
      if (hasMeaningfulDeepLink(segments, initialUrlRef.current, params as any)) {
        return;
      }
      const route = await resolveDefaultRoute();
      router.replace(route as any);
    }, 2000);

    return () => clearTimeout(timer);
  }, [segments, params, router]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.background} barStyle="dark-content" />

      <Animated.View
        style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        <Image source={require('../../../assets/logo-full.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.Text
        style={[
          styles.tagline,
          {
            opacity: taglineOpacity,
            transform: [{ translateY: taglineY }],
          },
        ]}
      >
        {t('splashTagline')}
      </Animated.Text>

      <Animated.View style={[styles.dotsContainer, { opacity: dotsOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </View>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
      );

    Animated.parallel([anim(dot1, 0), anim(dot2, 200), anim(dot3, 400)]).start();
  }, []);

  return (
    <View style={styles.dots}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: spacing.xxl * 5,
    height: (spacing.xxl * 5) / 3,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: lineHeights.md,
    marginBottom: spacing.xxl,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? spacing.xl : spacing.xxl,
  },

  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  dot: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: spacing.xs / 2,
    backgroundColor: colors.primary,
  },
});
