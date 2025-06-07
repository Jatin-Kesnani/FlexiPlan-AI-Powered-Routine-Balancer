"use client"

import { useCallback, useEffect, useState } from "react"
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  type ListRenderItem,
  TouchableOpacity,
  Alert,
  Image,
  Animated,
  StatusBar,
  Platform,
  Modal,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from "react-native"
import { fetchFriends, removeFriend, fetchFriendRoutine } from "../utils/api"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { RootStackParamList } from "../../App"
import type { StackNavigationProp } from "@react-navigation/stack"
import * as Animatable from "react-native-animatable"
import { API_BASE_URL } from "../config"
import { LinearGradient } from "expo-linear-gradient"

// Types
interface Friend {
  id: number
  name: string
  first_name: string
  last_name: string
  profile_picture: string
}

interface FriendRoutine {
  friend_id: number
  friend_username: string
  friend_name: string
  profile_picture: string
  routine_data: {
    [key: string]: Array<{
      activity: string
      type: string
      time?: string
    }>
  }
}

interface FriendsScreenState {
  friends: Friend[]
  loading: boolean
  refreshing: boolean
  error: string | null
}

// Constants - Modern color palette
const PRIMARY_COLOR = "#FF7D54"
const PRIMARY_GRADIENT = ["#FF7D54", "#F55B45"]
const SECONDARY_COLOR = "#2A3950"
const ACCENT_COLOR = "#4ECDC4"
const BACKGROUND_COLOR = "#F9F9FB"
const CARD_BACKGROUND = "#FFFFFF"
const TEXT_PRIMARY = "#2A3950"
const TEXT_SECONDARY = "#6B7A99"
const TEXT_LIGHT = "#FFFFFF"
const ERROR_COLOR = "#FF4D4D"
const SUCCESS_COLOR = "#4CAF50"
const BORDER_COLOR = "#E5E9F2"

const { width } = Dimensions.get("window")

// Components
function EmptyState() {
  return (
    <Animatable.View animation="fadeIn" style={styles.emptyState}>
      <Animatable.View animation="pulse" easing="ease-out" iterationCount="infinite" duration={2000}>
        <Ionicons name="people-outline" size={90} color={PRIMARY_COLOR} />
      </Animatable.View>
      <Text style={styles.emptyStateTitle}>No connections yet</Text>
      <Text style={styles.emptyStateSubtext}>Connect with friends to see their routines and chat with them</Text>
      <TouchableOpacity style={styles.emptyStateButton}>
        <LinearGradient
          colors={PRIMARY_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Ionicons name="person-add" size={20} color={TEXT_LIGHT} style={{ marginRight: 8 }} />
          <Text style={styles.emptyStateButtonText}>Find Friends</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  )
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Animatable.View animation="fadeIn" style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={60} color={ERROR_COLOR} />
      <Text style={styles.errorTitle}>Connection Error</Text>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
        <LinearGradient
          colors={PRIMARY_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Ionicons name="refresh" size={18} color={TEXT_LIGHT} style={{ marginRight: 8 }} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  )
}

function RoutineModal({
  visible,
  onClose,
  routine,
}: { visible: boolean; onClose: () => void; routine: FriendRoutine | null }) {
  if (!routine) return null

  const profilePicture = routine.profile_picture
    ? { uri: API_BASE_URL + routine.profile_picture }
    : require("../../assets/default_user.jpg")

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLine} />
            <View style={styles.modalProfile}>
              <Image source={profilePicture} style={styles.modalAvatar} />
              <View>
                <Text style={styles.modalName}>{routine.friend_name}</Text>
                <Text style={styles.modalSubtitle}>Daily Routine</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.routineScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.routineScrollContent}
          >
            {Object.entries(routine.routine_data).map(([day, activities]) => (
              <Animatable.View key={day} animation="fadeInUp" delay={200} style={styles.dayContainer}>
                <View style={styles.dayHeaderContainer}>
                  <View style={styles.dayIndicator} />
                  <Text style={styles.dayTitle}>{day}</Text>
                </View>
                {activities.map((activity, index) => (
                  <Animatable.View
                    key={index}
                    animation="fadeInRight"
                    delay={300 + index * 100}
                    style={styles.activityItem}
                  >
                    <View
                      style={[
                        styles.activityIcon,
                        {
                          backgroundColor:
                            activity.type === "task" ? "rgba(78, 205, 196, 0.1)" : "rgba(255, 125, 84, 0.1)",
                        },
                      ]}
                    >
                      <Ionicons
                        name={activity.type === "task" ? "checkmark-circle" : "star"}
                        size={20}
                        color={activity.type === "task" ? ACCENT_COLOR : PRIMARY_COLOR}
                      />
                    </View>
                    <View style={styles.activityDetails}>
                      <Text style={styles.activityName}>{activity.activity}</Text>
                      {activity.time && (
                        <View style={styles.timeContainer}>
                          <Ionicons name="time-outline" size={14} color={TEXT_SECONDARY} />
                          <Text style={styles.activityTime}>{activity.time}</Text>
                        </View>
                      )}
                    </View>
                  </Animatable.View>
                ))}
              </Animatable.View>
            ))}
          </ScrollView>
        </Animatable.View>
      </View>
    </Modal>
  )
}

