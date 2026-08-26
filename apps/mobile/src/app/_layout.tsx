// app/_layout.tsx — Root layout for Expo Router
// Loads Google Fonts (Playfair Display + DM Sans) before rendering anything

import { useEffect, useRef } from 'react';
import { Href, Stack, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { tokenStorage } from '@/utils/token-storage';
import { getSafeNotificationRoute } from '@/utils/safe-navigation';
import { apiFetch } from '@/services/apiClient';
import { debugLog } from '@/utils/logger';
import { colors } from '@/theme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';

// Keep splash visible while fonts load
SplashScreen.preventAutoHideAsync();

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 0.1,
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Standard',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.coral,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const pushToken = tokenData.data;

  await apiFetch('/notifications/push-token', {
    auth: true,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: pushToken }),
  });
}

type NotificationRoutePayload = {
  screen?: unknown;
};

function RootLayout() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const registerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNavigationRef = useRef<NotificationRoutePayload | null>(null);
  const lastHandledNotificationIdRef = useRef<string | null>(null);
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!fontsLoaded) return;

    let cancelled = false;

    const clearRegisterTimeout = () => {
      if (registerTimeout.current) {
        clearTimeout(registerTimeout.current);
        registerTimeout.current = null;
      }
    };

    const scheduleRegisterAttempt = (delayMs: number) => {
      clearRegisterTimeout();
      registerTimeout.current = setTimeout(() => {
        void attemptRegister();
      }, delayMs);
    };

    const navigateFromNotificationPayload = (
      payload: NotificationRoutePayload,
      notificationId?: string,
    ) => {
      if (notificationId) {
        if (lastHandledNotificationIdRef.current === notificationId) return;
        lastHandledNotificationIdRef.current = notificationId;
      }

      if (!navigationState?.key) {
        pendingNavigationRef.current = payload;
        return;
      }

      const safeRoute = getSafeNotificationRoute(payload.screen);
      if (safeRoute) {
        router.push(safeRoute as Href);
      }
    };

    const attemptRegister = async () => {
      if (cancelled) return;

      const canRegisterPush = Device.isDevice;
      if (!canRegisterPush) return;

      try {
        const accessToken = await tokenStorage.getAccessToken();
        if (!accessToken) {
          scheduleRegisterAttempt(10_000);
          return;
        }

        await registerForPushNotifications();
        clearRegisterTimeout();
      } catch (error) {
        debugLog('Push registration failed:', error);
        scheduleRegisterAttempt(20_000);
      }
    };

    void attemptRegister();

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response || cancelled) return;
        const notification = response.notification;
        const payload = notification.request.content.data as NotificationRoutePayload;
        const id =
          (notification.request.content as any)?.notificationId ||
          (notification.request as any)?.identifier ||
          null;
        navigateFromNotificationPayload(payload, id ?? undefined);
      })
      .catch((error) => {
        debugLog('Failed to load last notification response:', error);
      });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const notification = response.notification;
      const payload = notification.request.content.data as NotificationRoutePayload;
      const id =
        (notification.request.content as any)?.notificationId ||
        (notification.request as any)?.identifier ||
        null;
      navigateFromNotificationPayload(payload, id ?? undefined);
    });

    return () => {
      cancelled = true;
      clearRegisterTimeout();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [fontsLoaded, navigationState?.key, router]);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (!navigationState?.key) return;
    if (!pendingNavigationRef.current) return;

    const payload = pendingNavigationRef.current;
    pendingNavigationRef.current = null;

    const safeRoute = getSafeNotificationRoute(payload.screen);
    if (safeRoute) {
      router.push(safeRoute as Href);
    }
  }, [fontsLoaded, navigationState?.key, router]);

  if (!fontsLoaded) return null;

  return (
    <RootErrorBoundary>
      <SafeAreaProvider>
        <LanguageProvider>
          <ErrorBoundary>
            <LanguageHydrationGate>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(client)" />
                <Stack.Screen name="(provider)" />
                <Stack.Screen name="(shared)" />
              </Stack>
            </LanguageHydrationGate>
          </ErrorBoundary>
        </LanguageProvider>
      </SafeAreaProvider>
    </RootErrorBoundary>
  );
}

function LanguageHydrationGate({ children }: { children: React.ReactNode }) {
  const { isHydrated } = useLanguage();
  if (!isHydrated) return null;
  return <>{children}</>;
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;
