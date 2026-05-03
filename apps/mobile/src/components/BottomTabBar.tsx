import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, fontSizes, spacing } from '../theme';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  activeTab: string;
  unreadMessages?: number;
}

export function BottomTabBar({ activeTab, unreadMessages = 0 }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isEn = language === 'en';

  const tabs = [
    { key: 'index', title: isEn ? 'Home' : 'Startseite', icon: 'home', route: '/(client)/' },
    { key: 'search', title: isEn ? 'Search' : 'Suchen', icon: 'search', route: '/(client)/search' },
    { key: 'appointments', title: isEn ? 'Appointments' : 'Termine', icon: 'calendar', route: '/(client)/appointments' },
    { key: 'chat', title: isEn ? 'Messages' : 'Nachrichten', icon: 'message-circle', route: '/(client)/chat' },
    { key: 'profile', title: isEn ? 'Profile' : 'Profil', icon: 'user', route: '/(client)/profile' },
  ];

  return (
    <View style={[styles.container, { paddingBottom: spacing.sm + (insets.bottom || 0) }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const color = isActive ? colors.primary : colors.textTertiary;

        return (
          <TouchableOpacity 
            key={tab.key} 
            style={styles.tab} 
            onPress={() => router.push(tab.route as any)}
          >
            <View style={styles.iconContainer}>
              <Feather name={tab.icon as any} size={24} color={color} />
              {tab.key === 'chat' && unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color }]}>{tab.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.coral,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.surface,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
});
