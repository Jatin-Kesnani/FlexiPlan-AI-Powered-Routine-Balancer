import React, { useRef } from "react";
import { StyleSheet, Text, Animated, Touchable, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons"; // ✅ Use @expo/vector-icons for Expo
import MyPressable from "../../../components/MyPressable";
// import { Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native"; // Import navigation hook
import { RootStackParamList } from '../../../../App';
import { StackNavigationProp } from "@react-navigation/stack";

interface Props {
  onBtnPress: () => void;
  animationController: React.MutableRefObject<Animated.Value>;
}

/*
 * TODO:- Find a better solution for this animation so we don't have to use 'useNativeDriver: false'
*/
const NextButtonArrow: React.FC<Props> = ({ onBtnPress, animationController }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  // const navigation = useNavigation(); // Get navigation instance
  const arrowAnim = useRef<Animated.AnimatedInterpolation<number>>(
    new Animated.Value(0)
  );

  arrowAnim.current = animationController.current.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8],
    outputRange: [0, 0, 0, 0, 1],
  });

  // Transition animations
  const transitionAnim = arrowAnim.current.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [36, 0, 0],
  });
  const opacityAnim = arrowAnim.current.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0, 1],
  });
  const iconTransitionAnim = arrowAnim.current.interpolate({
    inputRange: [0, 0.35, 0.85, 1],
    outputRange: [0, 0, -36, -36],
  });
  const iconOpacityAnim = arrowAnim.current.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0, 0],
  });

  // Size animations
  const widthAnim = arrowAnim.current.interpolate({
    inputRange: [0, 1],
    outputRange: [58, 258],
  });

  const marginBottomAnim = arrowAnim.current.interpolate({
    inputRange: [0, 1],
    outputRange: [38, 0],
  });

  const radiusAnim = arrowAnim.current.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 8],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: widthAnim,
          borderRadius: radiusAnim,
          marginBottom: marginBottomAnim,
        },
      ]}
    >
      <MyPressable
        style={{ flex: 1, justifyContent: "center" }}
        android_ripple={{ color: "darkgrey" }}
        onPress={onBtnPress}
      >
        {/* Sign Up Animation */}
        <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
          <Animated.View
            style={[
              styles.signupContainer,
              {
                opacity: opacityAnim,
                transform: [{ translateY: transitionAnim }],
              },
            ]}
          >
            <Text style={styles.signupText}>Sign Up</Text>
            <MaterialIcons name="arrow-forward" size={24} color="white" />
          </Animated.View>
        </TouchableOpacity>

        {/* Animated Icon - Wrapped in Animated.View */}
        <Animated.View
          style={[
            styles.icon,
            {
              opacity: iconOpacityAnim,
              transform: [{ translateY: iconTransitionAnim }],
            },
          ]}
        >
          <MaterialIcons name="arrow-forward-ios" size={24} color="white" />
        </Animated.View>
      </MyPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 58,
    backgroundColor: "rgba(197, 110, 50, 1)",
    overflow: "hidden",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  signupText: {
    fontSize: 18,
    fontFamily: "WorkSans-Medium",
    color: "white",
  },
  icon: {
    position: "absolute",
    alignSelf: "center",
  },
});

export default NextButtonArrow;
