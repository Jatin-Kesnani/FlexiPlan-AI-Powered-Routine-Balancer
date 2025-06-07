import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  fetchFriendRequests,
  respondToFriendRequest,
  fetchUsers,
} from "../utils/api";
import { FriendRequest } from "../utils/model";

interface FriendRequestItemProps {
  item: FriendRequest;
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
  users: any[];
}

const FriendRequestItem = (props: FriendRequestItemProps) => {
  const { item, onAccept, onReject, users } = props;

  const sender = users.find((user) => user.id === item.user);

  if (!sender) {
    return <Text>Sender information not found.</Text>;
  }

  return (
    <View style={styles.friendRequestItem}>
      <Image
        source={
          sender.profile_picture
            ? { uri: sender.profile_picture }
            : require("../../assets/default_user.jpg")
        }
        style={styles.profilePicture}
      />
      <View style={styles.requestDetails}>
        <Text style={styles.username}>{item.sender_username}</Text>
        <Text style={styles.displayName}>
          {sender.displayName || sender.username}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => onAccept(item.id)}
        >
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => onReject(item.id)}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const FriendRequestsScreen = () => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const loadFriendRequests = useCallback(async () => {
    setLoading(true);
    try {
      const requests = await fetchFriendRequests();
      setFriendRequests(requests);

      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error loading friend requests:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFriendRequests();
      return () => {
        // Clean up if needed
      };
    }, [loadFriendRequests])
  );

  useEffect(() => {
    loadFriendRequests();
  }, [loadFriendRequests]);

  const handleAcceptRequest = async (requestId: number) => {
    try {
      setLoading(true);
      await respondToFriendRequest(requestId, "Accept");
      setFriendRequests((prevRequests) =>
        prevRequests.filter((req) => req.id !== requestId)
      );
      Alert.alert("Success", "Friend request accepted!");
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", error.message || "Failed to accept friend request.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      setLoading(true);
      await respondToFriendRequest(requestId, "Reject");
      setFriendRequests((prevRequests) =>
        prevRequests.filter((req) => req.id !== requestId)
      );
      Alert.alert("Success", "Friend request rejected!");
    } catch (error: any) {
      console.error("Error rejecting friend request:", error);
      Alert.alert("Error", error.message || "Failed to reject friend request.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFriendRequests();
  }, [loadFriendRequests]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading Friend Requests...</Text>
      </View>
    );
  }

  if (friendRequests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No friend requests yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={friendRequests}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FriendRequestItem
            item={item}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
            users={users}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
  },
  friendRequestItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  requestDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  displayName: {
    fontSize: 14,
    color: "#666",
  },
  buttonContainer: {
    flexDirection: "row",
  },
  acceptButton: {
    backgroundColor: "#28a745",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginRight: 5,
  },
  rejectButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
});

export default FriendRequestsScreen;
