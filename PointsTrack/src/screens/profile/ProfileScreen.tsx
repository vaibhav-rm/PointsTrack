import { View, Text, ScrollView, Alert, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useAuth } from '../../contexts/AuthContext';
import useUserData from '../../hooks/useUserData';
import Button from '../../components/Button';
import { api } from '../../lib/api';
import { generateTranscript } from '../../lib/transcript';
import QRCode from 'react-native-qrcode-svg';

const ProfileScreen = () => {
  const { userData, loading } = useUserData();
  const { logout, deleteAccount } = useAuth();
  const [exporting, setExporting] = useState(false);

  const handleDownloadTranscript = async () => {
    if (!userData) return;
    setExporting(true);
    try {
      const rows = await api.get<any[]>('/points');
      await generateTranscript(userData as any, rows);
    } catch (error: any) {
      console.error('Transcript error', error);
      Alert.alert('Error', error?.message || 'Could not generate the transcript. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
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
              await deleteAccount();
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

        {/* Check-in QR */}
        {userData?.id && (
          <View className="bg-white dark:bg-darkCard p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6 items-center">
            <Text className="text-lg font-pmedium text-textPrimary dark:text-white mb-1">My Check-in QR</Text>
            <Text className="text-xs font-pregular text-textSecondary dark:text-gray-400 mb-4 text-center">
              Show this to an organizer to get checked in at events.
            </Text>
            <View className="bg-white p-4 rounded-2xl">
              <QRCode value={`ptrack:stu:${userData.id}`} size={180} backgroundColor="white" color="#0F172A" />
            </View>
          </View>
        )}

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

        {/* Download Transcript */}
        <TouchableOpacity
          onPress={handleDownloadTranscript}
          disabled={exporting}
          className="bg-white dark:bg-darkCard p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6 flex-row justify-between items-center"
        >
          <View className="flex-row items-center gap-3">
            <View className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
              <Ionicons name="document-text-outline" size={24} color={colorScheme === 'dark' ? '#818CF8' : '#4F46E5'} />
            </View>
            <View>
              <Text className="text-lg font-pmedium text-textPrimary dark:text-white">Download Transcript</Text>
              <Text className="text-xs font-pregular text-textSecondary dark:text-gray-400">PDF of your AICTE points</Text>
            </View>
          </View>
          {exporting ? (
            <ActivityIndicator color={colorScheme === 'dark' ? '#818CF8' : '#4F46E5'} />
          ) : (
            <Ionicons name="download-outline" size={22} color={colorScheme === 'dark' ? 'white' : 'black'} />
          )}
        </TouchableOpacity>

        <Button title="Logout" onPress={handleLogout} variant="secondary" className="mb-4" />
        
        <TouchableOpacity onPress={handleDeleteAccount} className="w-full py-4 items-center mb-10">
          <Text className="text-danger font-pmedium">Delete Account</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
