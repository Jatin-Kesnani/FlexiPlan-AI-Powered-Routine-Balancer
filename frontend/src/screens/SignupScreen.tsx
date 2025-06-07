import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Dimensions,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { Icon } from "react-native-elements";
import { signup } from "../utils/api";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

// Color constants
const primaryColor = "#0096F6";
const topColor = "#9dbfb6";

const { width, height } = Dimensions.get("window");
const scale = width / 375;

const scaleSize = (size: number) => Math.round(size * scale);

const SignupScreen = ({ navigation }: any) => {
  const { width, height } = useWindowDimensions();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    fullName?: string;
    username?: string;
    email?: string;
    password?: string;
  }>({});
  const [genericError, setGenericError] = useState("");

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
    const re =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    return re.test(password);
  };

  const handleSignup = async () => {
    setErrors({});
    setGenericError("");

    // Split full name into first and last names
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    let formErrors: any = {};
    if (!fullName) formErrors.fullName = "Full name is required";
    if (!username) formErrors.username = "Username is required";
    if (!email) {
      formErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      formErrors.email = "Invalid email address";
    }
    if (!password) {
      formErrors.password = "Password is required";
    } else if (!validatePassword(password)) {
      formErrors.password =
        "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.";
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    try {
      const response = await signup(
        firstName,
        lastName,
        username,
        email,
        password
      );
      if (response) {
        Alert.alert("Success", "Your account has been created successfully!", [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login"),
          },
        ]);
      } else {
        Alert.alert("Error", "Failed to create account. Please try again.", [
          {
            text: "OK",
            onPress: () => {},
          },
        ]);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to connect to the server. Please check your internet connection and try again.",
        [
          {
            text: "OK",
            onPress: () => {},
          },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <StatusBar barStyle={"light-content"} />
        <Image
          style={{ position: "absolute", width, height }}
          source={require("../../assets/back1.jpg")}
          resizeMode="cover"
          blurRadius={3}
        />
        <View style={styles.backgroundOverlay}>
          <View style={styles.headerContainer}>
            <Animated.Image
              entering={FadeInUp.delay(200)
                .duration(1000)
                .springify()
                .damping(3)}
              style={styles.logo}
              source={require("../../assets/app-icon.png")}
              resizeMode="contain"
            />
            <Animated.Text
              entering={FadeInUp.duration(1000).springify()}
              style={styles.headerText}
            >
              Sign Up
            </Animated.Text>
          </View>

          <View style={styles.formWrapper}>
            <View style={styles.formContainer}>
              <Animated.View
                entering={FadeInDown.duration(1000).springify()}
                style={styles.inputContainer}
              >
                <View style={styles.iconWrapper}>
                  <Icon
                    name="user-circle"
                    type="font-awesome"
                    color="white"
                    size={24}
                  />
                </View>
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor="white"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  style={styles.inputField}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(200).duration(1000).springify()}
                style={styles.inputContainer}
              >
                <View style={styles.iconWrapper}>
                  <Icon
                    name="user"
                    type="font-awesome"
                    color="white"
                    size={24}
                  />
                </View>
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="white"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  style={styles.inputField}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(400).duration(1000).springify()}
                style={styles.inputContainer}
              >
                <View style={styles.iconWrapper}>
                  <Icon
                    name="envelope"
                    type="font-awesome"
                    color="white"
                    size={20}
                  />
                </View>
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="white"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.inputField}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(600).duration(1000).springify()}
                style={styles.inputContainer}
              >
                <View style={styles.iconWrapper}>
                  <Icon
                    name="lock"
                    type="font-awesome"
                    color="white"
                    size={26}
                  />
                </View>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="white"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  style={styles.inputField}
                />
              </Animated.View>

              {genericError ? (
                <Text style={styles.genericError}>{genericError}</Text>
              ) : null}

              <Animated.View
                entering={FadeInDown.delay(800).duration(1000).springify()}
              >
                <TouchableOpacity onPress={handleSignup} style={styles.button}>
                  <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(1000).duration(1000).springify()}
                style={styles.loginPrompt}
              >
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  backgroundOverlay: {
    flex: 1,
    width: "100%",
    minHeight: height,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 1,
  },
  headerContainer: {
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: height / 15,
  },
  logo: {
    width: width * 0.6,
    height: height * 0.15,
    alignSelf: "center",
    marginBottom: 30,
  },
  headerText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 1,
  },
  formWrapper: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: scaleSize(20),
    paddingBottom: 40,
  },
  formContainer: {
    alignItems: "center",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    width: 50,
    height: 50,
    marginLeft: -15,
  },
  inputField: {
    color: "white",
    fontSize: 18,
    flex: 1,
  },
  genericError: {
    color: "red",
    marginBottom: scaleSize(20),
    fontSize: scaleSize(15),
  },
  button: {
    backgroundColor: "rgba(197, 110, 50, 0.9)",
    padding: 15,
    paddingHorizontal: 60,
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  loginPrompt: {
    marginTop: 15,
    marginBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  loginText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginLink: {
    color: "rgb(255, 144, 70)",
    fontWeight: "bold",
    fontSize: scaleSize(16),
  },
});

export default SignupScreen;
