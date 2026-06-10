import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fonts, fontSizes, spacing, layout } from '../theme';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  activeTab: string;
  unreadMessages?: number;
}

export function BottomTabBar({ activeTab, unreadMessages = 0 }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const tabs = [
    { key: 'index', title: t('tabHome'), icon: 'home', route: '/(client)/' },
    { key: 'search', title: t('tabSearch'), icon: 'search', route: '/(client)/search' },
    { key: 'appointments', title: t('tabAppointments'), icon: 'calendar', route: '/(client)/appointments' },
    { key: 'chat', title: t('tabMessages'), icon: 'message-circle', route: '/(client)/chat' },
    { key: 'profile', title: t('tabProfile'), icon: 'user', route: '/(client)/profile' },
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
            accessibilityRole="button"
            accessibilityLabel={tab.title}
            accessibilityState={{ selected: isActive }}
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
    marginBottom: spacing.xxs,
  },
  badge: {
    position: 'absolute',
    top: -spacing.xxs,
    right: -spacing.xs,
    backgroundColor: colors.coral,
    borderRadius: spacing.s,
    minWidth: layout.badgeSm,
    height: layout.badgeSm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  badgeText: {
    color: colors.surface,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xxs,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.xxs,
  },
});
