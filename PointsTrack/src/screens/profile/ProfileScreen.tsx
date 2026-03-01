import { View, Text, ScrollView, Alert, TouchableOpacity, Switch } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { auth, db } from '../../firebase/config';
import useUserData from '../../hooks/useUserData';
import Button from '../../components/Button';
import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';

const ProfileScreen = () => {
  const { userData, loading } = useUserData();

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              if (auth.currentUser) {
                await deleteDoc(doc(db, "users", auth.currentUser.uid));
                await deleteUser(auth.currentUser);
              }
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          }
        }
      ]
    );
  };

  const { colorScheme, toggleColorScheme } = useColorScheme();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background dark:bg-darkBackground">
        <Text className="text-primary dark:text-white">Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-darkBackground">
      <ScrollView className="px-6 py-4">
        <Text className="text-3xl font-pbold text-primary dark:text-white mb-8">Profile</Text>
        
        <View className="bg-white dark:bg-darkCard p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
          <View className="mb-4">
            <Text className="text-textSecondary dark:text-gray-400 text-sm font-pregular">Name</Text>
            <Text className="text-xl font-pmedium text-textPrimary dark:text-white">{userData?.name}</Text>
          </View>
          <View className="mb-4">
            <Text className="text-textSecondary dark:text-gray-400 text-sm font-pregular">Email</Text>
            <Text className="text-lg font-pregular text-textPrimary dark:text-white">{userData?.email}</Text>
          </View>
          <View className="mb-4">
            <Text className="text-textSecondary dark:text-gray-400 text-sm font-pregular">Phone</Text>
            <Text className="text-lg font-pregular text-textPrimary dark:text-white">{userData?.phone}</Text>
          </View>
          <View className="mb-4">
            <Text className="text-textSecondary dark:text-gray-400 text-sm font-pregular">USN</Text>
            <Text className="text-lg font-pregular text-textPrimary dark:text-white">{userData?.usn}</Text>
          </View>
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <Text className="text-textSecondary dark:text-gray-400 text-sm font-pregular">Year</Text>
              <Text className="text-lg font-pregular text-textPrimary dark:text-white">{userData?.year}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-textSecondary dark:text-gray-400 text-sm font-pregular">Semester</Text>
              <Text className="text-lg font-pregular text-textPrimary dark:text-white">{userData?.semester}</Text>
            </View>
          </View>
           <View>
            <Text className="text-textSecondary dark:text-gray-400 text-sm font-pregular">Entry Type</Text>
            <Text className="text-lg font-pregular text-textPrimary dark:text-white">{userData?.lateralEntry ? 'Lateral Entry (80 Pts)' : 'Regular Entry (100 Pts)'}</Text>
          </View>
        </View>

        {/* Dark Mode Toggle */}
        <View className="bg-white dark:bg-darkCard p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6 flex-row justify-between items-center">
          <View className="flex-row items-center gap-3">
             <View className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
              <Ionicons name={colorScheme === 'dark' ? "moon" : "sunny"} size={24} color={colorScheme === 'dark' ? "white" : "black"} />
             </View>
             <Text className="text-lg font-pmedium text-textPrimary dark:text-white">Dark Mode</Text>
          </View>
          <Switch value={colorScheme === 'dark'} onValueChange={toggleColorScheme} />
        </View>

        <Button title="Logout" onPress={handleLogout} variant="secondary" className="mb-4" />
        
        <TouchableOpacity onPress={handleDeleteAccount} className="w-full py-4 items-center mb-10">
          <Text className="text-danger font-pmedium">Delete Account</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
