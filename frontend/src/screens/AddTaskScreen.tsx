import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  Switch,
  KeyboardAvoidingView,
} from "react-native";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigation } from "@react-navigation/native";
// Import the correct navigation prop type based on your navigator
// If using native stack:
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
// If using standard stack:
// import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addUserTask } from "../utils/api"; // Keep your API import
import RNPickerSelect from "react-native-picker-select";
import DateTimePickerModal from "react-native-modal-datetime-picker";

// --- Define Navigation Param List ---
// Adjust this type to match your actual navigator routes
type RootStackParamList = {
  AddTask: undefined; // Current screen might not need params
  Login: undefined; // Login screen
  // Add other routes here...
};

// --- Define Navigation Prop Type ---
// Use NativeStackNavigationProp or StackNavigationProp based on your navigator
type AddTaskScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddTask' // The name of this screen in the navigator
>;
// --- End Navigation Typing ---


interface TaskFormData {
  task_name: string;
  description: string;
  time_required: string; // Keep as HH:MM:SS string
  days_associated: string[]; // Keep as array of strings
  priority: string; // Low, Medium, High
  is_fixed_time: boolean;
  fixed_time_slot: string | null; // Keep as HH:MM:SS string or null
}

// --- Constants ---
const PRIMARY_COLOR = "rgba(197, 110, 50, 0.9)";
const SECONDARY_COLOR = "#FFFFFF";
const LIGHT_PRIMARY_COLOR = "rgba(197, 110, 50, 0.1)";
const BACKGROUND_COLOR = "#f7f7f7";
const INPUT_BORDER_COLOR = "#ddd";
const TEXT_COLOR_PRIMARY = "#333";
const TEXT_COLOR_SECONDARY = "#555";
const PLACEHOLDER_COLOR = "#999";
const ERROR_COLOR = "red";

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const priorityOptions = [
  { label: "High", value: "High" },
  { label: "Medium", value: "Medium" },
  { label: "Low", value: "Low" },
];
// --- End Constants ---

