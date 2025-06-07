import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Switch,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import UserHobbiesScreen from "./UserHobbiesScreen"; // Make sure this path is correct
import { useAuth } from "../components/AuthContext"; // Make sure this path is correct
import UserTasksScreen from "./UserTasksScreen"; // Make sure this path is correct
import LottieView from "lottie-react-native";
import FriendsScreen from "./FriendsScreen"; // Make sure this path is correct
import Login from "./LoginScreen"; // Make sure this path is correct
import { fetchPublicUserDetails } from "../utils/api";

import { Image, ScrollView, Modal } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons"; // For camera and gallery icons
import { uploadUserPfp } from "../utils/api"; // Import the uploadUserPfp API

const SettingsStack = createStackNavigator();

type RootStackParamList = {
  SettingsContent: undefined;
  UserHobbies: undefined;
  UserTasks: undefined;
  Login: undefined; // Important if you navigate to Login on logout
  FriendsScreen: undefined;
};

type SettingsScreenContentNavigationProp = NavigationProp<
  RootStackParamList,
  "SettingsContent"
>;

type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
};

// This is your main Settings screen component
const SettingsScreen = () => {
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false); // To control popup visibility

  const navigation = useNavigation<SettingsScreenContentNavigationProp>();
  const [username, setUsername] = useState<string>("");
  const [isOffDay, setIsOffDay] = useState(false);
  const { setIsLoggedIn } = useAuth(); // Get setIsLoggedIn from AuthContext
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleChooseImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "You need to allow access to your photos."
        );
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!pickerResult.canceled) {
        const newProfilePic = pickerResult.assets[0].uri;
        setProfilePic(newProfilePic);
        // Call the API to upload the profile picture
        await uploadUserPfp(newProfilePic); // Upload the profile picture
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "You need to allow access to your camera."
        );
        return;
      }
      const cameraResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!cameraResult.canceled) {
        const newProfilePic = cameraResult.assets[0].uri;
        setProfilePic(newProfilePic);
        // Call the API to upload the profile picture
        await uploadUserPfp(newProfilePic); // Upload the profile picture
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: async () => {
            try {
              // Clear AsyncStorage
              await AsyncStorage.removeItem("access_token");
              await AsyncStorage.removeItem("refresh_token");
              await AsyncStorage.removeItem("user_id");
              await AsyncStorage.removeItem("user_username");

              // Update AuthContext to indicate logout
              setIsLoggedIn(false);

              // Navigate to the Login screen.  This assumes you have a 'Login' route.
              () => navigation.navigate("Login");
            } catch (error) {
              console.error("Failed to log out:", error);
              Alert.alert("Error", "Failed to log out. Please try again.");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const settings = [
    {
      id: "1",
      title: "View Hobbies",
      action: () => navigation.navigate("UserHobbies"),
    },
    {
      id: "2",
      title: "View Tasks",
      action: () => navigation.navigate("UserTasks"),
    },
    {
      id: "4",
      title: "View Friends",
      action: () => navigation.navigate("FriendsScreen"),
    },
    { id: "7", title: "Logout", action: handleLogout },
  ];

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem("user_username");
        if (savedUsername) {
          setUsername(savedUsername);
          const userDetails = await fetchPublicUserDetails(savedUsername);
          //console.log(userDetails);
          setCurrentUser(userDetails);
          setProfilePic(userDetails.profile_picture);
        }
      } catch (error) {
        console.error("Failed to fetch username from AsyncStorage:", error);
      }
    };

    fetchUserDetails();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.profileImageWrapper}>
          <View>
            <Image
              source={
                profilePic
                  ? { uri: profilePic }
                  : require("../../assets/default_user.jpg")
              }
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 3,
                borderColor: "white",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
              }}
            />
            <TouchableOpacity
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: "#FFCC00",
                borderRadius: 15,
                padding: 5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 10,
              }}
              onPress={() => setShowPopup(true)}
            >
              <Ionicons name="camera" size={25} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.username}>
          {currentUser
            ? `${currentUser.first_name} ${currentUser.last_name}`
            : "Loading..."}
        </Text>
      </View>

      <FlatList
        data={settings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.settingItem}>
            <Text style={styles.settingTitle}>Off Day</Text>
            <Switch
              value={isOffDay}
              onValueChange={(value) => setIsOffDay(value)}
              thumbColor={isOffDay ? "#76c7c0" : "#ccc"}
              trackColor={{ false: "#e0e0e0", true: "#cceeea" }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.settingItem} onPress={item.action}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
      />
      <Modal
        visible={showPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPopup(false)}
      >
        <View style={styles.popupContainer}>
          <TouchableOpacity
            style={styles.popupOption}
            onPress={() => {
              handleTakePhoto();
              setShowPopup(false);
            }}
          >
            <Ionicons name="camera" size={30} color="white" />
            <Text style={styles.popupText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.popupOption}
            onPress={() => {
              handleChooseImage();
              setShowPopup(false);
            }}
          >
            <Ionicons name="image" size={30} color="white" />
            <Text style={styles.popupText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

// Wrapper component for the Settings stack navigator
const SettingsStackScreen = () => {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="SettingsContent"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
      <SettingsStack.Screen
        name="UserHobbies"
        component={UserHobbiesScreen}
        options={{ title: "Hobbies" }}
      />
      <SettingsStack.Screen
        name="UserTasks"
        component={UserTasksScreen}
        options={{ title: "Tasks" }}
      />
      <SettingsStack.Screen
        name="FriendsScreen"
        component={FriendsScreen}
        options={{ title: "Friends" }}
      />
    </SettingsStack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 16,
  },
  profileSection: {
    alignItems: "center",
    marginVertical: 24,
  },
  profileImageWrapper: {
    position: "relative",
    alignItems: "center",
  },
  username: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingTitle: {
    fontSize: 16,
    color: "#333",
  },
  popupContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  popupOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFCC00",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: 250,
    justifyContent: "center",
  },
  popupText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
});

export default SettingsStackScreen;