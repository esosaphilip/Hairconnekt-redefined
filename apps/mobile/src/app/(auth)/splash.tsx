// app/(auth)/splash.tsx — S-01 Splash Screen
// DOC 10 spec: Show logo + tagline for 2s → check AsyncStorage → navigate to correct route
// No API calls. No components (first screen, no shared components exist yet).
// CLAUDE.md Rule 3: No hardcoded values — use @/theme
// CLAUDE.md Rule 2: All strings in German

import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { tokenStorage } from '@/utils/token-storage';
import { colors } from '@/theme/colors';
import { fonts, fontSizes } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function SplashScreen() {
  const router = useRouter();
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.2.85:3000';

  // ── Animations ───────────────────────────────────────────────────────────
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(12)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Step 1: Fade + scale in the logo
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
      // Step 2: Slide-up tagline after logo settled
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

      // Step 3: Fade in loading dots
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }).start();
    });

    // Step 4: After 2s total, check auth and navigate
    const timer = setTimeout(async () => {
      try {
        const accessToken = await tokenStorage.getAccessToken();
        const role = await tokenStorage.getUserRole();

        if (accessToken && role) {
          // Token exists — navigate to the correct home
          if (role === 'provider') {
            try {
              const res = await fetch(
                `${API_URL}/providers/me`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              if (res.ok) {
                const provider = await res.json();
                if (provider.status?.toLowerCase() === 'approved') {
                  router.replace('/(provider)' as any);
                } else {
                  router.replace('/(provider)/pending' as any);
                }
              } else if (res.status === 404) {
                router.replace('/(provider)/register/type' as any);
              } else {
                router.replace('/(auth)/login?role=provider' as any);
              }
            } catch {
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

      {/* Logo mark + wordmark */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        {/* Logo mark — stylised HC monogram */}
        <View style={styles.logoMark}>
          <View style={styles.logoMarkInner} />
          <View style={styles.logoMarkAccent} />
        </View>

        {/* Wordmark */}
        <Text style={styles.wordmark} accessibilityRole="header">
          Hair<Text style={styles.wordmarkAccent}>Connekt</Text>
        </Text>
      </Animated.View>

      {/* Tagline */}
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

      {/* Loading dots */}
      <Animated.View style={[styles.dotsContainer, { opacity: dotsOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </View>
  );
}

/** Animated loading dots */
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

  // ── Logo ─────────────────────────────────────────────────────────────────
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  logoMarkInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 4,
    borderColor: colors.background,
    position: 'absolute',
    top: 14,
    left: 10,
  },

  logoMarkAccent: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.coral,
    position: 'absolute',
    bottom: 10,
    right: 10,
  },

  wordmark: {
    fontSize: fontSizes.xxxl,
    fontFamily: fonts.heading,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },

  wordmarkAccent: {
    color: colors.primary,
  },

  // ── Tagline ───────────────────────────────────────────────────────────────
  tagline: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.xxl,
  },

  // ── Loading dots ──────────────────────────────────────────────────────────
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
