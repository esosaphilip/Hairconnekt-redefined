import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Conversation } from '@/types/chat';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '@/theme';
import { tokenStorage } from '@/utils/token-storage';
import { API } from '@/utils/api';
import { GermanErrorBanner } from '@/components/GermanErrorBanner';
import { mapHttpError } from '@/utils/error-messages';

export default function ChatListScreen() {
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<'client' | 'provider' | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState('');

  const loadConversations = async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        setConversations([]);
        return;
      }
      setErrorVisible(false);
      const res = await fetch(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data: any = await res.json().catch(() => undefined);
      if (!res.ok) {
        const status = res.status;
        setErrorStatus(status);
        setErrorMessage(mapHttpError(status));
        setErrorVisible(true);
        return;
      }
      const payload = data?.data ?? data ?? [];
      setConversations(Array.isArray(payload) ? payload : []);
    } catch {
      setErrorStatus(500);
      setErrorMessage(mapHttpError(500));
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      let interval: any;

      const init = async () => {
        const r = await tokenStorage.getUserRole();
        if (mounted) setRole(r);
        await loadConversations();
        interval = setInterval(loadConversations, 10000);
      };

      init();

      return () => {
        mounted = false;
        if (interval) clearInterval(interval);
      };
    }, [])
  );

  const getRelativeTime = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins <= 0) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Gestern';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const handlePress = (item: Conversation) => {
    router.push(`/(shared)/chat/${item.id}` as any);
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const { otherUser, lastMessage, unreadCount, bookingReference } = item;
    const isUnread = unreadCount > 0;
    const showGoldRing = role === 'client';

    return (
      <TouchableOpacity
        style={[styles.row, isUnread && styles.rowUnread]}
        activeOpacity={0.7}
        onPress={() => handlePress(item)}
      >
        {/* AVATAR */}
        <View style={styles.avatarContainer}>
          {otherUser.avatarUrl ? (
            <Image
              source={{ uri: otherUser.avatarUrl }}
              style={[styles.avatar, showGoldRing && styles.avatarGoldRing]}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, showGoldRing && styles.avatarGoldRing]}>
              <Feather name="user" size={24} color={colors.textSecondary} />
            </View>
          )}
          {otherUser.isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* CONTENT */}
        <View style={styles.contentCol}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {`${otherUser.firstName} ${otherUser.lastName}`.trim()}
            </Text>
            {lastMessage && (
              <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>{getRelativeTime(lastMessage.createdAt)}</Text>
            )}
          </View>

          {bookingReference && (
            <View style={styles.bookingRefPill}>
              <Text style={styles.bookingRefText}>📅 {bookingReference}</Text>
            </View>
          )}

          {lastMessage && (
            <Text style={[styles.messagePreview, isUnread && styles.messagePreviewUnread]} numberOfLines={1}>
              {lastMessage.content}
            </Text>
          )}
        </View>

        {/* UNREAD BADGE */}
        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="message-circle" size={64} color={colors.borderStrong} style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>Noch keine Nachrichten</Text>
        <Text style={styles.emptySub}>Starte ein Gespräch über deine Buchungen</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nachrichten</Text>
      </View>

      <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={conversations.length === 0 ? styles.listEmpty : styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: fontSizes.xl, color: colors.primary },

  listEmpty: { flex: 1, paddingBottom: spacing.xl },
  listContent: { paddingBottom: spacing.xl },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
  },

  avatarContainer: { position: 'relative', marginRight: spacing.md },
  avatar: { width: layout.inputHeight, height: layout.inputHeight, borderRadius: borderRadius.full },
  avatarPlaceholder: { width: layout.inputHeight, height: layout.inputHeight, borderRadius: borderRadius.full, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  avatarGoldRing: { borderWidth: 2, borderColor: colors.gold },
  onlineDot: {
    position: 'absolute',
    bottom: spacing.xxs,
    right: spacing.xxs,
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.background,
  },

  contentCol: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nameText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  timeText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary },
  timeTextUnread: { color: colors.coral, fontFamily: fonts.bodyBold },

  bookingRefPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xxs,
  },
  bookingRefText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.primary },

  messagePreview: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },
  messagePreviewUnread: { color: colors.textPrimary, fontFamily: fonts.bodyBold },

  unreadBadge: {
    backgroundColor: colors.coral,
    minWidth: fontSizes.xl,
    height: fontSizes.xl,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.md,
  },
  unreadBadgeText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: fontSizes.xs },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
});
