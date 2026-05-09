import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, layout, spacing } from '@/theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { FavouritesProvider } from '../../contexts/FavouritesContext';


// Figma confirmed: CLIENT has exactly 5 tabs
// Startseite | Suchen | Termine | Nachrichten | Profil

export default function ClientLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <FavouritesProvider>
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
            5 TAB SCREENS — visible in bottom nav
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
          name="search"
          options={{
            title: t('tabSearch'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="search" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="appointments/index"
          options={{
            title: t('tabAppointments'),
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
            Every file in (client)/ must appear here once.
            ═══════════════════════════════════════════════ */}
        <Tabs.Screen name="chat/[id]"                        options={{ href: null }} />
        <Tabs.Screen name="provider/[id]"                    options={{ href: null }} />
        <Tabs.Screen name="booking/services"                 options={{ href: null }} />
        <Tabs.Screen name="booking/datetime"                 options={{ href: null }} />
        <Tabs.Screen name="booking/details"                  options={{ href: null }} />
        <Tabs.Screen name="booking/confirmation"             options={{ href: null }} />
        <Tabs.Screen name="appointments/[id]"                options={{ href: null }} />
        <Tabs.Screen name="appointments/reschedule/[id]"     options={{ href: null }} />
        <Tabs.Screen name="appointments/cancel/[id]"         options={{ href: null }} />
        <Tabs.Screen name="review/[bookingId]"               options={{ href: null }} />
        <Tabs.Screen name="favourites"                       options={{ href: null }} />
        <Tabs.Screen name="profile/edit"                     options={{ href: null }} />
        <Tabs.Screen name="profile/reviews"                  options={{ href: null }} />
      </Tabs>
    </FavouritesProvider>
  );
}
