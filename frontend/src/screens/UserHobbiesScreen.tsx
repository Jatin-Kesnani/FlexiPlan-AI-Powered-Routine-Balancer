import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground, // Changed for better card background potential
  Alert,
  TextInput, // Added for search
  KeyboardAvoidingView,
  Platform,
  SafeAreaView, // Ensures content avoids notches/status bars
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchUserHobbies, deleteUserHobby } from "../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Hobby } from "../utils/model"; // Assuming Hobby model is defined { id: number, name: string, category: string }

// --- Constants ---
const PRIMARY_COLOR = "rgba(197, 110, 50, 0.9)"; // Your app color
const PRIMARY_COLOR_LIGHT = "rgba(197, 110, 50, 0.1)";
const SECONDARY_COLOR = "#FFFFFF"; // White
const TEXT_COLOR_PRIMARY = "#2c3e50"; // Darker text
const TEXT_COLOR_SECONDARY = "#7f8c8d"; // Grey text
const BACKGROUND_COLOR = "#f8f9fa"; // Light background
const DELETE_COLOR = "#e74c3c"; // Red for delete actions
const CARD_SHADOW_COLOR = "#000";
const PLACEHOLDER_TEXT_COLOR = "#bdc3c7";

// Category-to-image mapping (Consider replacing placeholders with more appealing images)
// Using slightly larger placeholders for card design
const categoryImages: { [key: string]: string } = {
  Art: "https://images.unsplash.com/photo-1515405295579-ba7b45403062?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8YXJ0fGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60",
  Sports: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8c3BvcnRzfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60",
  Music: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bXVzaWN8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60",
  Tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NHx8dGVjaHxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60",
  Travel: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8dHJhdmVsfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=500&q=60",
  Cooking: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8Y29va2luZ3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60",
  Default: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTV8fGhvbGRheXxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60", // Generic pleasant image
};

