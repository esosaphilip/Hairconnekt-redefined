import { View, Text, FlatList, TextInput, Pressable,
         StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { tokenStorage } from '@/utils/token-storage';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';

const API = process.env.EXPO_PUBLIC_API_URL!;

export default function ProviderChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [myUserId, setMyUserId] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = async () => {
    const token = await tokenStorage.getAccessToken();
    if (!token || !id) return;
    try {
      const res = await fetch(
        `${API}/chat/conversations/${id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? data ?? []);
      setOtherUser(data.otherUser ?? null);
      setMyUserId(data.myUserId ?? '');
    } catch {}
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    setIsSending(true);
    const token = await tokenStorage.getAccessToken();
    try {
      await fetch(`${API}/chat/conversations/${id}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: inputText.trim() }),
      });
      setInputText('');
      loadMessages();
    } catch {}
    setIsSending(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={72}
    >
      {/* TOP BAR — back arrow + other user name */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ marginRight: 12 }}
        >
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {otherUser?.firstName
            ? `${otherUser.firstName} ${otherUser.lastName ?? ''}`
            : 'Nachricht'}
        </Text>
      </View>

      {/* MESSAGES LIST */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={48} color="#DDD" />
            <Text style={styles.emptyText}>Noch keine Nachrichten</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOwn = item.senderId === myUserId;
          return (
            <View
              style={[
                styles.bubble,
                isOwn ? styles.ownBubble : styles.otherBubble,
              ]}
            >
              <Text style={[styles.bubbleText, isOwn && styles.ownText]}>
                {item.content}
              </Text>
            </View>
          );
        }}
      />

      {/* INPUT ROW */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Nachricht schreiben..."
          placeholderTextColor="#AAA"
          multiline
          maxLength={1000}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          style={[
            styles.sendBtn,
            (!inputText.trim() || isSending) && styles.sendBtnDisabled,
          ]}
        >
          <Feather name="send" size={18} color="#FFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_500Medium',
    color: colors.primary,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
  },
  bubbleText: { fontSize: 15, color: '#1A1A1A' },
  ownText: { color: '#FFF' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15, color: '#AAA' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#1A1A1A',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#CCC' },
});
