import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Alert,
  Switch,
  Dimensions,
} from "react-native";
import { ProgressBar } from "react-native-paper";
import { Checkbox } from "react-native-paper";
import { Swipeable } from "react-native-gesture-handler";
// import { Ionicons } from "@expo/vector-icons";
import Feather from "react-native-vector-icons/Feather";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage
import { RoutineData, UserRoutineResponse } from "../utils/model";
import {
  fetchUserRoutines,
  generateRoutine,
  markActivityCompleted,
  updateRoutine,
  uploadUserPfp,
  fetchPublicUserDetails,
  removeActivityFromRoutine,
} from "../utils/api";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useAuth } from "../components/AuthContext"; // Make sure this path is correct
import FriendsScreen from "./FriendsScreen"; // Make sure this path is correct

import { Image, Modal } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../config";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { color } from "react-native-elements/dist/helpers";

const SettingsStack = createStackNavigator();
const windowHeight = Dimensions.get("window").height;

type RootStackParamList = {
  SettingsContent: undefined;
  UserHobbies: undefined;
  UserTasks: undefined;
  Login: undefined;
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

type AnalysisCategory = {
  id: string;
  name: string;
  screen: string;
  lottiename: string;
};

const THEME_COLOR = "rgba(197, 110, 50, 1)";
const THEME_COLOR_LIGHT = "rgba(197, 110, 50, 0.1)";
const THEME_COLOR_DARK = "rgba(197, 110, 50, 0.8)";
const BACKGROUND_COLOR = "#F5F5F5";
const CARD_BACKGROUND = "#FFFFFF";
const TEXT_PRIMARY = "#333333";
const TEXT_SECONDARY = "#666666";

const HomeScreen = () => {
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarAnimation] = useState(new Animated.Value(250));
  const [weeklyRoutineData, setWeeklyRoutineData] =
    useState<RoutineData | null>(null);
  const [routineLoadingError, setRoutineLoadingError] =
    useState<boolean>(false);
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0); // 0 for today, -1 for yesterday, 1 for tomorrow, etc.
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const [tasks, setTasks] = useState<any[]>([]); // Tasks for the current day

  const analysisCategories = [
    {
      id: "1",
      name: "Completion Analytics",
      screen: "CompletionAnalytics",
      lottiename: "Completion",
    },
    {
      id: "2",
      name: "Time Analytics",
      screen: "TimeAnalytics",
      lottiename: "Time",
    },
    {
      id: "3",
      name: "Activity Frequency",
      screen: "ActivityFrequency",
      lottiename: "Activity",
    },
    {
      id: "4",
      name: "Weekly Patterns",
      screen: "WeeklyPatterns",
      lottiename: "Weekly",
    },
    {
      id: "5",
      name: "Time Balance",
      screen: "TimeBalance",
      lottiename: "TimeBalance",
    },
    {
      id: "6",
      name: "Consistency Score",
      screen: "ConsistencyScore",
      lottiename: "Consistency",
    },
  ];

  const handleCardPress = (item: any) => {
    setActiveRoutine(item.id);
    navigation.navigate(item.screen);
  };

  const [activeRoutine, setActiveRoutine] = useState("1");
  const navigation = useNavigation<SettingsScreenContentNavigationProp>();
  const [username, setUsername] = useState<string>("");
  const [isOffDay, setIsOffDay] = useState(false);
  const { setIsLoggedIn } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const animationRefs = useRef<{ [key: string]: LottieView | null }>({});

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
        const localImageUri = pickerResult.assets[0].uri;
        try {
          // Show a loading indicator here ideally
          const uploadResponse = await uploadUserPfp(localImageUri); // Upload the file

          if (uploadResponse && uploadResponse.profile_picture_url) {
            // Update state with the NEW public URL from the server response
            setProfilePic(uploadResponse.profile_picture_url);
            // Optionally update currentUser state if needed
          } else {
            // Handle upload failure (Alerts are shown in api.ts)
            // Maybe revert to old picture or keep local URI temporarily?
          }
          // Hide loading indicator
        } catch (error) {
          // Hide loading indicator
          console.error("Upload failed in component:", error);
          // Alert might have already been shown by api.ts
        }
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
        const localImageUri = cameraResult.assets[0].uri;
        try {
          // Show a loading indicator here ideally
          const uploadResponse = await uploadUserPfp(localImageUri); // Upload the file

          if (uploadResponse && uploadResponse.profile_picture_url) {
            // Update state with the NEW public URL from the server response
            setProfilePic(uploadResponse.profile_picture_url);
          } else {
            // Handle upload failure
          }
          // Hide loading indicator
        } catch (error) {
          // Hide loading indicator
          console.error("Upload failed in component:", error);
        }
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
  const handleGenerateRoutine = async () => {
    const savedId = await AsyncStorage.getItem("user_id");
    if (savedId === null) {
      console.log("No user_id found in AsyncStorage");
      return; // or handle accordingly
    }
    setIsOffDay(false);
    const userId = parseInt(savedId, 10);
    const newRoutineData = await generateRoutine(userId);
    if (newRoutineData === undefined) {
      console.log("Failed to generate routine");
      return;
    }
    setWeeklyRoutineData(newRoutineData);
  };

  const toggleSidebar = () => {
    if (isSidebarVisible) {
      Animated.timing(sidebarAnimation, {
        toValue: 250,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setSidebarVisible(false));
    } else {
      setSidebarVisible(true);
      Animated.timing(sidebarAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const settings = [
    {
      id: "1",
      title: "Home",
      action: toggleSidebar,
      IconFamily: "Icon",
      IconName: "home-outline",
    },
    {
      id: "2",
      title: "View Hobbies",
      action: () => navigation.navigate("UserHobbies"),
      IconFamily: "FontAwesome5",
      IconName: "hospital-symbol",
    },
    {
      id: "3",
      title: "View Tasks",
      action: () => navigation.navigate("UserTasks"),
      IconFamily: "FontAwesome",
      IconName: "tasks",
    },
    {
      id: "5",
      title: "View Friends",
      action: () => navigation.navigate("FriendsScreen"),
      IconFamily: "Icon",
      IconName: "people-outline",
    },
    {
      id: "8", // Add a new ID
      title: "Generate Routine",
      action: handleGenerateRoutine, // Call the generateRoutine function
      IconFamily: "Ionicons", // Or the appropriate icon family
      IconName: "refresh", // Choose an appropriate icon name
    },
    {
      id: "9",
      title: "Logout",
      action: handleLogout,
      IconFamily: "Icon",
      IconName: "log-out-outline",
    },
  ];

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem("user_username");
        if (savedUsername) {
          setUsername(savedUsername);
          const userDetails = await fetchPublicUserDetails(savedUsername);
          setCurrentUser(userDetails);
          if (userDetails.profile_picture != null) {
            setProfilePic(API_BASE_URL + userDetails.profile_picture);
          }
        }
      } catch (error) {
        console.error("Failed to fetch username from AsyncStorage:", error);
      }
    };

    fetchUserDetails();
  }, []);

  const handleOffDayToggle = async () => {
    const savedId = await AsyncStorage.getItem("user_id");
    if (savedId === null) {
      console.log("No user_id found in AsyncStorage");
      return; // or handle accordingly
    }

    const userId = parseInt(savedId, 10);
    try {
      if (!userId) {
        Alert.alert("Error", "User ID not available.");
        return;
      }
      setIsOffDay(!isOffDay);
      if (!isOffDay) {
        const updatedRoutine = await updateRoutine(userId);

        if (updatedRoutine) {
          setWeeklyRoutineData(updatedRoutine);
        }
      }
      fetchRoutine();
    } catch (error: any) {
      console.error("Error toggling off-day:", error);
      Alert.alert("Error", error.message || "Failed to toggle off-day.");
      // Optionally reset the toggle switch if the API call fails:
      setIsOffDay(false);
    }
  };

  const Sidebar = () => (
    <Animated.View
      style={[
        styles.sidebar,
        { transform: [{ translateX: sidebarAnimation }] },
      ]}
    >
      <TouchableOpacity
        style={styles.closeSidebarButton}
        onPress={toggleSidebar}
      >
        <Icon name="menu-outline" size={30} color="white" />
      </TouchableOpacity>
      <View style={styles.welcomeContainer}>
        <Text style={styles.brandName}>Flexiplan</Text>
      </View>
      <View style={styles.menuItems}>
        {/* <TouchableOpacity onPress={toggleSidebar} style={styles.menuItem}>
          <Icon name="home-outline" size={24} color="white" />
          <Text style={styles.menuText}>Home</Text>
        </TouchableOpacity> */}
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
          <Text
            style={{
              marginTop: 5,
              color: "white",
              fontSize: 20,
            }}
          >
            {currentUser
              ? `${currentUser.first_name} ${currentUser.last_name}`
              : "Loading..."}
          </Text>
        </View>
        <Modal
          visible={showPopup}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPopup(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            activeOpacity={1}
            onPress={() => setShowPopup(false)}
          >
            <View
              style={{
                backgroundColor: "transparent",
                padding: 20,
                width: "100%",
                alignItems: "center",
              }}
            >
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
          </TouchableOpacity>
        </Modal>
        <FlatList
          data={settings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.menuItem} onPress={item.action}>
              <View style={{ width: 33, alignItems: "center" }}>
                {item.IconFamily === "FontAwesome" ? (
                  <FontAwesome name={item.IconName} size={24} color="white" />
                ) : item.IconFamily === "FontAwesome5" ? (
                  <FontAwesome5 name={item.IconName} size={24} color="white" />
                ) : item.IconFamily === "MaterialIcons" ? (
                  <MaterialIcons name={item.IconName} size={24} color="white" />
                ) : item.IconFamily === "Ionicons" ? (
                  <Ionicons name={item.IconName} size={24} color="white" />
                ) : item.IconFamily === "Icon" ? (
                  <Icon name={item.IconName} size={24} color="white" />
                ) : null}
              </View>
              <Text style={styles.menuText}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 2,
            backgroundColor: "rgba(197, 110, 50, 0.5)",
          }}
        >
          <Text style={{ fontSize: 24, color: "#e0e0e0", fontWeight: "900" }}>
            Off Day
          </Text>
          <Switch
            value={isOffDay}
            onValueChange={handleOffDayToggle} // simplified callback
            thumbColor={isOffDay ? "#4CAF90" : "#f5f5f5"}
            trackColor={{
              false: "#e0e0e0",
              true: "#A5D6C7",
            }}
            ios_backgroundColor="#e0e0e0" // for iOS
            style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
          />
        </View>
      </View>
    </Animated.View>
  );

  const fetchRoutine = async () => {
    const data = await fetchUserRoutines();
    // console.log(JSON.stringify(data, null, 2));
    if (data && data.routine_data) {
      // Check if data and routine_data exist
      setWeeklyRoutineData(data.routine_data);
      setRoutineLoadingError(false); // Reset error state if successful
    } else {
      setWeeklyRoutineData(null); // Explicitly set to null if no data
      setRoutineLoadingError(true); // Set error state
    }
    // if data.error -> alert that user routine not found
  };

  useEffect(() => {
    fetchRoutine();
  }, []);

  useEffect(() => {
    if (weeklyRoutineData) {
      const currentDayName =
        daysOfWeek[(new Date().getDay() + currentDayIndex + 7) % 7]; // Ensure positive index
      const dailyTasks = weeklyRoutineData[currentDayName] || [];
      // console.log(JSON.stringify(weeklyRoutineData, null, 2));
      const formattedTasks = dailyTasks.map((task, index) => ({
        id: String(index), // Or generate a more unique ID if needed
        name: task.activity,
        emoji: getEmojiForType(task.type), // Function to determine emoji based on task type
        timeRange: `${task.start_time} - ${task.end_time}`,
        completed: task.is_completed,
        day: currentDayName,
      }));
      setTasks(formattedTasks);
    }
  }, [weeklyRoutineData, currentDayIndex]);

  const getEmojiForType = (type: string): string => {
    switch (type) {
      case "work":
        return "💼";
      case "personal":
        return "🧘";
      case "hobby":
        return "🎨";
      default:
        return "🗓️";
    }
  };

  const toggleTask = async (id: string, emoji: string) => {
    try {
      // Find the task in the tasks array
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      // Get the current day name based on currentDayIndex
      const currentDayName =
        daysOfWeek[(new Date().getDay() + currentDayIndex + 7) % 7];

      // Determine activity type (default to 'task' if not specified)
      const activityType = task.emoji === "🗓️" ? "task" : "hobby";

      // Call the API to mark the activity as completed/uncompleted
      await markActivityCompleted(
        currentDayName,
        task.name,
        activityType,
        !task.completed // Toggle the completed status
      );

      fetchRoutine();

      // Update local state only after successful API call
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, completed: !task.completed } : task
        )
      );
    } catch (error) {
      console.error("Error toggling task:", error);
      // Optionally show an error message to the user
      Alert.alert("Error", "Failed to update task status");
    }
  };

  // const removeTask = (id: string) => {
  //   setTasks((prev) => prev.filter((task) => task.id !== id));
  // };

  const removeTask = async (id: string) => {
    try {
      const taskToRemove = tasks.find((task) => task.id === id);
      if (!taskToRemove) return;

      // Call the API to remove the activity
      await removeActivityFromRoutine(
        taskToRemove.day,
        taskToRemove.name,
        taskToRemove.emoji === "🗓️" ? "task" : "hobby"
      );
      fetchRoutine();

      // Update local state only after successful API call
      setTasks((prev) => prev.filter((task) => task.id !== id));

      // Optional: Show success message
      Alert.alert("Success", "Activity removed successfully!");
    } catch (error) {
      console.error("Failed to remove activity:", error);
      Alert.alert("Error", "Failed to remove activity. Please try again.");
    }
  };

  const renderRightActions = () => (
    <View style={styles.fullDeleteBackground}>
      <Ionicons name="trash" size={24} color="#fff" />
    </View>
  );

  const changeDay = (direction: number) => {
    const todayDayOfWeek = new Date().getDay(); // 0 (Sunday) to 6 (Saturday)
    const daysFromMonday = (todayDayOfWeek + 6) % 7; // Days from Monday to today (0 for Monday, 6 for Sunday)
    const daysToSunday = 6 - daysFromMonday; // Days from today to Sunday (0 for Sunday, 6 for Monday)
    const minDayIndex = -daysFromMonday; // Minimum allowed currentDayIndex (for Monday)
    const maxDayIndex = daysToSunday; // Maximum allowed currentDayIndex (for Sunday)
    const newIndex = currentDayIndex + direction;

    if (newIndex >= minDayIndex && newIndex <= maxDayIndex) {
      setCurrentDayIndex(newIndex);
    }
  };

  const getCurrentDayText = () => {
    const today = new Date();
    const displayDate = new Date();
    displayDate.setDate(today.getDate() + currentDayIndex);
    const dayName = daysOfWeek[displayDate.getDay()];
    const date = displayDate.getDate();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthName = monthNames[displayDate.getMonth()];
    return `${monthName} ${date} • ${dayName}`;
  };

  const getSectionHeading = () => {
    if (currentDayIndex === 0) return "Today's To Do";
    const dayDiff = ["days ago", "day ago", "Today", "Tomorrow", "days later"];
    const indexForDiff = currentDayIndex + 2;
    const dayText =
      dayDiff[indexForDiff] ||
      (currentDayIndex > 0
        ? `${currentDayIndex} days later`
        : `${Math.abs(currentDayIndex)} days ago`);
    return `${
      daysOfWeek[(new Date().getDay() + currentDayIndex + 7) % 7]
    }'s To Do`; // Fallback for other days
  };

  const getLottieSource = (lottiename: string) => {
    switch (lottiename) {
      case "Activity":
        return require("../../lotties/Activity.json");
      case "Completion":
        return require("../../lotties/Completion.json");
      case "Time":
        return require("../../lotties/Time.json");
      case "Weekly":
        return require("../../lotties/Weekly.json");
      case "TimeBalance":
        return require("../../lotties/TimeBalance.json");
      case "Consistency":
        return require("../../lotties/Consistency.json");
      default:
        return require("../../lotties/Activity.json");
    }
  };

  const renderAnalysisCard = ({ item }: { item: AnalysisCategory }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleCardPress(item)}
      >
        <Animated.View
          style={[
            styles.routineCard,
            activeRoutine === item.id && styles.activeRoutineCard,
          ]}
        >
          <View style={styles.lottieContainer}>
            <LottieView
              ref={(ref) => (animationRefs.current[item.id] = ref)}
              source={getLottieSource(item.lottiename)}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
          </View>
          <Text style={styles.routineName}>{item.name}</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[BACKGROUND_COLOR, "rgba(197, 110, 50, 0.7)"]}
        style={styles.gradientBackground}
      >
        <TouchableOpacity style={styles.sidebarToggle} onPress={toggleSidebar}>
          <Icon name="menu-outline" size={30} color="black" />
        </TouchableOpacity>

        {isSidebarVisible && (
          <>
            <TouchableOpacity
              style={styles.overlay}
              activeOpacity={1}
              onPress={toggleSidebar}
            />
            <Sidebar />
          </>
        )}

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          <View style={styles.analysisSection}>
            <Text style={styles.sectionTitle}>Routine Analysis</Text>
            <FlatList
              data={analysisCategories}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={renderAnalysisCard}
              contentContainerStyle={styles.analysisList}
            />
          </View>

          {!weeklyRoutineData ? (
            <View style={styles.noRoutineContainer}>
              <LottieView
                source={require("../../lotties/Activity.json")}
                autoPlay
                loop
                style={styles.emptyStateAnimation}
              />
              <Text style={styles.noRoutineText}>No routine found.</Text>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerateRoutine}
              >
                <Text style={styles.generateButtonText}>Generate Routine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tasksSection}>
              <View style={styles.dateNavigation}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => changeDay(-1)}
                >
                  <Icon name="chevron-back-outline" size={24} color="#76c7c0" />
                </TouchableOpacity>
                <View style={styles.dateInfo}>
                  <Text style={styles.dateHeading}>{getSectionHeading()}</Text>
                  <Text style={styles.dateText}>{getCurrentDayText()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => changeDay(1)}
                >
                  <Icon
                    name="chevron-forward-outline"
                    size={24}
                    color="#76c7c0"
                  />
                </TouchableOpacity>
              </View>

              {tasks.map((task) => {
                if (!task.completed) {
                  return (
                    <Swipeable
                      key={task.id}
                      renderRightActions={renderRightActions}
                      onSwipeableRightOpen={() => removeTask(task.id)}
                    >
                      <Animated.View style={styles.taskItem}>
                        <View style={styles.taskAvatar}>
                          <Text style={styles.taskEmoji}>{task.emoji}</Text>
                        </View>
                        <View style={styles.taskDetails}>
                          <Text style={styles.taskName}>{task.name}</Text>
                          <Text style={styles.taskTime}>{task.timeRange}</Text>
                        </View>
                        <Checkbox
                          status={task.completed ? "checked" : "unchecked"}
                          onPress={() => toggleTask(task.id, task.emoji)}
                          color="#76c7c0"
                        />
                      </Animated.View>
                    </Swipeable>
                  );
                }
                return null;
              })}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  gradientBackground: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 60, // Add space for the status bar and menu button
  },
  analysisSection: {
    // paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: TEXT_PRIMARY,
    marginLeft: 20,
    marginBottom: 20,
  },
  analysisList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  routineCard: {
    width: 160,
    height: 200,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    marginLeft: 4,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  activeRoutineCard: {
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 2,
    borderColor: THEME_COLOR,
    shadowColor: THEME_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  lottieContainer: {
    height: 100,
    width: "100%",
    marginBottom: 16,
  },
  lottieAnimation: {
    width: "100%",
    height: "100%",
  },
  routineName: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  tasksSection: {
    padding: 20,
    paddingTop: 10,
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: THEME_COLOR_LIGHT,
    marginHorizontal: 8,
  },
  dateInfo: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 10,
  },
  dateHeading: {
    fontSize: 24,
    fontWeight: "bold",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: THEME_COLOR,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BACKGROUND,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskAvatar: {
    backgroundColor: THEME_COLOR_LIGHT,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  taskEmoji: {
    fontSize: 24,
  },
  taskDetails: {
    flex: 1,
    marginRight: 8,
  },
  taskName: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  noRoutineContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 40,
  },
  emptyStateAnimation: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  noRoutineText: {
    fontSize: 18,
    color: TEXT_PRIMARY,
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  generateButton: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: THEME_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 1,
  },
  sidebarToggle: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 2,
    padding: 12,
    // borderRadius: 20,
    // backgroundColor: THEME_COLOR_LIGHT,
  },
  welcomeContainer: {
    marginTop: 50,
    alignItems: "center",
    backgroundColor: "#222",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    width: "100%",
  },
  closeSidebarButton: {
    position: "absolute",
    left: 10,
    marginTop: 40,
  },
  brandName: {
    color: "#FFC107",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
  welcomeText: {
    color: "white",
    fontSize: 18,
    marginTop: 10,
    alignSelf: "center",
  },
  menuItems: {
    marginTop: 20,
    height: "80%",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  menuText: {
    color: "white",
    fontSize: 16,
    marginLeft: 10,
  },
  sidebar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: "rgba(197, 110, 50, 1)",
    zIndex: 2,
    paddingHorizontal: 15,
    paddingVertical: 30,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  profileSection: {
    alignItems: "center",
  },
  profileImageWrapper: {
    position: "relative",
    alignItems: "center",
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
  fullDeleteBackground: {
    flex: 1,
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
});
