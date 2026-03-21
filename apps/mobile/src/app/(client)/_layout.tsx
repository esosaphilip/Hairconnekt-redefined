import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';


// Figma confirmed: CLIENT has exactly 5 tabs
// Startseite | Suchen | Termine | Nachrichten | Profil

export default function ClientLayout() {
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
          5 TAB SCREENS — visible in bottom nav
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
        name="search"
        options={{
          title: 'Suchen',
          tabBarIcon: ({ color, size }) => (
            <Feather name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments/index"
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
  );
}
