import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { colors, fonts, fontSizes, spacing, borderRadius, layout } from '@/theme';
import { tokenStorage } from '@/utils/token-storage';
import { GermanErrorBanner } from '@/components/GermanErrorBanner';
import { MessageTicks } from '../../../components/MessageTicks';
import { mapHttpError } from '@/utils/error-messages';
import type { BookingRef, Message, OtherUser } from '@/types/chat';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch, apiJson } from '@/services/apiClient';

type ConversationDetailResponse = {
  id: string;
  otherUser: OtherUser;
  bookingReference: BookingRef | null;
  messages: Message[];
  myUserId: string;
};

type DisplayItem =
  | { type: 'typing'; id: 'typing' }
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: Message };

const normalizeParam = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? '';

export default function SharedChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = normalizeParam(params.id as any);
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [bookingRef, setBookingRef] = useState<BookingRef | null>(null);
  const [myUserId, setMyUserId] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorStatus, setErrorStatus] = useState<number | undefined>();

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAtRef = useRef<number>(0);
  const myUserIdRef = useRef<string>('');

  const showError = (status?: number) => {
    setErrorStatus(status);
    setErrorMessage(mapHttpError(status, undefined, lang));
    setErrorVisible(true);
  };

  const formatTime = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t('notificationsToday');
    if (d.toDateString() === yesterday.toDateString()) return t('notificationsYesterday');
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const loadConversation = async () => {
    try {
      setErrorVisible(false);
      setIsLoading(true);

      const token = await tokenStorage.getAccessToken();
      if (!token || !id) {
        showError(401);
        return;
      }
      let data: any;
      try {
        data = await apiJson<any>(`/chat/conversations/${id}`, { auth: true });
      } catch (err: any) {
        showError(err?.status ?? 500);
        return;
      }

      const payload: ConversationDetailResponse = data?.data ?? data;
      setOtherUser(payload?.otherUser ?? null);
      setBookingRef(payload?.bookingReference ?? null);
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setMyUserId(payload?.myUserId ?? '');
      myUserIdRef.current = payload?.myUserId ?? '';

      await apiFetch(`/chat/conversations/${id}/read`, { auth: true, method: 'POST' }).catch(() => {});

      setMessages((prev) => prev.map((m) => (m.senderId !== myUserIdRef.current ? { ...m, isRead: true } : m)));
    } catch {
      showError(500);
    } finally {
      setIsLoading(false);
    }
  };

  const initSocket = async () => {
    const token = await tokenStorage.getAccessToken();
    const wsUrl = process.env.EXPO_PUBLIC_WS_URL;

    if (!token || !wsUrl || !id) {
      setConnectionLost(true);
      return;
    }

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setConnectionLost(false);
      socket.emit('join_conversation', { conversationId: id });
    });

    socket.on('disconnect', () => {
      setConnectionLost(true);
    });

    socket.on('connect_error', () => {
      setConnectionLost(true);
    });

    socket.on('new_message', (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [message, ...prev];
      });

      if (message.senderId && message.senderId !== myUserIdRef.current) {
        socket.emit('message_read', { messageId: message.id });
      }

      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });

    socket.on('message_read', ({ messageId }: { messageId: string; readerId?: string }) => {
      if (!messageId) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m)));
    });

    socket.on('typing_indicator', ({ userId, isTyping: typing }: { userId: string; isTyping: boolean }) => {
      if (!userId || userId === myUserIdRef.current) return;
      setIsTyping(!!typing);
    });

    socket.on('presence_update', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      if (!userId) return;
      setOtherUser((prev) => {
        if (!prev || prev.id !== userId) return prev;
        return { ...prev, isOnline: !!isOnline };
      });
    });

    socketRef.current = socket;
  };

  useEffect(() => {
    loadConversation();
    initSocket();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id]);

  const handleInputChange = (text: string) => {
    setInput(text);

    const socket = socketRef.current;
    if (!socket || !id) return;

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      socket.emit('typing_stop', { conversationId: id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    const now = Date.now();
    if (now - lastTypingSentAtRef.current > 800) {
      lastTypingSentAtRef.current = now;
      socket.emit('typing_start', { conversationId: id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { conversationId: id });
    }, 1200);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isSending || !myUserId) return;

    setInput('');
    setIsSending(true);
    setErrorVisible(false);

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: myUserId,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setMessages((prev) => [tempMsg, ...prev]);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    try {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        throw new Error('no_socket');
      }

      socket.emit('typing_stop', { conversationId: id });

      const msg: Message = await new Promise((resolve, reject) => {
        let finished = false;
        const t = setTimeout(() => {
          if (finished) return;
          finished = true;
          reject(new Error('timeout'));
        }, 6000);

        socket.emit('send_message', { conversationId: id, content }, (serverMsg: Message) => {
          if (finished) return;
          finished = true;
          clearTimeout(t);
          resolve(serverMsg);
        });
      });

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempMsg.id);
        if (withoutTemp.some((m) => m.id === msg.id)) return withoutTemp;
        return [msg, ...withoutTemp];
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setInput(content);
      showError(500);
    } finally {
      setIsSending(false);
    }
  };

  const displayItems = useMemo(() => {
    const sorted = [...messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const items: DisplayItem[] = [];

    if (isTyping) items.push({ type: 'typing', id: 'typing' });

    for (let i = 0; i < sorted.length; i++) {
      const msg = sorted[i];
      items.push({ type: 'message', id: msg.id, message: msg });

      const next = sorted[i + 1];
      const thisDay = new Date(msg.createdAt).toDateString();
      const nextDay = next ? new Date(next.createdAt).toDateString() : null;
      if (!next || thisDay !== nextDay) {
        items.push({ type: 'date', id: `date-${thisDay}-${i}`, label: formatDateLabel(msg.createdAt) });
      }
    }

    return items;
  }, [messages, isTyping]) as DisplayItem[];

  const handlePhonePress = async () => {
    const phone = otherUser?.phone;
    if (!phone) return;
    await Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const renderItem = ({ item }: { item: DisplayItem }) => {
    if (item.type === 'typing') {
      return (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>{t('chatTyping')}</Text>
        </View>
      );
    }

    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{item.label}</Text>
        </View>
      );
    }

    const msg = item.message;
    const isOwn = msg.senderId === myUserId;
    return (
      <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isOwn ? styles.textOwn : styles.textOther]}>
            {msg.content}
          </Text>
        </View>
        <View style={[styles.metaRow, isOwn ? styles.metaRowOwn : styles.metaRowOther]}>
          <Text style={styles.timestamp}>{formatTime(msg.createdAt)}</Text>
          {isOwn && (
            <View style={{ marginLeft: 4 }}>
              <MessageTicks isRead={msg.isRead} />
            </View>
          )}
        </View>
      </View>
    );
  };

  const canSend = input.trim().length > 0 && !isSending;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={fontSizes.xl} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {otherUser?.avatarUrl ? (
            <Image source={{ uri: otherUser.avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Feather name="user" size={fontSizes.sm} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.headerTextCol}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser ? `${otherUser.firstName} ${otherUser.lastName}`.trim() : ''}
            </Text>
            <Text style={styles.headerStatus}>
              {otherUser?.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {otherUser?.phone ? (
          <TouchableOpacity onPress={handlePhonePress} style={styles.phoneButton}>
            <Feather name="phone" size={fontSizes.lg} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.phoneButton} />
        )}
      </View>

      {bookingRef ? (
        <View style={styles.bookingBanner}>
          <Feather name="calendar" size={fontSizes.md} color={colors.primary} />
          <Text style={styles.bookingBannerText} numberOfLines={1}>
            {bookingRef.bookingNumber} · {bookingRef.serviceName}
          </Text>
          <Feather name="chevron-right" size={fontSizes.md} color={colors.primary} />
        </View>
      ) : null}

      <GermanErrorBanner visible={errorVisible} message={errorMessage} statusCode={errorStatus} />

      {connectionLost ? (
        <View style={styles.connectionBanner}>
          <Feather name="wifi-off" size={fontSizes.lg} color={colors.textSecondary} />
          <Text style={styles.connectionText}>{t('chatConnectionLost')}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.coral} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: false })}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: spacing.sm + (insets.bottom || 0) }]}>
          <TouchableOpacity style={styles.attachButton} disabled>
            <Feather name="plus" size={fontSizes.xl} color={colors.primary} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={handleInputChange}
            placeholder={t('chatPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          >
            <Feather name="send" size={fontSizes.sm} color={colors.background} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: { width: layout.inputHeight, height: layout.inputHeight, justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: layout.avatarSm, height: layout.avatarSm, borderRadius: borderRadius.full, marginRight: spacing.sm, borderWidth: 2, borderColor: colors.gold },
  headerAvatarPlaceholder: { width: layout.avatarSm, height: layout.avatarSm, borderRadius: borderRadius.full, marginRight: spacing.sm, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.gold },
  headerTextCol: { flex: 1 },
  headerName: { fontFamily: fonts.bodyBold, fontSize: fontSizes.md, color: colors.textPrimary },
  headerStatus: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing.xxs },
  phoneButton: { width: layout.inputHeight, height: layout.inputHeight, alignItems: 'flex-end', justifyContent: 'center' },

  bookingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingBannerText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.primary },

  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectionText: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary },

  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },

  dateSeparator: { alignSelf: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs, borderRadius: borderRadius.full, marginVertical: spacing.md, borderWidth: 1, borderColor: colors.border },
  dateSeparatorText: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textSecondary },

  messageRow: { maxWidth: '75%', marginBottom: spacing.sm },
  messageRowOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageRowOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  bubbleOwn: { backgroundColor: colors.coral, borderBottomRightRadius: borderRadius.sm },
  bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: borderRadius.sm },
  bubbleText: { fontFamily: fonts.body, fontSize: fontSizes.sm },
  textOwn: { color: colors.background },
  textOther: { color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xxs },
  metaRowOwn: { justifyContent: 'flex-end' },
  metaRowOther: { justifyContent: 'flex-start' },
  timestamp: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textTertiary },
  readIcon: { marginLeft: spacing.xxs },

  typingRow: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  typingText: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  attachButton: { width: layout.inputHeight, height: layout.inputHeight, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    minHeight: layout.inputHeight,
    maxHeight: layout.avatarXl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: layout.inputHeight,
    height: layout.inputHeight,
    borderRadius: borderRadius.full,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: { backgroundColor: colors.borderStrong },
});