const UserHobbiesScreen = () => {
  const [userHobbies, setUserHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(""); // State for search input

  useEffect(() => {
    const loadUserDataAndHobbies = async () => {
      setLoading(true); // Ensure loading is true at the start
      try {
        const storedUserId = await AsyncStorage.getItem("user_id");
        const storedUsername = await AsyncStorage.getItem("user_username");

        if (!storedUserId || !storedUsername) {
          Alert.alert(
            "Login Required",
            "User information not found. Please log in to view your hobbies."
          );
          // Optionally navigate to login screen
          // navigation.navigate('Login');
          setLoading(false); // Stop loading if user info is missing
          return;
        }

        const parsedUserId = parseInt(storedUserId, 10);
        if (isNaN(parsedUserId)) {
            Alert.alert("Error", "Invalid user ID found. Please log in again.");
            setLoading(false);
            return;
        }
        setUserId(parsedUserId);
        setUsername(storedUsername);

        const hobbiesData = await fetchUserHobbies(parsedUserId);
        setUserHobbies(hobbiesData || []); // Ensure it's an array even if API returns null/undefined
      } catch (error) {
        console.error("Failed to load user data or hobbies:", error);
        Alert.alert(
          "Loading Error",
          "Could not load your hobbies. Please try again later."
        );
        setUserHobbies([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    loadUserDataAndHobbies();
  }, []);

  // --- Delete Hobby Function with Confirmation ---
  const handleDeleteHobby = (hobbyId: number, hobbyName: string) => {
    if (!userId) {
      Alert.alert("Error", "User ID not found. Cannot delete hobby.");
      return;
    }

    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to remove "${hobbyName}" from your hobbies?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUserHobby(userId, hobbyId);
              setUserHobbies((prevHobbies) =>
                prevHobbies.filter((hobby) => hobby.id !== hobbyId)
              );
              // No need for success alert here, UI update is confirmation
              // Alert.alert("Success", "Hobby removed successfully!");
            } catch (error: any) {
              console.error("Failed to delete hobby:", error);
              Alert.alert(
                "Deletion Failed",
                `Could not remove hobby: ${error.message || "Unknown error"}`
              );
            }
          },
        },
      ]
    );
  };

  // --- Filtered Hobbies based on Search Query ---
  const filteredHobbies = useMemo(() => {
    if (!searchQuery) {
      return userHobbies; // Return all if search is empty
    }
    return userHobbies.filter((hobby) =>
      hobby.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hobby.category.toLowerCase().includes(searchQuery.toLowerCase()) // Also search category
    );
  }, [userHobbies, searchQuery]);

  // --- Render Hobby Card Item ---
  const renderItem = ({ item }: { item: Hobby }) => (
    <View style={styles.card}>
      <ImageBackground
        source={{ uri: categoryImages[item.category] || categoryImages["Default"] }}
        style={styles.cardImageBackground}
        imageStyle={styles.cardImageStyle} // Apply borderRadius to the image itself
      >
        {/* Overlay for better text readability */}
        <View style={styles.cardOverlay} />
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteHobby(item.id, item.name)} // Pass name for confirm dialog
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase touch area
        >
          <Ionicons name="trash-outline" size={22} color={SECONDARY_COLOR} />
        </TouchableOpacity>
        <View style={styles.cardContent}>
          <Text style={styles.cardHobbyName}>{item.name}</Text>
          <Text style={styles.cardHobbyCategory}>{item.category}</Text>
        </View>
      </ImageBackground>
    </View>
  );

   // --- Render Empty List Component ---
   const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="sad-outline" size={60} color={TEXT_COLOR_SECONDARY} />
      <Text style={styles.emptyText}>
        {searchQuery
          ? `No hobbies found matching "${searchQuery}".`
          : "You haven't added any hobbies yet."}
      </Text>
       {!searchQuery && (
            <Text style={styles.emptySubText}>
              Explore and add some hobbies you enjoy!
            </Text>
        )}
    </View>
  );


  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading your hobbies...</Text>
      </SafeAreaView>
    );
  }

  // --- Main Screen Render ---
  return (
     // Using SafeAreaView to avoid status bar/notches
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
      >
        {/* --- Header --- */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Your Hobbies
          </Text>
          <Text style={styles.subtitle}>Manage your collection of interests</Text>
        </View>

        {/* --- Search Input --- */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={PLACEHOLDER_TEXT_COLOR} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your hobbies..."
            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing" // iOS clear button
          />
        </View>

        {/* --- Hobbies List --- */}
        <FlatList
          data={filteredHobbies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyComponent} // Show message when list is empty
          showsVerticalScrollIndicator={false} // Hide scrollbar for cleaner look
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles --- (Enhanced "God Like" Styles)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR, // Header color extends to safe area bg
  },
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR, // Main content background
  },
  // --- Header Styles ---
  header: {
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: PRIMARY_COLOR, // Use primary color
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    alignItems: 'center', // Center align header text
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: SECONDARY_COLOR, // White text on primary background
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)", // Slightly transparent white
    textAlign: 'center',
  },
  // --- Search Input Styles ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SECONDARY_COLOR,
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 20, // Space below header
    marginBottom: 15,
    paddingHorizontal: 15,
    elevation: 3, // Android shadow
    shadowColor: CARD_SHADOW_COLOR, // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: TEXT_COLOR_PRIMARY,
  },
  // --- List Styles ---
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20, // Space at the bottom of the list
  },
  // --- Hobby Card Styles ---
  card: {
    backgroundColor: SECONDARY_COLOR,
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden', // Ensures image background respects border radius
    elevation: 4, // Android shadow
    shadowColor: CARD_SHADOW_COLOR, // iOS shadow
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  cardImageBackground: {
    height: 150, // Adjust height as needed
    justifyContent: 'flex-end', // Align content to bottom
  },
  cardImageStyle: {
    // No need for borderRadius here if overflow is hidden on parent
    resizeMode: 'cover',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject, // Cover the entire background
    backgroundColor: 'rgba(0, 0, 0, 0.40)', // Dark overlay for text contrast
    borderRadius: 15, // Match parent card's radius
  },
  cardContent: {
    padding: 15,
    position: 'relative', // Ensure content is above overlay
    zIndex: 1,
  },
  cardHobbyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: SECONDARY_COLOR, // White text on overlay
    marginBottom: 4,
  },
  cardHobbyCategory: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)", // Slightly transparent white
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: DELETE_COLOR, //'rgba(255, 107, 107, 0.8)', // Red semi-transparent
    padding: 8,
    borderRadius: 20, // Circular button
    zIndex: 2, // Ensure button is above overlay
    elevation: 3, // Add slight elevation to button
    shadowColor: CARD_SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  // --- Loading State Styles ---
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BACKGROUND_COLOR, // Use main background color
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: TEXT_COLOR_SECONDARY,
  },
  // --- Empty List Styles ---
  emptyContainer: {
      flexGrow: 1, // Takes available space if list is short
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
      marginTop: 50, // Give some space from search bar
  },
  emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: TEXT_COLOR_SECONDARY,
      textAlign: 'center',
      marginTop: 15,
      marginBottom: 5,
  },
   emptySubText: {
      fontSize: 14,
      color: PLACEHOLDER_TEXT_COLOR,
      textAlign: 'center',
  }
});

export default UserHobbiesScreen;