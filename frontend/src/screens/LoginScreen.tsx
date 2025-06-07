import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Input, Button, Icon } from "react-native-elements";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../components/AuthContext";
import { API_BASE_URL } from "../config";
import { login } from "../utils/api";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import { useWindowDimensions, Image, StatusBar } from "react-native";
import { TouchableOpacity } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
// import { Input, Button, Icon } from "react-native-elements";

const primaryColor = "#0096F6";
const topColor = "#9dbfb6";

const { width, height } = Dimensions.get("window");
const scale = width / 375;

const scaleSize = (size: number) => Math.round(size * scale);

const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const { setIsLoggedIn } = useAuth();

  const handleLogin = async () => {
    setErrors({});

    let formErrors = {};
    if (!username)
      formErrors = { ...formErrors, username: "Username is required" };
    if (!password)
      formErrors = { ...formErrors, password: "Password is required" };

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    try {
      const data = await login(username, password);
      setIsLoggedIn(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to connect to the server.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="position"
      style={{ backgroundColor: "white" }}
    >
      <ScrollView>
        <StatusBar barStyle={"light-content"} />
        <Image
          style={{ position: "absolute", width, height }}
          source={require("../../assets/back1.jpg")}
          resizeMode="cover"
          blurRadius={3}
        />
        <View
          style={{
            // position: "absolute",
            width,
            height,
            backgroundColor: "rgba(0,0,0,0.3)",
            zIndex: 1,
          }}
        >
          <View
            style={{
              justifyContent: "center",
              paddingHorizontal: 20,
              marginTop: height / 15,
            }}
          >
            <Animated.Image
              entering={FadeInUp.delay(200)
                .duration(1000)
                .springify()
                .damping(3)}
              style={{
                width: width * 0.6,
                height: height * 0.15,
                alignSelf: "center",
                marginBottom: 30,
              }}
              source={require("../../assets/app-icon.png")}
              resizeMode="contain"
            />
            <Animated.Text
              entering={FadeInUp.duration(1000).springify()}
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#fff",
                textAlign: "center",
                marginBottom: 20,
                letterSpacing: 1,
              }}
            >
              Login
            </Animated.Text>
          </View>

          <View style={styles.overlay}>
            <View style={styles.formContainer}>
              <Animated.View
                entering={FadeInDown.duration(1000).springify()}
                style={{
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
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "center",
                    width: 50,
                    height: 50,
                    marginLeft: -15,
                  }}
                >
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
                  style={{ color: "white", fontSize: 18, flex: 1 }}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.duration(1000).springify()}
                style={{
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
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "center",
                    width: 50,
                    height: 50,
                    marginLeft: -15,
                  }}
                >
                  <Icon
                    name="lock"
                    type="font-awesome"
                    color="white"
                    size={26}
                  />
                </View>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={"white"}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  style={{ color: "white", fontSize: 18, flex: 1 }}
                />
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(600).duration(1000).springify()}
              >
                <TouchableOpacity onPress={handleLogin} style={styles.button}>
                  <Text style={styles.buttonText}>Log In</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                entering={FadeInDown.delay(800).duration(1000).springify()}
                style={{
                  marginTop: 15,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 16, fontWeight: "bold" }}
                >
                  Don't have an account?{" "}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                  <Text
                    style={{
                      color: "rgb(255, 144, 70)",
                      fontWeight: "bold",
                      fontSize: scaleSize(16),
                    }}
                  >
                    Sign Up
                  </Text>
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
  container: {
    // flex: 1,
    backgroundColor: topColor,
  },
  topSection: {
    height: "30%",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: scaleSize(30),
    fontWeight: "bold",
    color: "white",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: scaleSize(20),
  },
  formContainer: {
    marginTop: scaleSize(40),
    alignItems: "center",
  },
  inputContainer: {
    width: "100%",
    marginBottom: scaleSize(15),
  },
  iconContainer: {
    marginRight: scaleSize(10),
  },
  loginButton: {
    backgroundColor: topColor,
    borderRadius: scaleSize(5),
    width: scaleSize(300),
  },
  signupContainer: {
    flexDirection: "row",
    marginTop: scaleSize(15),
    alignItems: "center",
  },
  signupLink: {
    color: topColor,
    fontWeight: "bold",
    fontSize: scaleSize(16),
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
});

export default LoginScreen;
