import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteUserTask, fetchUserTasks, updateUserTask } from "../utils/api";
import { Task, TaskFormData } from "../utils/model";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../App"; // Ensure this path is correct

// --- Define Color Palette ---
const PRIMARY_COLOR = "rgba(197, 110, 50, 0.9)"; // Your app color
const SECONDARY_COLOR = "#FFFFFF"; // White
const TEXT_COLOR_PRIMARY = "#333333"; // Dark Gray
const TEXT_COLOR_SECONDARY = "#666666"; // Medium Gray
const TEXT_COLOR_LIGHT = "#888888"; // Light Gray
const BORDER_COLOR = "#EEEEEE";
const SHADOW_COLOR = "#000000";
const ERROR_COLOR = "#FF6B6B"; // Red for delete/errors
const SELECTED_DAY_COLOR = "rgba(197, 110, 50, 0.2)"; 

// --- Task Priority Colors ---
const PRIORITY_HIGH_COLOR = "#FF6B6B"; // Red
const PRIORITY_MEDIUM_COLOR = "#FFA500"; // Orange
const PRIORITY_LOW_COLOR = "#4CAF50"; // Green

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// --- Component ---
const UserTasksScreen = () => {
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [editedTask, setEditedTask] = useState<TaskFormData>({
    task_name: "",
    description: "",
    time_required: "",
    days_associated: [],
    priority: "Low",
    is_fixed_time: false,
    fixed_time_slot: "",
  });

  const handleEditPress = (task: Task) => {
    setCurrentTask(task);
    setEditedTask({
      task_name: task.task_name,
      description: task.description || "",
      time_required: task.time_required || "",
      days_associated: task.days_associated || [],
      priority: task.priority || "Low",
      is_fixed_time: task.is_fixed_time || false,
      fixed_time_slot: task.fixed_time_slot || "",
    });
    setIsEditModalVisible(true);
  };

  const toggleDaySelection = (day: string) => {
    setEditedTask(prev => {
      const newDays = [...prev.days_associated];
      const dayIndex = newDays.indexOf(day);
      
      if (dayIndex > -1) {
        // Remove the day if already selected
        newDays.splice(dayIndex, 1);
      } else {
        // Add the day if not selected
        newDays.push(day);
      }
      
      return {
        ...prev,
        days_associated: newDays
      };
    });
  };

  const renderDayPills = () => {
    return (
      <View style={styles.daysContainer}>
        {DAYS_OF_WEEK.map(day => {
          const isSelected = editedTask.days_associated.includes(day);
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayPill,
                isSelected && styles.selectedDayPill,
                isSelected && { borderColor: PRIMARY_COLOR }
              ]}
              onPress={() => toggleDaySelection(day)}
            >
              <Text 
                style={[
                  styles.dayPillText,
                  isSelected && { color: PRIMARY_COLOR, fontWeight: 'bold' }
                ]}
              >
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const handleUpdateTask = async () => {
    if (!userId || !currentTask) return;
    console.log(userId);
    console.log(currentTask.id);
    console.log(editedTask);
    try {
      const updatedTask = await updateUserTask(
        userId,
        currentTask.id,
        editedTask
      );

      setUserTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === currentTask.id ? { ...task, ...updatedTask } : task
        )
      );

      setIsEditModalVisible(false);
      // Optional: Show success message
      Alert.alert("Success", "Task updated successfully!");
    } catch (error) {
      console.error("Failed to update task:", error);
      Alert.alert("Error", "Failed to update task. Please try again.");
    }
  };

  const renderPriorityOptions = () => {
    const priorities = ["Low", "Medium", "High"];
    return (
      <View style={styles.priorityOptionsContainer}>
        {priorities.map((priority) => (
          <TouchableOpacity
            key={priority}
            style={[
              styles.priorityOption,
              editedTask.priority === priority && styles.selectedPriorityOption,
              {
                backgroundColor:
                  priority === "High"
                    ? PRIORITY_HIGH_COLOR
                    : priority === "Medium"
                    ? PRIORITY_MEDIUM_COLOR
                    : PRIORITY_LOW_COLOR,
              },
            ]}
            onPress={() => setEditedTask({ ...editedTask, priority })}
          >
            <Text style={styles.priorityOptionText}>{priority}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  useEffect(() => {
    const loadUserTasks = async () => {
      setLoading(true); // Ensure loading is true at the start
      try {
        const storedUserId = await AsyncStorage.getItem("user_id");
        const storedUsername = await AsyncStorage.getItem("user_username");

        if (!storedUserId || !storedUsername) {
          Alert.alert(
            "Login Required",
            "User information not found. Please log in to view your tasks."
          );
          // Optional: Navigate to login screen if applicable
          // navigation.navigate('Login');
          setLoading(false);
          return;
        }

        const parsedUserId = parseInt(storedUserId, 10);
        setUserId(parsedUserId);
        setUsername(storedUsername);

        const tasksData = await fetchUserTasks(parsedUserId);
        setUserTasks(tasksData);
      } catch (error) {
        console.error("Failed to load user tasks:", error);
        Alert.alert(
          "Loading Error",
          "Could not load your tasks. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    // Use focus listener to refresh tasks when navigating back
    const unsubscribe = navigation.addListener("focus", loadUserTasks);

    // Initial load
    loadUserTasks();

    // Cleanup listener on unmount
    return unsubscribe;
  }, [navigation]); // Add navigation as a dependency

  const handleDeleteTask = async (taskId: number) => {
    if (!userId) {
      Alert.alert("Error", "User ID not found. Cannot delete task.");
      return;
    }

    // Confirmation Dialog
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to remove this task?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteUserTask(userId, taskId);
              setUserTasks((prevTasks) =>
                prevTasks.filter((task) => task.id !== taskId)
              );
              // Removed success alert for cleaner UX, maybe use a toast later
              // Alert.alert("Success", "Task removed successfully!");
            } catch (error: any) {
              console.error("Failed to delete user task:", error);
              Alert.alert(
                "Deletion Failed",
                "Failed to remove task: " + (error.message || "Unknown error")
              );
            }
          },
          style: "destructive", // iOS style for delete action
        },
      ]
    );
  };

  // --- Render Priority Badge ---
  const renderPriorityBadge = (priority: string) => {
    let backgroundColor = PRIORITY_LOW_COLOR;
    if (priority?.toLowerCase() === "high") {
      backgroundColor = PRIORITY_HIGH_COLOR;
    } else if (priority?.toLowerCase() === "medium") {
      backgroundColor = PRIORITY_MEDIUM_COLOR;
    }

    return (
      <View style={[styles.priorityBadge, { backgroundColor }]}>
        <Text style={styles.priorityText}>{priority || "Low"}</Text>
      </View>
    );
  };

  // --- Render Task Item Card ---
  const renderItem = ({ item }: { item: Task }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.taskName}>{item.task_name}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditPress(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="pencil-outline" size={22} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteTask(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase tap area
          >
            <Ionicons name="trash-bin-outline" size={22} color={ERROR_COLOR} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        <View style={styles.detailRow}>
          <Ionicons
            name="flag-outline"
            size={16}
            color={TEXT_COLOR_SECONDARY}
            style={styles.detailIcon}
          />
          <Text style={styles.detailLabel}>Priority:</Text>
          {renderPriorityBadge(item.priority)}
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="time-outline"
            size={16}
            color={TEXT_COLOR_SECONDARY}
            style={styles.detailIcon}
          />
          <Text style={styles.detailLabel}>Time Required:</Text>
          <Text style={styles.detailValue}>
            {item.time_required
              ? `${item.time_required} mins`
              : "Not specified"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={TEXT_COLOR_SECONDARY}
            style={styles.detailIcon}
          />
          <Text style={styles.detailLabel}>Days:</Text>
          <Text style={styles.detailValue}>
            {item.days_associated?.length > 0
              ? item.days_associated.join(", ")
              : "No days assigned"}
          </Text>
        </View>

        {item.is_fixed_time && (
          <View style={styles.detailRow}>
            <Ionicons
              name="alarm-outline"
              size={16}
              color={TEXT_COLOR_SECONDARY}
              style={styles.detailIcon}
            />
            <Text style={styles.detailLabel}>Fixed Time:</Text>
            <Text style={[styles.detailValue, styles.fixedTimeValue]}>
              {item.fixed_time_slot ? item.fixed_time_slot : "Not set"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.createdAt}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  // --- Loading State ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading your tasks...</Text>
      </View>
    );
  }

  // --- Main Return ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* --- Header --- */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Tasks</Text>
        </View>

        {/* --- Task List or Empty State --- */}
        {userTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="file-tray-outline"
              size={60}
              color={TEXT_COLOR_LIGHT}
            />
            <Text style={styles.emptyText}>No tasks found.</Text>
            <Text style={styles.emptySubText}>
              Tap the '+' button to add your first task!
            </Text>
          </View>
        ) : (
          <FlatList
            data={userTasks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false} // Hide scrollbar for cleaner look
          />
        )}

        {/* --- Floating Action Button (FAB) --- */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddUserTask")} // Navigate to AddTaskScreen
        >
          <Ionicons name="add" size={32} color={SECONDARY_COLOR} />
        </TouchableOpacity>
        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Task</Text>

                <Text style={styles.inputLabel}>Task Name</Text>
                <TextInput
                  style={styles.input}
                  value={editedTask.task_name}
                  onChangeText={(text) =>
                    setEditedTask({ ...editedTask, task_name: text })
                  }
                  placeholder="Enter task name"
                />

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={editedTask.description || ""}
                  onChangeText={(text) =>
                    setEditedTask({ ...editedTask, description: text })
                  }
                  placeholder="Enter description"
                  multiline
                />

                <Text style={styles.inputLabel}>Time Required (minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={editedTask.time_required || ""}
                  onChangeText={(text) =>
                    setEditedTask({ ...editedTask, time_required: text })
                  }
                  placeholder="e.g. 30"
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Days</Text>
                {renderDayPills()}
                <Text style={styles.daysNote}>
                  Selected days: {editedTask.days_associated.length > 0 
                    ? editedTask.days_associated.join(", ") 
                    : "None"}
                </Text>

                <Text style={styles.inputLabel}>Priority</Text>
                {renderPriorityOptions()}

                <Text style={styles.inputLabel}>Fixed Time Task</Text>
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>
                    {editedTask.is_fixed_time ? "Yes" : "No"}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.switchButton,
                      editedTask.is_fixed_time && styles.switchButtonActive,
                    ]}
                    onPress={() =>
                      setEditedTask({
                        ...editedTask,
                        is_fixed_time: !editedTask.is_fixed_time,
                      })
                    }
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        editedTask.is_fixed_time && styles.switchThumbActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>

                {editedTask.is_fixed_time && (
                  <>
                    <Text style={styles.inputLabel}>Fixed Time Slot</Text>
                    <TextInput
                      style={styles.input}
                      value={editedTask.fixed_time_slot || ""}
                      onChangeText={(text) =>
                        setEditedTask({ ...editedTask, fixed_time_slot: text })
                      }
                      placeholder="e.g. 14:00"
                    />
                  </>
                )}

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setIsEditModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleUpdateTask}
                  >
                    <Text style={styles.modalButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR, // Match header background for notch area
  },
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7", // Light background for contrast with cards
  },
  header: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center", // Center title horizontally
    borderBottomLeftRadius: 15, // Subtle curve
    borderBottomRightRadius: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: SECONDARY_COLOR,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: TEXT_COLOR_SECONDARY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    marginTop: -50, // Adjust to roughly center vertically
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_COLOR_SECONDARY,
    marginTop: 15,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: TEXT_COLOR_LIGHT,
    marginTop: 5,
    textAlign: "center",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 20, // Add space between header and first card
    paddingBottom: 80, // Ensure space for FAB
  },
  // --- Card Styling ---
  card: {
    backgroundColor: SECONDARY_COLOR,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    // Shadow for depth (iOS)
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow for depth (Android)
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Align items to the top
    marginBottom: 10,
  },
  taskName: {
    fontSize: 18,
    fontWeight: "600", // Semi-bold
    color: TEXT_COLOR_PRIMARY,
    flex: 1, // Allow text to wrap
    marginRight: 10, // Space before delete button
  },
  deleteButton: {
    padding: 5, // Add padding to make it easier to tap
    marginLeft: 5,
  },
  cardBody: {
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: TEXT_COLOR_SECONDARY,
    marginBottom: 12,
    lineHeight: 20, // Improve readability
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: TEXT_COLOR_SECONDARY,
    fontWeight: "500",
    marginRight: 5,
  },
  detailValue: {
    fontSize: 14,
    color: TEXT_COLOR_PRIMARY,
    flexShrink: 1, // Allow text to wrap if needed
  },
  fixedTimeValue: {
    fontWeight: "600",
    color: PRIMARY_COLOR, // Use primary color to highlight fixed time
  },
  priorityBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginLeft: 5, // Space from label
    alignSelf: "flex-start", // Prevent stretching
  },
  priorityText: {
    color: SECONDARY_COLOR,
    fontSize: 12,
    fontWeight: "bold",
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
    marginTop: 5,
  },
  createdAt: {
    fontSize: 12,
    color: TEXT_COLOR_LIGHT,
  },
  // --- FAB Styling ---
  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: PRIMARY_COLOR,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    // Shadow (iOS)
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    // Shadow (Android)
    elevation: 6,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    padding: 5,
    marginRight: 5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: SECONDARY_COLOR,
    borderRadius: 12,
    padding: 20,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: PRIMARY_COLOR,
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_COLOR_PRIMARY,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: TEXT_COLOR_PRIMARY,
    backgroundColor: SECONDARY_COLOR,
    marginBottom: 10,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  priorityOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  priorityOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    width: "30%",
    alignItems: "center",
    opacity: 0.7,
  },
  selectedPriorityOption: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  priorityOptionText: {
    color: SECONDARY_COLOR,
    fontWeight: "bold",
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: TEXT_COLOR_PRIMARY,
    marginRight: 10,
  },
  switchButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  switchButtonActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: SECONDARY_COLOR,
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  saveButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  modalButtonText: {
    color: SECONDARY_COLOR,
    fontWeight: "bold",
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dayPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 8,
    width: '30%',
    alignItems: 'center',
  },
  selectedDayPill: {
    backgroundColor: SELECTED_DAY_COLOR,
  },
  dayPillText: {
    color: TEXT_COLOR_PRIMARY,
    fontSize: 14,
  },
  daysNote: {
    fontSize: 14,
    color: TEXT_COLOR_SECONDARY,
    fontStyle: 'italic',
    marginTop: -5,
    marginBottom: 15,
  },
});

export default UserTasksScreen;
