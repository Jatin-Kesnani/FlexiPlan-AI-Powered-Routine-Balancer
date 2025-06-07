import React, { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  StatusBar,
  Animated,
  Dimensions,
  SafeAreaView,
} from "react-native"
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native"
import { RootStackParamList } from "../../App"
import {
  fetchMessages,
  sendMessage as sendMessageAPI,
  markMessagesAsRead,
  fetchPublicUserDetails,
} from "../utils/api"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_BASE_URL } from "../config"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import * as Animatable from "react-native-animatable"

const { width } = Dimensions.get("window")

const COLORS = {
  primary: "#FF7D54",
  primaryGradient: ["#FF7D54", "#F55B45"],
  secondary: "#4ECDC4",
  secondaryGradient: ["#4ECDC4", "#2EBFB3"],
  background: "#FFFFFF",
  inputBackground: "#F8F9FB",
  senderBubble: "#FF7D54",
  receiverBubble: "#F0F2F5",
  textLight: "#FFFFFF",
  textDark: "#2A3950",
  textSecondary: "#6B7A99",
  border: "#E5E9F2",
  success: "#4CAF50",
  error: "#FF4D4D",
  inactive: "#A0A8B1",
}

type ChatScreenRouteProp = RouteProp<RootStackParamList, "Chats">

type Message = {
  id: number
  sender: { username: string; id: number }
  receiver: { username: string; id: number }
  message: string
  timestamp: string
  read: boolean
}

