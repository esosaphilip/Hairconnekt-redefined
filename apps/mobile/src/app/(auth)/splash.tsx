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
import { useRouter } from 'expo-router';
import { tokenStorage } from '@/utils/token-storage';
import { colors, fonts, fontSizes, lineHeights, spacing } from '@/theme';
import { apiJson } from '@/services/apiClient';

export default function SplashScreen() {
  const router = useRouter();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(12)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

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
      try {
        const accessToken = await tokenStorage.getAccessToken();
        const role = await tokenStorage.getUserRole();

        if (accessToken && role) {
          try {
            const me = await apiJson<any>('/users/me', { auth: true });
            await tokenStorage.setUser(me);
            if (me?.isEmailVerified === false) {
              if (role === 'provider') {
                router.replace(
                  `/(provider)/verify-email?email=${encodeURIComponent(me?.email ?? '')}` as any,
                );
              } else {
                router.replace(
                  `/(auth)/verify-email?email=${encodeURIComponent(me?.email ?? '')}` as any,
                );
              }
              return;
            }
          } catch {}

          // Token exists — navigate to the correct home
          if (role === 'provider') {
            try {
              const provider = await apiJson<any>('/providers/me', { auth: true });
              if (provider.status?.toLowerCase() === 'approved') {
                router.replace('/(provider)' as any);
              } else {
                router.replace('/(provider)/pending' as any);
              }
            } catch (err: any) {
              if (err?.status === 404) {
                router.replace('/(provider)/register/type' as any);
                return;
              }
              router.replace('/(auth)/login?role=provider' as any);
            }
          } else {
            router.replace('/(client)' as any);
          }
        } else {
          // No token — show account type selection
          router.replace('/(auth)/account-type');
        }
      } catch {
        // On any storage error — go to account type
        router.replace('/(auth)/account-type');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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
        Verbinde dich mit deinem{'\n'}perfekten Style
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
