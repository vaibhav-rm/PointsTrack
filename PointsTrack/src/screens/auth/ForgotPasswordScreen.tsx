import { View, Text, Platform, Alert, TouchableOpacity } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AuthNavigationProp } from "../../navigation/types";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/config";
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your registered email address");
      return;
    }
    
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Email Sent",
        "If an account exists with this email, a password reset link has been sent.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error: any) {
      // It's a best practice not to reveal if an email exists or not when using the standard error messages.
      // But we will pass the Firebase error through if it's formatted incorrectly or the project lacks auth setup.
      Alert.alert("Request Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground h-full">
      {/* Header with back button */}
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? 'white' : 'black'} />
        </TouchableOpacity>
        <Text className="text-xl font-pbold text-textPrimary dark:text-white">
            Reset Password
        </Text>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="px-6 flex-1"
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10">
          <Ionicons name="lock-closed-outline" size={60} color={colorScheme === 'dark' ? '#818CF8' : '#4F46E5'} className="mb-4" />
          <Text className="text-3xl font-pbold text-primary dark:text-white text-center mt-4">
            Forgot Password?
          </Text>
          <Text className="text-textSecondary dark:text-gray-400 font-pregular text-center mt-3">
            Enter the email address you used to register, and we'll send you instructions to reset your password.
          </Text>
        </View>

        <Input
          label="Email Address"
          placeholder="Enter your registered email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View className="mt-6 mb-8">
          <Button title="Send Reset Link" onPress={handleResetPassword} isLoading={loading} />
        </View>

      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