type User = {
  id: number
  username: string
  first_name: string
  last_name: string
  profile_picture?: string | null
}

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>()
  const navigation = useNavigation()
  const { friendId, friendName, friendAvatar } = route.params

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [friendDetails, setFriendDetails] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const flatListRef = useRef<FlatList>(null)
  const inputHeight = useRef(new Animated.Value(42)).current

  useEffect(() => {
    const getUsername = async () => {
      const savedUsername = await AsyncStorage.getItem("user_username")
      setCurrentUsername(savedUsername)
    }
    getUsername()
  }, [])

  useEffect(() => {
    const loadFriendDetails = async () => {
      if (friendName) {
        try {
          const details = await fetchPublicUserDetails(friendName)
          setFriendDetails(details)
        } catch {
          setFriendDetails({
            id: friendId,
            username: friendName,
            first_name: friendName,
            last_name: "",
            profile_picture: friendAvatar,
          })
        }
      } else {
        setFriendDetails({
          id: friendId,
          username: friendName || "Friend",
          first_name: friendName || "Friend",
          last_name: "",
          profile_picture: friendAvatar,
        })
      }
    }
    loadFriendDetails()

    // Simulate typing indicator randomly
    const typingInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 3000)
      }
    }, 10000)

    return () => clearInterval(typingInterval)
  }, [friendId, friendName, friendAvatar])

  const scrollToBottom = () => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true })
    }
  }

  useEffect(() => {
    const initChat = async () => {
      if (!friendId || !currentUsername) return

      setLoading(true)
      try {
        const msgs = await fetchMessages(friendId)
        const sortedMsgs = msgs.sort(
          (a: Message, b: Message) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )

        setMessages(sortedMsgs)
        await markMessagesAsRead(friendId)
        setTimeout(scrollToBottom, 300)
      } catch (err) {
        Alert.alert("Error", "Could not load chat messages.")
      } finally {
        setLoading(false)
      }
    }

    if (currentUsername) initChat()
  }, [friendId, currentUsername])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !currentUsername) return

    setSending(true)
    const optimisticMessage: Message = {
      id: Date.now(),
      sender: { username: currentUsername, id: 0 },
      receiver: { username: friendDetails?.username || "", id: friendId },
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage("")
    Keyboard.dismiss()

    setTimeout(scrollToBottom, 100)

    try {
      await sendMessageAPI(friendId, optimisticMessage.message)
    } catch (err) {
      Alert.alert("Error", "Message could not be sent.")
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      )
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }

  const shouldShowDate = (index: number): boolean => {
    if (index === 0) return true

    const currentDate = new Date(messages[index].timestamp).toDateString()
    const prevDate = new Date(messages[index - 1].timestamp).toDateString()

    return currentDate !== prevDate
  }

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const isSender = item.sender.username === currentUsername
    const showDate = shouldShowDate(index)

    return (
      <Animatable.View animation={isSender ? "fadeInRight" : "fadeInLeft"} duration={300} delay={50}>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          </View>
        )}
        <View
          style={[
            styles.chatBubbleBase,
            isSender ? styles.senderBubble : styles.receiverBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isSender ? styles.senderText : styles.receiverText,
            ]}
          >
            {item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isSender ? styles.senderTime : styles.receiverTime,
              ]}
            >
              {formatTime(item.timestamp)}
            </Text>
            {isSender && (
              <Ionicons
                name={item.read ? "checkmark-done" : "checkmark"}
                size={16}
                color={item.read ? COLORS.success : "rgba(255, 255, 255, 0.7)"}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </Animatable.View>
    )
  }

  const handleInputChange = (text: string) => {
    setNewMessage(text)
    
    // Animate input height based on content
    const newLines = text.split('\n').length
    const newHeight = Math.min(42 + (newLines - 1) * 20, 120)
    
    Animated.timing(inputHeight, {
      toValue: newHeight,
      duration: 100,
      useNativeDriver: false,
    }).start()
  }

  const friendDisplayName = friendDetails
    ? `${friendDetails.first_name || ""} ${
        friendDetails.last_name || ""
      }`.trim()
    : friendName || "Chat"
  const finalFriendAvatar = friendDetails?.profile_picture || friendAvatar

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <LinearGradient
          colors={COLORS.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
          
          <View style={styles.avatarContainer}>
            <Image
              source={
                finalFriendAvatar
                  ? { uri: API_BASE_URL + finalFriendAvatar }
                  : require("../../assets/default_user.jpg")
              }
              style={styles.avatar}
            />
            {isOnline && <View style={styles.onlineIndicator} />}
          </View>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.friendName} numberOfLines={1}>
              {friendDisplayName}
            </Text>
            <Text style={styles.statusText}>
              {isOnline ? (isTyping ? "typing..." : "online") : "offline"}
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => Alert.alert("Call", "Voice call feature coming soon")}
            >
              <Ionicons name="call" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => Alert.alert("Video", "Video call feature coming soon")}
            >
              <Ionicons name="videocam" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => Alert.alert("Menu", "Menu options not implemented yet.")}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessageItem}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContainer}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={80} color={COLORS.inactive} />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>Start the conversation with {friendDisplayName}</Text>
              </View>
            }
          />
        )}

        {isTyping && !loading && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotMiddle]} />
              <View style={styles.typingDot} />
            </View>
          </View>
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          
          <View style={styles.inputContainer}>
            <Animated.View style={{ height: inputHeight }}>
              <TextInput
                style={[styles.input, { height: '100%' }]}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.textSecondary}
                value={newMessage}
                onChangeText={handleInputChange}
                multiline
                editable={!sending}
              />
            </Animated.View>
            
            {/* <TouchableOpacity style={styles.emojiButton}>
              <Ionicons name="happy-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity> */}
          </View>
          
          <TouchableOpacity
            style={[
              styles.sendButtonContainer,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.textLight} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.textLight} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === "ios" ? 12 : 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  friendName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
  },
  menuButton: {
    padding: 8,
    marginLeft: 4,
  },
  chatList: {
    flex: 1,
  },
  chatListContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    backgroundColor: 'rgba(240, 242, 245, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chatBubbleBase: {
    maxWidth: "80%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
    minWidth: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  senderBubble: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.senderBubble,
    borderBottomRightRadius: 4,
  },
  receiverBubble: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.receiverBubble,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  senderText: {
    color: COLORS.textLight,
  },
  receiverText: {
    color: COLORS.textDark,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  messageTime: {
    fontSize: 12,
  },
  senderTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  receiverTime: {
    color: COLORS.textSecondary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  attachButton: {
    padding: 8,
    marginRight: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingLeft: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textDark,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 120,
  },
  emojiButton: {
    padding: 8,
  },
  sendButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.inactive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.receiverBubble,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    width: 70,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 2,
    opacity: 0.6,
    transform: [{ scale: 0.9 }],
  },
  typingDotMiddle: {
    opacity: 0.8,
    transform: [{ scale: 1 }],
  },
})

export default ChatScreen
