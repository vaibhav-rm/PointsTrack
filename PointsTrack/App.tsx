import "./src/styles/global.css";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
