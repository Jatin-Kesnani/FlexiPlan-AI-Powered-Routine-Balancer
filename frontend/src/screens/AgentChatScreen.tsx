import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatApi } from '../utils/api';
import { Message, SUGGESTED_MESSAGES } from '../utils/model';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const PRIMARY_COLOR = 'rgba(197, 110, 50, 1)';
const AGENT_BG = '#f5f5f7';
const USER_BG = PRIMARY_COLOR;

const AgentChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await chatApi.getMessages();
      if (response && response.messages) {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      content: inputMessage,
      is_user: true,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(inputMessage);
      if (response && response.response) {
        const agentMessage: Message = {
          id: Date.now() + 1,
          content: response.response,
          is_user: false,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, agentMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedMessage = (message: string) => {
    setInputMessage(message);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.is_user ? styles.userBubble : styles.agentBubble,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.is_user ? styles.userText : styles.agentText,
        ]}
      >
        {item.content}
      </Text>
      <Text style={styles.timestamp}>
        {new Date(item.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );

  const renderSuggestedMessage = ({ item }: { item: typeof SUGGESTED_MESSAGES[0] }) => (
    <TouchableOpacity
      style={styles.suggestedMessageCard}
      onPress={() => handleSuggestedMessage(item.text)}
    >
      <Text style={styles.suggestedMessageText}>{item.text}</Text>
      <Text style={styles.suggestedMessageDescription}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Start a conversation with your AI assistant
              </Text>
            </View>
          }
        />

        {messages.length === 0 && (
          <View style={styles.suggestedMessagesContainer}>
            <Text style={styles.suggestedMessagesTitle}>Suggested Messages</Text>
            <FlatList
              data={SUGGESTED_MESSAGES}
              renderItem={renderSuggestedMessage}
              keyExtractor={(item) => item.text}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedMessagesList}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type your message..."
            placeholderTextColor="#aaa"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="send" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fdfcfa',
  },
  header: {
    padding: 20,
    backgroundColor: PRIMARY_COLOR,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    maxWidth: width * 0.75,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: USER_BG,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: AGENT_BG,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  agentText: {
    color: '#222',
  },
  timestamp: {
    fontSize: 11,
    color: 'white',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 20,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    lineHeight: 24,
  },
  suggestedMessagesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  suggestedMessagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  suggestedMessagesList: {
    paddingBottom: 10,
  },
  suggestedMessageCard: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    width: 220,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestedMessageText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    color: PRIMARY_COLOR,
  },
  suggestedMessageDescription: {
    fontSize: 13,
    color: '#666',
  },
});

export default AgentChatScreen;
