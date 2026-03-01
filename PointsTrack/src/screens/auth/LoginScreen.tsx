import { View, Text, Image, Platform, Alert } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AuthNavigationProp } from "../../navigation/types";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/config";

const LoginScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation is handled by RootNavigator auth listener
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground h-full">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="px-6 flex-1"
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10">
            <Text className="text-3xl font-pbold text-primary dark:text-white text-center">
              Welcome Back
            </Text>
            <Text className="text-textSecondary dark:text-gray-400 font-pregular text-center mt-2">
              Sign in to continue tracking your points
            </Text>
          </View>

          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View className="flex-row justify-end mt-2">
            <Text
              className="text-primary dark:text-indigo-400 font-pmedium text-sm"
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              Forgot Password?
            </Text>
          </View>

          <View className="mt-6">
            <Button title="Login" onPress={handleLogin} isLoading={loading} />
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-textSecondary dark:text-gray-400 font-pregular">
              Don't have an account?{" "}
            </Text>
            <Text
              className="text-secondary font-psemibold"
              onPress={() => navigation.navigate("Register")}
            >
              Sign Up
            </Text>
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;
