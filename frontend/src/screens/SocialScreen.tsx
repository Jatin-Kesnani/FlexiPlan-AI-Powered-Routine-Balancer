import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import {
  fetchUsers,
  fetchFriendshipDetails,
  sendFriendRequest,
  fetchFriendRequests,
  respondToFriendRequest,
  fetchPublicUserDetails,
} from "../utils/api";
import { User, FriendRequest } from "../utils/model";
import { useIsFocused } from "@react-navigation/native";
import { API_BASE_URL } from "../config";

const SocialTab = ({ navigation }: any) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [friendshipStatuses, setFriendshipStatuses] = useState<{
    [key: number]: string;
  }>({});
  const [activeTab, setActiveTab] = useState<"findFriends" | "requests">(
    "findFriends"
  );
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        console.error("Failed to load users:", error);
      }
    };

    const loadFriendshipStatuses = async () => {
      try {
        const data = await fetchFriendshipDetails();
        const statusMap: { [key: number]: string } = {};

        data.forEach(
          (request: { friend: number; user: number; status: string }) => {
            statusMap[request.friend] = request.status;
            statusMap[request.user] = request.status;
          }
        );

        setFriendshipStatuses(statusMap);
      } catch (error) {
        console.error("Failed to load friendship statuses:", error);
      }
    };

    const loadFriendRequests = async () => {
      try {
        const data = await fetchFriendRequests();
        setFriendRequests(data);
      } catch (error) {
        console.error("Failed to load friend requests:", error);
      }
    };

    if (isFocused) {
      loadUsers();
      loadFriendshipStatuses();
      if (activeTab === "requests") {
        loadFriendRequests();
      }
    }
  }, [isFocused, activeTab]);

  const handleSearch = (text: string) => {
    setSearchTerm(text);
    const filtered = users.filter((user) => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      return fullName.includes(text.toLowerCase());
    });
    setFilteredUsers(filtered);
  };

  const handleSendRequest = async (friendId: number) => {
    try {
      await sendFriendRequest(friendId);
      setFriendshipStatuses((prev) => ({ ...prev, [friendId]: "Pending" }));
    } catch (error) {
      console.error("Failed to send friend request:", error);
    }
  };

  const handleRespondToRequest = async (
    requestId: number,
    action: "Accept" | "Reject"
  ) => {
    try {
      await respondToFriendRequest(requestId, action);
      const updatedRequests = friendRequests.filter(
        (request) => request.id !== requestId
      );
      setFriendRequests(updatedRequests);

      const request = friendRequests.find((r) => r.id === requestId);
      if (request) {
        setFriendshipStatuses((prev) => ({
          ...prev,
          [request.friend]: action === "Accept" ? "Accepted" : "Rejected",
          [request.user]: action === "Accept" ? "Accepted" : "Rejected",
        }));
      }
    } catch (error) {
      console.error("Failed to respond to friend request:", error);
      Alert.alert("Error", "Failed to respond to friend request.");
    }
  };

  const renderFindFriendsTab = () => (
    <>
      <View style={styles.topSection}>
        <Text style={styles.heading}>Find Friends</Text>
        <TextInput
          style={styles.searchBar}
          placeholder="Search friends..."
          value={searchTerm}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          return (
            <View style={styles.listItem}>
              <Image
                source={
                  item.profile_picture
                    ? { uri: API_BASE_URL + item.profile_picture }
                    : require("../../assets/default_user.jpg")
                }
                style={styles.avatar}
              />

              <View style={styles.textContainer}>
                <Text style={styles.name}>
                  {item.first_name} {item.last_name}
                </Text>
              </View>

              {friendshipStatuses[item.id] === "Accepted" ? (
                <View style={[styles.addButton, { backgroundColor: "gray" }]}>
                  <Text style={{ color: "#FFF", textAlign: "center" }}>
                    Friends
                  </Text>
                </View>
              ) : friendshipStatuses[item.id] === "Pending" ? (
                <View
                  style={[
                    styles.addButton,
                    { backgroundColor: "rgba(40, 29, 17, 0.9)" },
                  ]}
                >
                  <Text style={{ color: "#FFF", textAlign: "center" }}>
                    Pending
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    { backgroundColor: "rgba(197, 110, 50, 0.9)" },
                  ]}
                  onPress={() => handleSendRequest(item.id)}
                >
                  <Text style={{ color: "#FFF", textAlign: "center" }}>
                    Add
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </>
  );

  const renderRequestsTab = () => (
    <>
      <View style={styles.topSection}>
        <Text style={styles.heading}>Friend Requests</Text>
      </View>

      <FlatList
        data={friendRequests}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          return (
            <View style={styles.listItem}>
              <Image
                source={
                  item.profile_picture
                    ? { uri: API_BASE_URL + "/media/" + item.profile_picture }
                    : require("../../assets/default_user.jpg")
                }
                style={styles.avatar}
              />

              <View style={styles.textContainer}>
                <Text style={styles.name}>
                  {item.first_name} {item.last_name}
                </Text>
                <Text style={styles.lastMessage}>{item.status}</Text>
              </View>

              {item.status === "Pending" && (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: "#4CAF50" },
                    ]}
                    onPress={() => handleRespondToRequest(item.id, "Accept")}
                  >
                    <Text style={{ color: "#FFF" }}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: "#F44336" },
                    ]}
                    onPress={() => handleRespondToRequest(item.id, "Reject")}
                  >
                    <Text style={{ color: "#FFF" }}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={
            activeTab === "findFriends" ? styles.activeTab : styles.inactiveTab
          }
          onPress={() => setActiveTab("findFriends")}
        >
          <Text style={styles.tabText}>Find Friends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            activeTab === "requests" ? styles.activeTab : styles.inactiveTab
          }
          onPress={() => setActiveTab("requests")}
        >
          <Text style={styles.tabText}>Requests</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "findFriends"
        ? renderFindFriendsTab()
        : renderRequestsTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(197, 110, 50, 0.7)",
  },
  activeTab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "rgba(197, 110, 50, 0.9)",
    alignItems: "center",
  },
  inactiveTab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "rgba(180, 110, 40, 0.4)",
    alignItems: "center",
  },
  tabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  topSection: {
    height: "20%",
    backgroundColor: "rgba(197, 110, 50, 0.9)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  searchBar: {
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
  },
  addButton: {
    paddingVertical: 6,
    borderRadius: 16,
    width: 100,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 8,
  },
});

export default SocialTab;
