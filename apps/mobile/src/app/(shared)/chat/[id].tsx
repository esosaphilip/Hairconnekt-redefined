import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, fontSizes, spacing, shadows } from '../../../theme';
import { tokenStorage } from '../../../utils/token-storage';
import { API } from '../../../utils/api';


interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
}

interface ChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isProvider: boolean;
  isOnline: boolean;
  lastActiveAt?: string;
  phone?: string;
}

interface BookingReference {
  id: string;
  serviceName: string;
  date: string;
  status: string;
}

export default function ChatIndividualScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<ChatParticipant | null>(null);
  const [bookingRef, setBookingRef] = useState<BookingReference | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initChat();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [id]);

  const initChat = async () => {
    try {
      setIsLoading(true);
      const token = await tokenStorage.getAccessToken();
      
      // Get current user (to know which side of chat we are)
      // Since this is shared, we try to fetch from either /users/me or /providers/me based on context,
      // but for simplicity, the token decode or a dedicated endpoint usually gives this.
      // Mocking for now:
      setCurrentUserId('me-id');

      // Fetch history
      const res = await fetch(`${API}/chat/conversations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => ({ ok: false, json: () => ({}) }));

      if (!res.ok) {
        throw new Error('Failed to load chat');
      }
      const data: any = await res.json();

      setOtherUser(data.otherUser);
      setBookingRef(data.bookingReference);
      setMessages(data.messages || []);

      // Start 5s polling
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch(`${API}/chat/conversations/${id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              setMessages(pollData.messages || []);
            }
          } catch(e) {}
        }, 5000);
      }

    } catch (error) {
      console.log('Error initializing chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setInput(text);
  };

  const sendMessage = async () => {
    if (!input.trim() || isSending || !currentUserId) return;

    const content = input.trim();
    setInput('');
    setIsSending(true);

    // Optimistic UI update
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    setMessages(prev => [tempMsg, ...prev]);

    try {
      const token = await tokenStorage.getAccessToken();
      
      // Send via REST (or WS depending on backend preference)
      await fetch(`${API}/chat/conversations/${id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      // Refresh messages
      const updatedRes = await fetch(`${API}/chat/conversations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (updatedRes.ok) {
        const updatedData = await updatedRes.json();
        setMessages(updatedData.messages || []);
      }
      
    } catch (error) {
      console.log('Error sending message:', error);
      // Removed temp msg logic for simplicity, could rollback if needed
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (isoString: string) => {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Heute';
    if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handlePhonePress = () => {
    if (otherUser?.phone) {
      Linking.openURL(`tel:${otherUser.phone}`).catch(e => console.log('Call failed', e));
    }
  };

  // Prepare data with date separators
  const renderData: any[] = [];
  let currentDateStr = '';

  // messages are sorted newest first (index 0 is newest)
  // We need to iterate backwards to insert date headers correctly for inverted FlatList
  const sortedMsgs = [...messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  sortedMsgs.forEach((msg, index) => {
    const dateStr = new Date(msg.createdAt).toDateString();
    
    // In an inverted list, the item at index N is rendered visually *above* index N-1
    // So a date separator for a group should be added *after* the last item of that group (which is visually the top)
    const isLastInGroup = index === sortedMsgs.length - 1 || new Date(sortedMsgs[index + 1].createdAt).toDateString() !== dateStr;
    
    renderData.push(msg);
    if (isLastInGroup) {
      renderData.push({ isDateSeparator: true, date: msg.createdAt, id: `date-${dateStr}` });
    }
  });

  const renderItem = ({ item }: { item: any }) => {
    if (item.isDateSeparator) {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{formatDateLabel(item.date)}</Text>
        </View>
      );
    }

    const msg = item as Message;
    const isMe = msg.senderId === currentUserId;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <View style={styles.senderAvatarContainer}>
            {otherUser?.avatarUrl ? (
              <Image source={{ uri: otherUser.avatarUrl }} style={styles.senderAvatar} />
            ) : (
              <View style={styles.senderAvatarPlaceholder}>
                <Feather name="user" size={14} color={colors.textSecondary} />
              </View>
            )}
          </View>
        )}
        <View style={{ flex: 1, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {msg.content}
            </Text>
          </View>
          <View style={[styles.metaRow, isMe ? styles.metaRowMe : styles.metaRowOther]}>
            <Text style={styles.timestamp}>{formatTime(msg.createdAt)}</Text>
            {isMe && (
              <Feather 
                name="check" 
                size={12} 
                color={msg.isRead ? colors.teal : '#AAAAAA'} 
                style={{ marginLeft: 4 }} 
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          {otherUser && (
            <View style={styles.headerProfile}>
              <View style={styles.avatarContainer}>
                {otherUser.avatarUrl ? (
                  <Image source={{ uri: otherUser.avatarUrl }} style={[styles.avatar, otherUser.isProvider && styles.avatarProvider]} />
                ) : (
                  <View style={[styles.avatarPlaceholder, otherUser.isProvider && styles.avatarProvider]}>
                    <Feather name="user" size={16} color={colors.textSecondary} />
                  </View>
                )}
                {otherUser.isOnline && <View style={styles.onlineDot} />}
              </View>
              
              <View>
                <Text style={styles.headerName}>{otherUser.firstName} {otherUser.lastName}</Text>
                <Text style={styles.headerStatus}>
                  {otherUser.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {otherUser?.phone && (
          <TouchableOpacity onPress={handlePhonePress} style={styles.phoneButton}>
            <Feather name="phone" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* BOOKING BANNER */}
      {bookingRef && (
        <TouchableOpacity style={styles.bookingBanner} activeOpacity={0.8}>
          <View style={styles.bookingBannerLeft}>
            <Feather name="calendar" size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.bookingBannerText}>Termin: {bookingRef.serviceName} · {bookingRef.date}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* CHAT AREA */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.coral} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={renderData}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={null}
          />
        )}

        {/* INPUT BAR */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachButton}>
            <Feather name="plus" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={handleTextChange}
            placeholder="Nachricht schreiben..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, input.trim() ? styles.sendButtonActive : styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim()}
          >
            <Feather name="send" size={20} color={colors.background} style={{ marginLeft: -2, marginTop: 2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  keyboardAvoid: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    zIndex: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  
  avatarContainer: { position: 'relative', marginRight: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  avatarProvider: { borderWidth: 2, borderColor: colors.gold },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: colors.background,
  },

  headerName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textPrimary },
  headerStatus: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  phoneButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

  bookingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  bookingBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bookingBannerText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },

  listContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },

  dateSeparator: { alignSelf: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginVertical: spacing.lg },
  dateSeparatorText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: '#AAAAAA' },

  messageRow: { marginBottom: spacing.md, maxWidth: '85%', flexDirection: 'row', alignItems: 'flex-end' },
  messageRowMe: { alignSelf: 'flex-end' },
  messageRowOther: { alignSelf: 'flex-start' },

  senderAvatarContainer: { marginRight: 8, marginBottom: 20 },
  senderAvatar: { width: 28, height: 28, borderRadius: 14 },
  senderAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },

  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  bubbleMe: { backgroundColor: colors.coral, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#F5F5F5', borderBottomLeftRadius: 4 },

  messageText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  messageTextMe: { color: colors.background },
  messageTextOther: { color: '#1A1A1A' },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaRowMe: { alignSelf: 'flex-end' },
  metaRowOther: { alignSelf: 'flex-start' },
  timestamp: { fontFamily: fonts.body, fontSize: 10, color: '#AAAAAA' },

  typingIndicator: { alignSelf: 'flex-start', marginBottom: spacing.md },
  typingText: { fontFamily: fonts.body, fontSize: 10, color: '#AAAAAA', marginTop: 4, marginLeft: 4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: { backgroundColor: colors.coral },
  sendButtonDisabled: { backgroundColor: colors.borderStrong },
});