const AddTaskScreen = () => {
  const { control, handleSubmit, setValue, watch } = useForm<TaskFormData>({
    defaultValues: {
      task_name: "",
      description: "",
      time_required: "00:30:00",
      days_associated: [],
      priority: "Medium",
      is_fixed_time: false,
      fixed_time_slot: "08:00:00",
    },
  });
  // --- Correctly type useNavigation ---
  const navigation = useNavigation<AddTaskScreenNavigationProp>();
  const isFixedTimeValue = useWatch({ control, name: "is_fixed_time" });

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isDurationPickerVisible, setDurationPickerVisibility] = useState(false);
  const [isFixedTimePickerVisible, setFixedTimePickerVisibility] = useState(false);

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = "00"; // Force seconds to 00
    return `${hours}:${minutes}:${seconds}`;
  };

  const showDurationPicker = () => setDurationPickerVisibility(true);
  const hideDurationPicker = () => setDurationPickerVisibility(false);
  const handleConfirmDuration = (date: Date) => {
    const customDate = new Date(date);
    customDate.setSeconds(0);
    setValue("time_required", formatTime(customDate));
    hideDurationPicker();
  };

  const showFixedTimePicker = () => setFixedTimePickerVisibility(true);
  const hideFixedTimePicker = () => setFixedTimePickerVisibility(false);
  const handleConfirmFixedTime = (date: Date) => {
    const customDate = new Date(date);
    customDate.setSeconds(0);
    setValue("fixed_time_slot", formatTime(customDate));
    hideFixedTimePicker();
  };

  const onSubmit = async (data: TaskFormData) => {
    const timeRegex = /^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$/;
    const finalTimeRequired = data.time_required && timeRegex.test(data.time_required)
      ? data.time_required
      : "00:00:00";

    let finalFixedTimeSlot: string | null = null; // Explicitly type as string | null
    if (data.is_fixed_time) {
      if (data.fixed_time_slot && timeRegex.test(data.fixed_time_slot)) {
        finalFixedTimeSlot = data.fixed_time_slot;
      } else {
         Alert.alert(
          "Invalid Format",
          "Please select a valid fixed time slot (e.g., 09:00:00)."
         );
         return;
      }
    }

    if (selectedDays.length === 0) {
      Alert.alert(
        "Missing Information",
        "Please select at least one day."
      );
      return;
    }

     const requestBody = {
      task_name: data.task_name.trim(),
      description: data.description ? data.description.trim() : null,
      time_required: finalTimeRequired,
      days_associated: selectedDays,
      priority: data.priority,
      is_fixed_time: data.is_fixed_time,
      fixed_time_slot: finalFixedTimeSlot,
    };

    console.log("Submitting data:", requestBody);

    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        Alert.alert("Error", "User ID not found. Please log in again.");
        // --- Navigation call is now correctly typed ---
        navigation.navigate("Login");
        return;
      }
      const parsedUserId = parseInt(userId, 10);
       if (isNaN(parsedUserId)) {
           Alert.alert("Error", "Invalid User ID stored. Please log in again.");
           // --- Navigation call is now correctly typed ---
           navigation.navigate("Login");
           return;
       }

      // Assuming addUserTask returns a meaningful value on success
      const responseData = await addUserTask(parsedUserId, requestBody);

      if (responseData) {
        Alert.alert("Success", "Task added successfully!");
        if (navigation.canGoBack()) {
             navigation.goBack();
        }
      } else {
          Alert.alert("Error", "Failed to add task. Server responded without success.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to add task due to an unexpected error.";
      Alert.alert("Error", errorMessage);
      console.error("Error adding task:", error.response?.data || error);
    }
  };

  const toggleDaySelection = (day: string) => {
    const newSelectedDays = selectedDays.includes(day)
      ? selectedDays.filter((selectedDay) => selectedDay !== day)
      : [...selectedDays, day];
    setSelectedDays(newSelectedDays);
  };

  const timeRequiredValue = watch("time_required");
  const fixedTimeSlotValue = watch("fixed_time_slot");

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>Add New Task</Text>
        </View>

        {/* Task Name Input */}
        <View style={styles.sectionContainer}>
          <Controller
            control={control}
            name="task_name"
            rules={{
              required: "Task name is required",
              minLength: { value: 3, message: "Task name is too short" },
              maxLength: { value: 100, message: "Task name is too long" },
            }}
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <>
                <Text style={styles.label}>
                  Task Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, error ? styles.inputError : null]}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  placeholder="e.g., Morning Workout"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                />
                {error && <Text style={styles.errorText}>{error.message}</Text>}
              </>
            )}
          />
        </View>

        {/* Description Input */}
        <View style={styles.sectionContainer}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value ?? ''} // Use nullish coalescing
                  placeholder="Any details about the task..."
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  multiline
                  numberOfLines={3}
                />
              </>
            )}
          />
        </View>

        {/* Time Required (Duration) Picker */}
        <View style={styles.sectionContainer}>
          <Text style={styles.label}>Estimated Duration</Text>
          <TouchableOpacity
            onPress={showDurationPicker}
            style={styles.pickerButton}
          >
            <Text style={styles.pickerButtonText}>
              {timeRequiredValue ? timeRequiredValue.substring(0, 5) : "Select Duration"}
            </Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isDurationPickerVisible}
            mode="time"
            onConfirm={handleConfirmDuration}
            onCancel={hideDurationPicker}
            locale="en_GB"
            is24Hour={true}
            date={(() => {
              const d = new Date();
              try {
                if (timeRequiredValue) {
                   const [h, m] = timeRequiredValue.split(':').map(Number);
                   d.setHours(h, m, 0);
                } else {
                    d.setHours(0, 30, 0);
                }
              } catch {
                   d.setHours(0, 30, 0);
              }
              return d;
            })()}
            // --- REMOVED headerTextIOS prop ---
            minuteInterval={5}
          />
        </View>

        {/* Days Associated */}
        <View style={styles.sectionContainer}>
          <Text style={styles.label}>
            Days Associated <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.daysContainer}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day) && styles.dayButtonSelected,
                ]}
                onPress={() => toggleDaySelection(day)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDays.includes(day) && styles.dayButtonTextSelected,
                  ]}
                >
                  {day.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Priority Dropdown */}
        <View style={styles.sectionContainer}>
          <Controller
            control={control}
            name="priority"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Priority</Text>
                <RNPickerSelect
                  onValueChange={(val) => onChange(val ?? 'Medium')} // Handle null case
                  items={priorityOptions}
                  value={value}
                  style={pickerSelectStyles}
                  placeholder={{ label: "Select priority...", value: "Medium" }}
                  useNativeAndroidPickerStyle={false}
                />
              </>
            )}
          />
        </View>

        {/* Fixed Time Toggle (Switch) */}
        <View style={[styles.sectionContainer, styles.switchContainer]}>
          <Text style={styles.label}>Is Task at a Fixed Time?</Text>
          <Controller
            control={control}
            name="is_fixed_time"
            render={({ field: { onChange, value } }) => (
              <Switch
                trackColor={{ false: "#767577", true: LIGHT_PRIMARY_COLOR }}
                thumbColor={value ? PRIMARY_COLOR : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={(newValue) => {
                  onChange(newValue);
                  if (!newValue) {
                    setValue("fixed_time_slot", null);
                  } else if (!fixedTimeSlotValue) {
                       setValue("fixed_time_slot", "08:00:00");
                  }
                }}
                value={value}
              />
            )}
          />
        </View>

        {/* Fixed Time Slot Picker (Conditional) */}
        {isFixedTimeValue && (
          <View style={styles.sectionContainer}>
            <Text style={styles.label}>Fixed Time Slot <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              onPress={showFixedTimePicker}
              style={styles.pickerButton}
            >
              <Text style={styles.pickerButtonText}>
                {fixedTimeSlotValue ? fixedTimeSlotValue.substring(0, 5) : "Select Time"}
              </Text>
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={isFixedTimePickerVisible}
              mode="time"
              onConfirm={handleConfirmFixedTime}
              onCancel={hideFixedTimePicker}
              locale="en_GB"
              is24Hour={true}
              date={(() => {
                const d = new Date();
                try {
                  if (fixedTimeSlotValue) {
                     const [h, m] = fixedTimeSlotValue.split(':').map(Number);
                     d.setHours(h, m, 0);
                  } else {
                      d.setHours(8, 0, 0);
                  }
                } catch {
                   d.setHours(8, 0, 0);
                }
                return d;
              })()}
              // --- REMOVED headerTextIOS prop ---
              minuteInterval={5}
            />
              {!fixedTimeSlotValue && (
                  <Text style={[styles.errorText, { marginTop: 5 }]}>
                      Please select a time slot.
                  </Text>
              )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit(onSubmit)}
        >
          <Text style={styles.submitText}>Add Task</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// --- Styles (Keep existing styles) ---
const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    headerContainer: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginHorizontal: -20,
        marginTop: -20,
        alignItems: "center",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        marginBottom: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: "bold",
        color: SECONDARY_COLOR,
        textAlign: "center",
    },
    sectionContainer: {
        marginBottom: 20,
        backgroundColor: SECONDARY_COLOR,
        padding: 15,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: TEXT_COLOR_SECONDARY,
        marginBottom: 10,
    },
    required: {
        color: PRIMARY_COLOR,
        fontWeight: "bold",
    },
    input: {
        backgroundColor: SECONDARY_COLOR,
        paddingVertical: Platform.OS === "ios" ? 15 : 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: INPUT_BORDER_COLOR,
        fontSize: 16,
        color: TEXT_COLOR_PRIMARY,
    },
    inputError: {
        borderColor: ERROR_COLOR,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    errorText: {
        color: ERROR_COLOR,
        fontSize: 13,
        marginTop: 5,
    },
    switchContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
    },
    submitButton: {
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
        shadowColor: PRIMARY_COLOR,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6,
    },
    submitText: {
        color: SECONDARY_COLOR,
        fontSize: 18,
        fontWeight: "bold",
    },
    daysContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        gap: 8, // Use gap if RN version supports it
        marginTop: 5,
    },
    dayButton: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: "#f0f0f0",
        borderWidth: 1,
        borderColor: "#e0e0e0",
        // If 'gap' isn't working, uncomment below and remove 'gap' from daysContainer
        // marginRight: 8,
        // marginBottom: 8,
    },
    dayButtonSelected: {
        backgroundColor: PRIMARY_COLOR,
        borderColor: PRIMARY_COLOR,
    },
    dayButtonText: {
        fontSize: 14,
        color: TEXT_COLOR_SECONDARY,
        fontWeight: "500",
        textAlign: "center",
    },
    dayButtonTextSelected: {
        color: SECONDARY_COLOR,
        fontWeight: "bold",
    },
    pickerButton: {
        backgroundColor: SECONDARY_COLOR,
        paddingVertical: Platform.OS === "ios" ? 15 : 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: INPUT_BORDER_COLOR,
        justifyContent: "center",
    },
    pickerButtonText: {
        fontSize: 16,
        color: TEXT_COLOR_PRIMARY,
    },
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: INPUT_BORDER_COLOR,
        borderRadius: 8,
        color: TEXT_COLOR_PRIMARY,
        backgroundColor: SECONDARY_COLOR,
        paddingRight: 30,
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: INPUT_BORDER_COLOR,
        borderRadius: 8,
        color: TEXT_COLOR_PRIMARY,
        backgroundColor: SECONDARY_COLOR,
        paddingRight: 30,
    },
    placeholder: {
        color: PLACEHOLDER_COLOR,
    },
    iconContainer: {
        top: Platform.OS === "ios" ? 12 : 15,
        right: 15,
    },
});

export default AddTaskScreen;