import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchHobbies, addUserHobby } from "../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Hobby } from "../utils/model";

// --- Color Palette ---
const PRIMARY_COLOR = "rgba(197, 110, 50, 0.9)";
const PRIMARY_COLOR_LIGHT = "rgba(197, 110, 50, 0.1)";
const BACKGROUND_COLOR = "#F8F8F8";
const CARD_BACKGROUND_COLOR = "#FFFFFF";
const TEXT_COLOR_PRIMARY = "#333333";
const TEXT_COLOR_SECONDARY = "#666666";
const BORDER_COLOR = "#E0E0E0";
const ICON_COLOR_LIGHT = "#FFFFFF";
const ERROR_COLOR = "#D32F2F";

// Error states type
type ErrorState = {
  hasError: boolean;
  message?: string;
  isCritical?: boolean;
};

const ExploreHobbiesScreen = () => {
  const [allHobbies, setAllHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<ErrorState>({ hasError: false });

  // Helper function for consistent error handling
  const handleError = (error: any, context: string, isCritical = false) => {
    console.error(`Error in ${context}:`, error);

    let errorMessage = "An unexpected error occurred.";
    if (typeof error === "string") {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    setError({
      hasError: true,
      message: errorMessage,
      isCritical,
    });

    if (isCritical) {
      Alert.alert("Error", errorMessage, [
        {
          text: "OK",
          onPress: () => {
            // Potentially navigate back or to a safe screen
            // if the error is critical
          },
        },
      ]);
    }
  };

  // Reset error state
  const resetError = () => {
    setError({ hasError: false });
  };

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      resetError();

      try {
        const storedUserId = await AsyncStorage.getItem("user_id");
        if (storedUserId) {
          setUserId(parseInt(storedUserId, 10));
        } else {
          console.warn("User ID not found in storage.");
          // Non-critical error - user can still browse hobbies
          setError({
            hasError: true,
            message: "You need to be logged in to add hobbies.",
            isCritical: false,
          });
        }

        const data = await fetchHobbies();
        if (!data || !Array.isArray(data)) {
          throw new Error("Invalid data format received from server");
        }
        setAllHobbies(data);
      } catch (err) {
        handleError(err, "loadData", true); // Critical error
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter and group hobbies based on search query
  const displayedGroupedHobbies = useMemo(() => {
    try {
      const filtered = searchQuery
        ? allHobbies.filter(
            (hobby) =>
              hobby.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              hobby.category?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : allHobbies;

      // Group the filtered hobbies
      const grouped: { [key: string]: Hobby[] } = {};
      filtered.forEach((hobby) => {
        if (!hobby.category) {
          console.warn("Hobby missing category:", hobby);
          return;
        }
        if (!grouped[hobby.category]) {
          grouped[hobby.category] = [];
        }
        grouped[hobby.category].push(hobby);
      });
      return grouped;
    } catch (err) {
      handleError(err, "filterAndGroupHobbies");
      return {};
    }
  }, [allHobbies, searchQuery]);

  const handleAddHobby = async (hobbyId: number, hobbyName: string) => {
    if (!userId) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to add hobbies.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Login",
            onPress: () => {
              /* navigation.navigate("Login") */
            },
          },
        ]
      );
      return;
    }

    try {
      await addUserHobby(userId, hobbyId);
      Alert.alert("Success!", `${hobbyName} added to your hobbies.`);
    } catch (err: any) {
      const message = err?.message || "";
      const alreadyAdded =
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("exists");

      Alert.alert(
        alreadyAdded ? "Hobby Already Added" : "Failed to Add Hobby",
        alreadyAdded ? `${hobbyName} is already in your list.` : message,
        [
          { text: "OK" },
          ...(alreadyAdded
            ? []
            : [
                {
                  text: "Try Again",
                  onPress: () => handleAddHobby(hobbyId, hobbyName),
                },
              ]),
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading Hobbies...</Text>
      </View>
    );
  }

  if (error.hasError && error.isCritical) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={50} color={ERROR_COLOR} />
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => window.location.reload()} // Or implement a reload function
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categoryKeys = Object.keys(displayedGroupedHobbies);

  return (
    <View style={styles.flexContainer}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Explore Hobbies</Text>
      </View>

      {/* Show non-critical error banner */}
      {error.hasError && !error.isCritical && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error.message}</Text>
          <TouchableOpacity onPress={resetError}>
            <Ionicons name="close" size={20} color={ICON_COLOR_LIGHT} />
          </TouchableOpacity>
        </View>
      )}

      {/* Search Section */}
      <View style={styles.searchOuterContainer}>
        <View style={styles.searchInnerContainer}>
          <Ionicons
            name="search"
            size={20}
            color={TEXT_COLOR_SECONDARY}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchBar}
            placeholder="Search by name or category..."
            placeholderTextColor={TEXT_COLOR_SECONDARY}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              resetError();
            }}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearIcon}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={TEXT_COLOR_SECONDARY}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Hobbies List */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {categoryKeys.length > 0 ? (
          categoryKeys.map((category) => (
            <View key={category} style={styles.categoryCard}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {displayedGroupedHobbies[category].map((item, index, array) => (
                <View
                  key={item.id.toString()}
                  style={[
                    styles.hobbyItem,
                    index === array.length - 1 && styles.hobbyItemLast,
                  ]}
                >
                  <Text style={styles.hobbyText}>{item.name}</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddHobby(item.id, item.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={22} color={ICON_COLOR_LIGHT} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.noResultsContainer}>
            <Ionicons
              name="sad-outline"
              size={60}
              color={TEXT_COLOR_SECONDARY}
            />
            <Text style={styles.noResultsText}>
              No hobbies found matching "{searchQuery}"
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  // --- Header ---
  headerContainer: {
    backgroundColor: PRIMARY_COLOR,
    paddingTop: Platform.OS === "android" ? 25 : 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: ICON_COLOR_LIGHT,
  },
  // --- Error States ---
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: BACKGROUND_COLOR,
  },
  errorText: {
    fontSize: 18,
    color: ERROR_COLOR,
    textAlign: "center",
    marginVertical: 20,
  },
  errorBanner: {
    backgroundColor: ERROR_COLOR,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorBannerText: {
    color: ICON_COLOR_LIGHT,
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  retryButton: {
    backgroundColor: ERROR_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: ICON_COLOR_LIGHT,
  },
  retryButtonText: {
    color: ICON_COLOR_LIGHT,
    fontWeight: "bold",
  },
  // --- Search ---
  searchOuterContainer: {
    padding: 15,
    backgroundColor: BACKGROUND_COLOR,
  },
  searchInnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BACKGROUND_COLOR,
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: TEXT_COLOR_PRIMARY,
  },
  clearIcon: {
    marginLeft: 10,
    padding: 5,
  },
  // --- ScrollView ---
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  // --- Category ---
  categoryCard: {
    backgroundColor: CARD_BACKGROUND_COLOR,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_COLOR_LIGHT,
    paddingBottom: 8,
  },
  // --- Hobby Item ---
  hobbyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  hobbyItemLast: {
    borderBottomWidth: 0,
  },
  hobbyText: {
    fontSize: 16,
    color: TEXT_COLOR_PRIMARY,
    flex: 1,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  // --- Loading ---
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: TEXT_COLOR_SECONDARY,
  },
  // --- No Results ---
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: TEXT_COLOR_SECONDARY,
    textAlign: "center",
    marginTop: 10,
  },
});

export default ExploreHobbiesScreen;