function FriendItem({
  friend,
  onRemove,
  onPress,
}: { friend: Friend; onRemove: (id: number) => void; onPress: (friend: Friend) => void }) {
  const scale = useState(new Animated.Value(1))[0]
  const [routineModalVisible, setRoutineModalVisible] = useState(false)
  const [routine, setRoutine] = useState<FriendRoutine | null>(null)
  const [loadingRoutine, setLoadingRoutine] = useState(false)

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 50,
      friction: 5,
    }).start()
  }, [scale])

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 5,
    }).start()
  }, [scale])

  const handleCardPress = useCallback(async () => {
    try {
      setLoadingRoutine(true)
      const routineData = await fetchFriendRoutine(friend.id)
      setRoutine(routineData)
      setRoutineModalVisible(true)
    } catch (error) {
      Alert.alert("Alert", "Friend's routine does not exist")
    } finally {
      setLoadingRoutine(false)
    }
  }, [friend.id])

  const handleChatPress = useCallback(() => {
    onPress(friend)
  }, [friend, onPress])

  const profilePicture = friend.profile_picture
    ? { uri: API_BASE_URL + friend.profile_picture }
    : require("../../assets/default_user.jpg")

  return (
    <Animatable.View animation="fadeInUp" duration={300} delay={(friend.id * 50) % 300}>
      <Animated.View style={[{ transform: [{ scale }] }]}>
        <TouchableOpacity
          style={styles.friendItem}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleCardPress}
          activeOpacity={0.9}
        >
          <View style={styles.avatarContainer}>
            <Image source={profilePicture} style={styles.avatar} />
            <View style={styles.statusDot} />
          </View>

          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>
              {friend.first_name} {friend.last_name}
            </Text>
            <View style={styles.friendSubtitleContainer}>
              <Ionicons name="calendar-outline" size={14} color={TEXT_SECONDARY} style={{ marginRight: 4 }} />
              <Text style={styles.friendSubtitle}>View daily routine</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleChatPress}
              style={styles.chatButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <LinearGradient colors={["#4ECDC4", "#2EBFB3"]} style={styles.iconButton}>
                <Ionicons name="chatbubble" size={18} color={TEXT_LIGHT} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onRemove(friend.id)}
              style={styles.removeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.removeIconButton}>
                <Ionicons name="close" size={18} color={ERROR_COLOR} />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <RoutineModal visible={routineModalVisible} onClose={() => setRoutineModalVisible(false)} routine={routine} />
    </Animatable.View>
  )
}

function FriendsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const [state, setState] = useState<FriendsScreenState>({
    friends: [],
    loading: true,
    refreshing: false,
    error: null,
  })

  const loadFriends = useCallback(async (isRefreshing = false) => {
    try {
      setState((prev) => ({
        ...prev,
        loading: !isRefreshing,
        refreshing: isRefreshing,
        error: null,
      }))
      const friendsList = await fetchFriends()
      setState((prev) => ({
        ...prev,
        friends: friendsList,
        loading: false,
        refreshing: false,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to load connections",
        loading: false,
        refreshing: false,
      }))
    }
  }, [])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  const handleRefresh = useCallback(() => {
    loadFriends(true)
  }, [loadFriends])

  const handleRemoveFriend = useCallback(async (friendId: number) => {
    Alert.alert(
      "Remove Connection",
      "Are you sure you want to disconnect from this friend?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFriend(friendId)
              setState((prev) => ({
                ...prev,
                friends: prev.friends.filter((friend) => friend.id !== friendId),
              }))
            } catch (error) {
              Alert.alert("Error", "Failed to disconnect. Please try again.")
            }
          },
        },
      ],
      { cancelable: true },
    )
  }, [])

  const handlePressFriend = useCallback(
    (friend: Friend) => {
      navigation.navigate("Chats", {
        friendId: friend.id,
        friendName: friend.name,
        friendAvatar: friend.profile_picture,
      })
    },
    [navigation],
  )

  const renderItem: ListRenderItem<Friend> = useCallback(
    ({ item }) => <FriendItem friend={item} onRemove={handleRemoveFriend} onPress={handlePressFriend} />,
    [handleRemoveFriend, handlePressFriend],
  )

  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
        <Animatable.View animation="fadeIn">
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </Animatable.View>
        <Animatable.Text animation="fadeIn" delay={300} style={styles.loadingText}>
          Loading Connections
        </Animatable.Text>
        <Animatable.View animation="fadeIn" delay={600} style={styles.loadingDots}>
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            style={[styles.loadingDot, { backgroundColor: PRIMARY_COLOR }]}
          />
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            delay={200}
            style={[styles.loadingDot, { backgroundColor: PRIMARY_COLOR, opacity: 0.8 }]}
          />
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            delay={400}
            style={[styles.loadingDot, { backgroundColor: PRIMARY_COLOR, opacity: 0.6 }]}
          />
        </Animatable.View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />

      <View style={styles.container}>
        <LinearGradient colors={PRIMARY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <View style={styles.headerContent}>
            <Animatable.Text animation="fadeIn" style={styles.title}>
              My Connections
            </Animatable.Text>

            <View style={styles.statsContainer}>
              <Animatable.View animation="fadeIn" delay={200} style={styles.statItem}>
                <Text style={styles.statNumber}>{state.friends.length}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </Animatable.View>
            </View>
          </View>
        </LinearGradient>

        {state.error ? (
          <ErrorView message={state.error} onRetry={() => loadFriends()} />
        ) : (
          <View style={styles.contentContainer}>
            <View style={styles.listHeader}>
              <View style={styles.listTitleContainer}>
                <Ionicons name="people" size={20} color={PRIMARY_COLOR} style={{ marginRight: 8 }} />
                <Text style={styles.listTitle}>
                  {state.friends.length > 0
                    ? `${state.friends.length} Connection${state.friends.length !== 1 ? "s" : ""}`
                    : "No Connections"}
                </Text>
              </View>

              <TouchableOpacity style={styles.addButton}>
                <LinearGradient
                  colors={PRIMARY_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <Ionicons name="person-add" size={18} color={TEXT_LIGHT} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <FlatList
              data={state.friends}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={
                <RefreshControl
                  refreshing={state.refreshing}
                  onRefresh={handleRefresh}
                  tintColor={PRIMARY_COLOR}
                  colors={[PRIMARY_COLOR]}
                />
              }
              ListEmptyComponent={EmptyState}
              contentContainerStyle={[styles.listContent, state.friends.length === 0 && styles.emptyListContent]}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

// Enhanced Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  loadingDots: {
    flexDirection: "row",
    marginTop: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: TEXT_LIGHT,
    textAlign: "center",
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: 100,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_LIGHT,
  },
  statLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  listTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  addButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 20,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "rgba(255, 125, 84, 0.2)",
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: SUCCESS_COLOR,
    borderWidth: 2,
    borderColor: CARD_BACKGROUND,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: "bold",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  friendSubtitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  friendSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  removeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 77, 77, 0.1)",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginTop: 20,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  emptyStateButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateButtonText: {
    color: TEXT_LIGHT,
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 77, 0.2)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: ERROR_COLOR,
    marginTop: 10,
  },
  errorText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: TEXT_LIGHT,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    width: "100%",
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    alignItems: "center",
  },
  modalHeaderLine: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E9F2",
    borderRadius: 3,
    marginBottom: 16,
  },
  modalProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  modalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "rgba(255, 125, 84, 0.2)",
  },
  modalName: {
    fontSize: 20,
    fontWeight: "bold",
    color: TEXT_PRIMARY,
  },
  modalSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  closeButton: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 8,
  },
  routineScroll: {
    maxHeight: "100%",
  },
  routineScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  dayContainer: {
    marginBottom: 24,
  },
  dayHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dayIndicator: {
    width: 4,
    height: 20,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
    marginRight: 8,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: TEXT_PRIMARY,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "rgba(0, 0, 0, 0.05)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: "500",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activityTime: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
})

export default FriendsScreen
