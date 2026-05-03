import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, layout, spacing } from '@/theme';
import { useLanguage } from '@/contexts/LanguageContext';

// Figma confirmed: PROVIDER has exactly 4 tabs
// Startseite | Termine | Nachrichten | Profil

export default function ProviderLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: (layout.tabBarHeight - spacing.sm) + (insets.bottom > 0 ? insets.bottom : spacing.xs),
          paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.xs,
          paddingTop: spacing.xs,
        },
        tabBarLabelStyle: {
          fontSize: fontSizes.xs,
          fontFamily: fonts.body,
        },
      }}
    >
      {/* ═══════════════════════════════════════
          4 TAB SCREENS — visible in bottom nav
          ═══════════════════════════════════════ */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabCalendar'),
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: t('tabMessages'),
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />

      {/* ═══════════════════════════════════════════════
          ALL NON-TAB SCREENS — href:null hides from bar
          Every file in (provider)/ must appear here once.
          ═══════════════════════════════════════════════ */}
      <Tabs.Screen name="chat/[id]"              options={{ href: null }} />
      <Tabs.Screen name="pending"                options={{ href: null }} />
      <Tabs.Screen name="block-time"             options={{ href: null }} />
      <Tabs.Screen name="availability"           options={{ href: null }} />
      <Tabs.Screen name="reviews"                options={{ href: null }} />
      <Tabs.Screen name="settings"               options={{ href: null }} />
      <Tabs.Screen name="services/index"             options={{ href: null }} />
      <Tabs.Screen name="services/[id]"          options={{ href: null }} />
      <Tabs.Screen name="portfolio/index"              options={{ href: null }} />
      <Tabs.Screen name="portfolio/upload"       options={{ href: null }} />
      <Tabs.Screen name="profile/edit"           options={{ href: null }} />
      <Tabs.Screen name="profile/preview"        options={{ href: null }} />
      <Tabs.Screen name="booking-request/[id]"   options={{ href: null }} />
      <Tabs.Screen name="appointments/[id]"      options={{ href: null }} />

      <Tabs.Screen name="register"               options={{ href: null }} />
      <Tabs.Screen name="register/type"          options={{ href: null }} />
      <Tabs.Screen name="register/step1"         options={{ href: null }} />
      <Tabs.Screen name="register/step2"         options={{ href: null }} />
      <Tabs.Screen name="register/step3"         options={{ href: null }} />
      <Tabs.Screen name="register/step4"         options={{ href: null }} />
      <Tabs.Screen name="register/step5"         options={{ href: null }} />
    </Tabs>
  );
}
