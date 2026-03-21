import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface Conversation {
  id: string;
  otherUser: {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    avatarUrl?: string;
    isProvider?: boolean;
    isOnline?: boolean;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  bookingReference?: string;
}

export default function ChatListScreen() {
  const router = useRouter();
  const segments = useSegments();
  const isProvider = segments[0] === '(provider)';
  const basePath = isProvider ? '/(provider)' : '/(client)';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const token = await tokenStorage.getAccessToken();
      const res = await fetch(`${API_URL}/chat/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => ({ ok: false, json: () => ({}) }));

      if (!res.ok) {
        throw new Error('Failed to load conversations.');
      }
      const data: any = await res.json();
      setConversations(data.data || data || []);
    } catch (error) {
      console.log('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Gestern';
    const d = new Date(isoString);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const { otherUser, lastMessage, unreadCount, bookingReference } = item;
    const isUnread = unreadCount > 0;

    return (
      <TouchableOpacity 
        style={styles.row} 
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: `${basePath}/chat/[id]` as any, params: { id: item.id }})}
      >
        {/* AVATAR */}
        <View style={styles.avatarContainer}>
          {otherUser?.avatarUrl ? (
            <Image 
              source={{ uri: otherUser.avatarUrl }} 
              style={[styles.avatar, otherUser.isOnline && styles.avatarOnline]} 
            />
          ) : (
            <View style={[styles.avatarPlaceholder, otherUser?.isOnline && styles.avatarOnline]}>
              <Feather name="user" size={24} color={colors.textSecondary} />
            </View>
          )}
          {otherUser.isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* CONTENT */}
        <View style={styles.contentCol}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {otherUser?.name || `${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim()}
            </Text>
            {lastMessage && (
              <Text style={[styles.timeText, isUnread && styles.timeTextUnread]}>
                {getRelativeTime(lastMessage.createdAt)}
              </Text>
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
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Feather name="message-circle" size={64} color={colors.borderStrong} style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>Noch keine Nachrichten</Text>
        <Text style={styles.emptySub}>Starte ein Gespräch über die Buchung eines Termins</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nachrichten</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : styles.listContent}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.primary },

  listContent: { paddingBottom: 40 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  avatarContainer: { position: 'relative', marginRight: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  avatarOnline: { borderWidth: 2, borderColor: colors.gold },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: colors.background,
  },

  contentCol: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nameText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  timeText: { fontFamily: fonts.body, fontSize: 12, color: '#AAAAAA' },
  timeTextUnread: { color: colors.primary, fontFamily: fonts.bodyBold },

  bookingRefPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 4,
  },
  bookingRefText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.primary },

  messagePreview: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: '#6B6B6B' },
  messagePreviewUnread: { color: '#1A1A1A', fontFamily: fonts.bodyBold },

  unreadBadge: {
    backgroundColor: colors.coral,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.md,
  },
  unreadBadgeText: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: 10 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: fontSizes.lg, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
  emptySub: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
});