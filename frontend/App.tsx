// App.tsx
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"; // Import Bottom Tabs
import SignupScreen from "./src/screens/SignupScreen";
import LoginScreen from "./src/screens/LoginScreen";
import { AuthProvider, useAuth } from "./src/components/AuthContext";
import RoutineSetupScreen from "./src/screens/RoutineSetupScreen";
import ChatScreen from "./src/screens/ChatScreen";
import UserHobbiesScreen from "./src/screens/UserHobbiesScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text } from "react-native";
import { IntroductionAnimationScreen } from "./src/introduction_animation";
import HomeScreen from "./src/screens/HomeScreen";
import ExploreHobbiesScreen from "./src/screens/ExploreScreen";
import SocialScreen from "./src/screens/SocialScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import UserTasksScreen from "./src/screens/UserTasksScreen";
import AddTaskScreen from "./src/screens/AddTaskScreen";
import FriendsScreen from "./src/screens/FriendsScreen";
import FriendRequestsScreen from "./src/screens/FriendRequestsScreen";
import AgentChatScreen from "./src/screens/AgentChatScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import Icon from "react-native-vector-icons/Ionicons"; // Example: using Ionicons

import ActivityFrequencyScreen from "./src/screens/RoutineAnalysis/ActivityFrequencyScreen";
import CompletionAnalyticsScreen from "./src/screens/RoutineAnalysis/CompletionAnalyticsScreen";
import TimeAnalyticsScreen from "./src/screens/RoutineAnalysis/TimeAnalyticsScreen";
import TimeBalanceScreen from "./src/screens/RoutineAnalysis/TimeBalanceScreen";
import ConsistencyScoreScreen from "./src/screens/RoutineAnalysis/ConsistencyScoreScreen";
import WeeklyPatternsScreen from "./src/screens/RoutineAnalysis/WeeklyPatternsScreen";

export type RootStackParamList = {
  TabNavigator: undefined;
  HomeScreen: undefined;
  ExploreScreen: undefined;
  SocialScreen: undefined;
  SettingsScreen: undefined;
  UserHobbies: undefined;
  UserTasks: undefined;
  AddUserTask: undefined;
  onBoarding: undefined;
  Signup: undefined;
  Login: undefined;
  FriendsScreen: undefined;
  FriendRequests: undefined;
  Social: undefined;
  Chats: { friendId: number; friendName: string; friendAvatar: string; };
  Assistant: undefined;
  Analytics: undefined;
  CompletionAnalytics: undefined;
  TimeAnalytics: undefined;
  ActivityFrequency: undefined;
  TimeBalance: undefined;
  ConsistencyScore: undefined;
  WeeklyPatterns: undefined;
};

export type SocialStackParamList = {
  SocialHome: undefined; // This corresponds to the main SocialScreen
  FriendRequests: undefined;
  FriendsScreen: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator(); // Create the Bottom Tab Navigator
const SocialStack = createStackNavigator<SocialStackParamList>();

// Nested Stack Navigator for Social Tab
function SocialStackNavigator() {
  return (
    <SocialStack.Navigator screenOptions={{ headerShown: false }}>
      <SocialStack.Screen name="SocialHome" component={SocialScreen} />
      <SocialStack.Screen name="FriendRequests" component={FriendRequestsScreen} />
      <SocialStack.Screen name="FriendsScreen" component={FriendsScreen} />
    </SocialStack.Navigator>
  );
}
// function ChatStack() {
//     return (
//         <Stack.Navigator screenOptions={{ headerShown: false }}>
//             <Stack.Screen name="Chats" component={ChatScreen}  />
//         </Stack.Navigator>
//     )
// }

// Bottom Tab Navigator (Main Navigation)
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string | undefined;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Explore") {
            iconName = focused ? "compass" : "compass-outline";
          } else if (route.name === "Social") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Assistant") {
            iconName = focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline";
          } 
          // else if (route.name === "Analytics") {
          //   iconName = focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline";
          // }

          return (
            <Icon name={iconName || "help-circle"} size={size} color={color} />
          );
        },
        tabBarActiveTintColor: "tomato",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreHobbiesScreen} />
      <Tab.Screen name="Social" component={SocialStackNavigator} />
      <Tab.Screen name="Assistant" component={AgentChatScreen} />
      {/* <Tab.Screen name="Analytics" component={AnalyticsScreen} /> */}
    </Tab.Navigator>
  );
}

const AppNavigator = () => {
  const { isLoggedIn, setIsLoggedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);
  // const [showIntro, setShowIntro] = useState(false); // Consider removing if not needed

  useEffect(() => {
    const checkIntroductionScreen = async () => {
      try {
        const introSeen = await AsyncStorage.getItem("hasSeenIntro");
        if (!hasSeenIntro) {
          setHasSeenIntro(!!introSeen); // Consider removing if intro is handled elsewhere
        }
      } catch (error) {
        console.error("Error checking introduction screen:", error);
      }
    };

    const loadAuthToken = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("access_token");
        setIsLoggedIn(!!accessToken); // More concise way to set boolean
      } catch (error) {
        console.error("Error loading auth token:", error);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkIntroductionScreen();
    loadAuthToken();
  }, [setIsLoggedIn]);

  if (loading || hasSeenIntro === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasSeenIntro ? (
          <>
            <Stack.Screen
              name="onBoarding"
              component={IntroductionAnimationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : isLoggedIn ? (
          <>
            <Stack.Screen name="TabNavigator" component={MainTabNavigator} />
            <Stack.Screen name="UserHobbies" component={UserHobbiesScreen} />
            <Stack.Screen name="UserTasks" component={UserTasksScreen} />
            <Stack.Screen name="AddUserTask" component={AddTaskScreen} />
            <Stack.Screen name="Chats" component={ChatScreen} />
            <Stack.Screen name="FriendsScreen" component={FriendsScreen} />
            <Stack.Screen name="Assistant" component={AgentChatScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="CompletionAnalytics" component={CompletionAnalyticsScreen} />
            <Stack.Screen name="TimeAnalytics" component={TimeAnalyticsScreen} />
            <Stack.Screen name="ActivityFrequency" component={ActivityFrequencyScreen} />
            <Stack.Screen name="TimeBalance" component={TimeBalanceScreen} />
            <Stack.Screen name="ConsistencyScore" component={ConsistencyScoreScreen} />
            <Stack.Screen name="WeeklyPatterns" component={WeeklyPatternsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;
