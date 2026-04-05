import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

// Figma confirmed: PROVIDER has exactly 4 tabs
// Startseite | Termine | Nachrichten | Profil

export default function ProviderLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#AAA',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EEE',
          borderTopWidth: 1,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'DMSans_400Regular',
        },
      }}
    >
      {/* ═══════════════════════════════════════
          4 TAB SCREENS — visible in bottom nav
          ═══════════════════════════════════════ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Startseite',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Termine',
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'Nachrichten',
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profil',
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
